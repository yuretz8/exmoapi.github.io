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
const Precision = 4;
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

function getRates()
{
	PROVIDERS.forEach((value, key) => {
		getProviderRates(value);
	});
}

function getProviderRates(provider)
{
	fetch(provider.url, provider.useProxy, response => {
		populateRates(provider, response);
		fillRates(provider);
		resizeTables();
	});
}

function fetch(url, useProxy, success) {
	var cors_api_url = 'https://cors-anywhere.herokuapp.com/';
	$.get(useProxy ? cors_api_url + url : url, 
		function (data, textStatus, jqXHR) {  // success callback
			success(data);
			});
}

function populateRates(provider, response)
{
	var rates = new Map();
	Rates.set(provider.name, rates);

	for (let rowCur of allCurrs)
	{
		for (let columnCur of allCurrs)
		{
			if (rowCur !== columnCur)
			{
				var rate = getRate(response, rowCur, columnCur);
				if (rate)
					rates.set(rate.name, rate);
			}
		}
	}

	function getRate(response, cur1, cur2, findReverse = true) 
	{
		var rate = provider.toRate(response, cur1, cur2);
		if (rate)
			return rate;
		else if (findReverse) 
			return getRate(response, cur2, cur1, false);
		return;
	}
}

function fillRates(provider)
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
			var firstRate = findRateToSell(MainCur, rowCur, provider.name);
			if (columnCur === MainCur)
			{
				var rateToShow = IsRawToColumnRate ? firstRate?.reverse : firstRate;
				htmlText += "<td>" + printValue(rateToShow?.ask);
			}
			else
			{
				// For example BTC_USD
				var secondRate = findRateToSell(rowCur, columnCur, provider.name);
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
			var rate = findRateToSell(columnCur, MainCur, provider.name);
			htmlText += "<td>" + printValue(rate?.bid) + "</td>";
		}
		else
		{
			htmlText += "<td></td>";
		}
	}

	var tableId = provider.tableId;
	document.getElementById(tableId).innerHTML = htmlText;
}

function findRateToSell(cur1,cur2,provider)
{
	var rates = Rates.get(provider);
	return rates.get(getTicker(cur1, cur2)) 
		?? (rates.get(getTicker(cur2, cur1)))?.reverse;
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