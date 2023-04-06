window.onload = function(e) { 
	mainCurrencyAsFirst();
	populateDropDown(); 
	getRates();
};

var columnCurs = ['BTC','ETH','UAH','USD','USDT','USDC','EUR','PLN','GBP'];
var rowCurrs = ['BTC','ETH','LTC','BCH','USDC','USDT'];
var allCurrs = new Set(columnCurs.concat(rowCurrs));
var MainCur = 'UAH';
var Rates = new Map();
const Precision = 3;
const PricePrecision = 2;

// true means result rate will be (columnCur/MainCur) otherwise (MainCur/columnCur)
// Set to false for expensive main currency (like BTC)
const IsPriceReversed = false;
// true means row_column rate otherwise column_row
// Set to false for expensive main currency (like BTC)
const IsRawToColumnRate = true;

function Rate(name,ask,bid,reverse = {}) {
	this.name = name;
	this.ask = parseFloat(ask);
	this.bid = parseFloat(bid);
	this.reverse = reverse;
}

async function getRates()
{
	// TODO: skip provider on error
	await Promise.all(Array.from(PROVIDERS).map(async ([_, provider]) => {
		await getProviderRates(provider);
		populateRates(provider.name);
	}));
	resizeTables();
}

async function getProviderRates(provider)
{
	var rates = new Map();
	Rates.set(provider.name, rates);

	var url = provider.url;
	var response = await fetch(url);
	for (let rowCur of allCurrs)
	{
		for (let columnCur of allCurrs)
		{
			if (rowCur !== columnCur)
			{
				var rate = getRate(rowCur, columnCur);
				if (rate)
					rates.set(rate.name, rate);
			}
		}
	}

	function getRate(cur1, cur2, findReverse = true) 
	{
		// TODO: using response makes function not pure
		var rate = provider.toRate(response,cur1,cur2);
		if (rate)
			return rate;
		else if (findReverse) 
			return getRate(cur2, cur1, false);
		return;
	}
}

function findRateToSell(cur1,cur2,PROVIDER)
{
	var rates = Rates.get(PROVIDER);
	return rates.get(getTicker(cur1, cur2)) 
		?? (rates.get(getTicker(cur2, cur1)))?.reverse;
}

function populateRates(provider)
{
	// Header
	var htmlText = "<tr><th></th>";
	for (let columnCur of columnCurs)
	{
		htmlText += "<th>" + columnCur + "</th>";
	}
	htmlText += "</tr>";

	// Rows
	for (let rowCur of rowCurrs)
	{
		htmlText += "<tr><th>" + rowCur + "</th>";
		for (let columnCur of columnCurs)
		{
			// For example UAH_BTC
			var firstRate = findRateToSell(MainCur, rowCur, provider);
			if (columnCur === MainCur)
			{
				var rateToShow = IsRawToColumnRate ? firstRate?.reverse : firstRate;
				htmlText += "<td>" + printValue(rateToShow?.ask);
			}
			else
			{
				// For example BTC_USD
				var secondRate = findRateToSell(rowCur, columnCur, provider);
				var rateToShow = IsRawToColumnRate ? secondRate : secondRate?.reverse;
				htmlText += "<td>" + printValue(rateToShow?.bid);
				htmlText += printPrice(firstRate?.bid * secondRate?.bid, columnCur);
			}

			htmlText += "</td>";
		}
		htmlText += "</tr>";
	}

	// Native
	htmlText += "<tr><th>Native</th>";
	for (let columnCur of columnCurs)
	{
		if (columnCur != MainCur)
		{
			var rate = findRateToSell(columnCur, MainCur, provider);
			htmlText += "<td>" + printValue(rate?.bid) + "</td>";
		}
		else
		{
			htmlText += "<td></td>";
		}
	}

	var tableId = PROVIDERS.get(provider).tableId;
	document.getElementById(tableId).innerHTML = htmlText;
}

function fetch(url) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('get', url, true);
        xhr.onload = function(e) {
        	resolve(JSON.parse(xhr.responseText));
        };
        xhr.onerror = function () {
        	resolve(undefined);
        	console.error("** An error occurred during the XMLHttpRequest");
        };
        xhr.send();
    });
}

function populateDropDown()
{
  	var select = document.getElementById('main_currency');
  	columnCurs.forEach((x, key) => { select[key] = new Option(x, x); });
}

// Make main currency column at first
function mainCurrencyAsFirst()
{
	//columnCurs = columnCurs.filter(item => item !== MainCur);
	//columnCurs.unshift(MainCur);
	var index = columnCurs.indexOf(MainCur);
	if (index !== 0)
		[columnCurs[0], columnCurs[index]] = [columnCurs[index], columnCurs[0]];
}

function dropDownChanged(value)
{
	MainCur = value;
	mainCurrencyAsFirst();
	PROVIDERS.forEach((value, key) => {
		populateRates(key);
	});
	resizeTables();
}

function resizeTables()
{
	// Resize columns width
	var tableIds = Array.from(PROVIDERS).map(x => x[1].tableId);
	var tables = tableIds.map(x => document.getElementById(x));
	columnCurs.forEach((x, index) => {
		var columns = tables.filter(x => x.rows.length > 0).map(x => x.rows[0].cells[index + 1]);
		var maxWidth = Math.max(...columns.map(x => x.clientWidth));
		columns.forEach(x => x.width = maxWidth + 2);
	});
}

function getTicker(cur1,cur2)
{
	return `${cur1}_${cur2}`;
}

function getValue(value)
{
	return value < 1 ? 1 / value : value;
}

function printPrice(rate)
{
	rate = getValue(rate);
	return rate ? ` (${rate.toFixed(PricePrecision)})` : '';
}

function printValue(value, whenEmpty = '-')
{
	value = getValue(value);
	return value ? value.toFixed(Precision) : whenEmpty;
}