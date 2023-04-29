window.onload = function(e) { 
	mainCurrencyAsFirst();
	populateDropDown(); 
	buildSecondTable();
	getRates();
};

var columnCurs = ['BTC','ETH','UAH','USD','USDT','USDC','EUR','PLN','GBP'];
var columnDynamicCurs = [...columnCurs];
//var rowCurrs = ['BTC','ETH','LTC','BCH','USDC','USDT'];
var rowCurrs = ['BTC','USDT'];
var allCurrs = new Set(columnCurs.concat(rowCurrs));
var MainCur = 'UAH';
var Rates = new Map();
const Precision = 4;
const PricePrecision = 2;
// if rate or price is less than threshold, it will be inverted (1 / value)
const PriceInvertingThreshold = 0.03;

// true means showing both ask and bid prices
const ShowBothPrices = true;
// true means showing calculated prices in brackets
const ShowPrices = false;

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
		fillSecondRates(provider);
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
	for (let columnCur of columnDynamicCurs)
	{
		htmlText += "<th>" + columnCur + "</th>";
	}
	htmlText += "</tr>";

	// Rows
	for (let rowCur of rowCurrs)
	{
		htmlText += "<tr><th>" + rowCur + "</th>";
		for (let columnCur of columnDynamicCurs)
		{
			// For example UAH_BTC
			var firstRate = findRateToSell(MainCur, rowCur, provider.name);
			if (columnCur === MainCur)
			{
				htmlText += `<td>${printValue(firstRate?.bid)}`;
				if (ShowBothPrices)
					htmlText += printValue(firstRate?.ask);
			}
			else
			{
				// For example BTC_USD
				var secondRate = findRateToSell(rowCur, columnCur, provider.name);
				htmlText += "<td>" + printValue(secondRate?.bid);
				if (ShowPrices)
					htmlText += printPrice(firstRate?.bid * secondRate?.bid);
				if (ShowBothPrices)
				{
					htmlText += printValue(secondRate?.ask);
					if (ShowPrices)
						htmlText += printPrice(secondRate?.ask * firstRate?.ask);
				}
			}

			htmlText += "</td>";
		}
		htmlText += "</tr>";
	}

	// Native
	htmlText += "<tr><th>Native</th>";
	for (let columnCur of columnDynamicCurs)
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

	document.getElementById(provider.tableId).innerHTML = htmlText;
}

function findRateToSell(cur1,cur2,provider)
{
	var rates = Rates.get(provider);
	return rates.get(getTicker(cur1, cur2)) 
		?? (rates.get(getTicker(cur2, cur1)))?.reverse;
}

// Make main currency column at first
function mainCurrencyAsFirst()
{
	columnDynamicCurs = [MainCur].concat(columnCurs.filter(item => item !== MainCur));
}

function populateDropDown()
{
  	var select = document.getElementById('main_currency');
  	columnDynamicCurs.forEach((x, key) => { select[key] = new Option(x, x); });
}

function buildSecondTable()
{
	// Header
	var htmlText = "<tr><th></th>";
	var providers = Array.from(PROVIDERS).map(x => x[1].name);
	for (let provider of providers)
	{
		htmlText += "<th>" + provider + "</th>";
	}
	htmlText += "</tr>";

	// Rows
	for (let cur of columnDynamicCurs)
	{
		htmlText += "<tr><th>" + cur + "</th>";
		for (let provider of providers)
		{
			htmlText += `<td id="${formatTableCellId(provider, cur)}"/>`;
		}
		htmlText += "</tr>";
	}

	document.getElementById('test').innerHTML = htmlText;
}

function fillSecondRates(provider)
{
	console.log(provider);
	// Rows
	for (let cur of columnDynamicCurs)
	{
		var rate = findRateToSell(MainCur, cur, provider.name);
		var cellId = formatTableCellId(provider.name, cur);
		$("#" + cellId).html(printValue(rate?.bid) + printValue(rate?.ask));
	}
}

function formatTableCellId(provider, cur)
{
	return `${provider}_${cur}`;
}

function dropDownChanged(value)
{
	MainCur = value;
	mainCurrencyAsFirst();
	PROVIDERS.forEach((value, key) => {
		fillRates(value);
		fillSecondRates(value);
	});
	resizeTables();
}

function resizeTables()
{
	// Resize columns width
	var tableIds = Array.from(PROVIDERS).map(x => x[1].tableId);
	var tables = tableIds.map(x => document.getElementById(x));
	columnDynamicCurs.forEach((x, index) => {
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
	return value < PriceInvertingThreshold ? 1 / value : value;
}

function printPrice(rate)
{
	rate = getValue(rate);
	return rate ? ` (${rate.toFixed(PricePrecision)})` : '';
}

function printValue(value, whenEmpty = '-')
{
	if (!value) 
		return printValueDiv(whenEmpty);

	var result = getValue(value);
	return result !== value 
		? printValueDiv(result.toFixed(Precision), "inverted_value")
		: printValueDiv(result.toFixed(Precision));
}

function printValueDiv(value, classAttr = '')
{
	return `<div class="${classAttr}">${value}</div>`;
}