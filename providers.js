const PROVIDER = {
	EXMO: 'EXMO',
	WIREX: 'WIREX',
	BINANCE: 'BINANCE',
	KRAKEN: 'KRAKEN',
	KUNA: 'KUNA',
	BYBIT: 'BYBIT',
	WHITEBIT: 'WHITEBIT'
};

class BaseProvider 
{
	constructor() {
		this.separator = '';
	}

	toTicker(cur1,cur2) {
		return `${cur1}${this.separator}${cur2}`;
	}

	toRate(response,cur1,cur2) {
		var ticker = this.toTicker(cur1, cur2);
		var rate = this.pickRate(response, ticker);
		if (!rate)
			return;
		// Overriding provider ticker format
		rate.name = getTicker(cur1, cur2);
		rate.reverse = new Rate(getTicker(cur2, cur1), 1 / rate.bid, 1 / rate.ask, rate);
		return rate;
	}	

	// Override it for your provider
	pickRate(response,ticker) { return; }
}

class ExmoProvider extends BaseProvider {
	constructor() {
		super();
		this.name = PROVIDER.EXMO;
		this.tableId = 'table_exmo';
		this.separator = '_';
		this.url = 'https://api.exmo.com/v1/ticker/';
	}

	pickRate(response,ticker) {
		var rate = response[ticker];
		if (!rate)
			return;
		return new Rate(ticker, rate.sell_price, rate.buy_price);
	}
}

class WirexProvider extends BaseProvider {
	constructor() {
		super();
		this.name = PROVIDER.WIREX;
		this.tableId = 'table_wirex';
		this.separator = '/';
		this.url = 'https://api.wirexapp.com/public/ticker?format=json';
	}

	pickRate(response,ticker) {
		var rate = response.rates.find(x => x.ticker === ticker);
		if (!rate)
			return;
		return new Rate(ticker, rate.ask, rate.bid);
	}
}

class BinanceProvider extends BaseProvider {
	constructor() {
		super();
		this.name = PROVIDER.BINANCE;
		this.tableId = 'table_binance';
		this.separator = '';
		this.url = 'https://api.binance.com/api/v3/ticker/bookTicker';
	}

	pickRate(response,ticker) {
		var rate = response.find(x => x.symbol === ticker);
		if (!rate || rate.askPrice == 0)
			return;
		return new Rate(ticker, rate.askPrice, rate.bidPrice);
	}
}

class KrakenProvider extends BaseProvider {
	altNames = new Map([
		["BTC", "XBT"] 
	]);

	constructor() {
		super();
		this.name = PROVIDER.KRAKEN;
		this.tableId = 'table_kraken';
		this.separator = '_';
		this.url = 'https://api.kraken.com/0/public/Ticker';
	}

	pickRate(response,ticker) {
		var currs = ticker.split(this.separator);
		var cur1 = this.chooseAltName(currs[0]);
		var cur2 = this.chooseAltName(currs[1]);
		for (var t of this.getTickers(cur1, cur2)) {
			var rate = response.result[t];
			if (rate)
				return new Rate(ticker, rate['a'][0], rate['b'][0]);
		}
		return;
	}

	chooseAltName(cur) {
		return this.altNames.get(cur) ?? cur;
	}

	*getTickers(cur1,cur2) {
		yield `${cur1}${cur2}`;
		yield `X${cur1}${cur2}`;
		yield `X${cur1}X${cur2}`;
		yield `X${cur1}Z${cur2}`;
	}
}

class KunaProvider extends BaseProvider {
	constructor() {
		super();
		this.name = PROVIDER.KUNA;
		this.tableId = 'table_kuna';
		this.separator = '';
		this.url = 'https://api.kuna.io/v3/tickers';
	}

	pickRate(response,ticker) {
		var rate = response.find(x => x[0] === ticker.toLowerCase());
		if (!rate)
			return;
		return new Rate(ticker, rate[3], rate[1]);
	}
}

class BybitProvider extends BaseProvider {
	constructor() {
		super();
		this.name = PROVIDER.BYBIT;
		this.tableId = 'table_bybit';
		this.separator = '';
		this.url = 'https://api.bybit.com/v5/market/tickers?category=spot';
	}

	pickRate(response,ticker) {
		var rate = response.result.list.find(x => x.symbol === ticker);
		if (!rate)
			return;
		return new Rate(ticker, rate.ask1Price, rate.bid1Price);
	}
}

class WhitebitProvider extends BaseProvider {
	constructor() {
		super();
		this.name = PROVIDER.WHITEBIT;
		this.tableId = 'table_whitebit';
		this.separator = '_';
		this.url = 'https://whitebit.com/api/v2/public/ticker';
		this.useProxy = true;
	}

	pickRate(response,ticker) {
		// TODO: Investigate problem - Origin null - with local execution
		if (!response?.result)
			return;
		var rate = response.result.find(x => x.tradingPairs === ticker);
		if (!rate)
			return;
		return new Rate(ticker, rate.lowestAsk, rate.highestBid);
	}
}

const PROVIDERS = new Map([
	[PROVIDER.EXMO, new ExmoProvider() ],
	[PROVIDER.WIREX, new WirexProvider() ],
	[PROVIDER.BINANCE, new BinanceProvider() ],
	[PROVIDER.KRAKEN, new KrakenProvider() ],
	[PROVIDER.KUNA, new KunaProvider() ],
	[PROVIDER.BYBIT, new BybitProvider() ],
	[PROVIDER.WHITEBIT, new WhitebitProvider() ]
]);