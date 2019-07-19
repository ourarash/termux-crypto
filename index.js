// const api = require("termux");
log = console.log;

var defines = require("./defines");
var moment = require("moment");
var utility_functions = require("./utility");
require("ansicolor").nice;

const { table, getBorderCharacters } = require("table");

var g_cryptosOfInterest = [`BTC`, `ETH`];

async function getAllPriceFullCoinGecko() {
  log("Getting prices from Coin Gecko...");
  const CoinGecko = require("coingecko-api");
  const CoinGeckoClient = new CoinGecko();
  let coinList = await CoinGeckoClient.coins.list();
  if (coinList && coinList.success) {
    let markets = [];
    // let maxNumberOfCoins = coinList.data.length;
    let maxNumberOfCoins = 2000;
    for (let p = 0; p < maxNumberOfCoins / 250; p++) {
      let partialMarket = await CoinGeckoClient.coins.markets({
        per_page: 250,
        page: p,
        vs_currency: "usd"
      });
      if (partialMarket && partialMarket.success) {
        markets = markets.concat(partialMarket.data);
      }
    }
    let prices = {};
    markets.forEach(c => {
      let symbol = c.symbol.toUpperCase();

      // Fix coins with the same abbreviation
      switch (symbol) {
        case "BTG": {
          if (c.name == "Bitcoin Gold") {
          } else {
            symbol = "BTG*";
          }
          break;
        }

        case "KEY": {
          if (c.name == "Selfkey") {
          } else {
            symbol = "KEY*";
          }
          break;
        }
      }

      prices[symbol] = {};
      prices[symbol]["USD"] = {
        PRICE: Number(c.current_price),
        CHANGEPCT24HOUR: Number(c.price_change_percentage_24h),
        MKTCAP: Number(c.market_cap)
      };

      try {
        defines.Globals.coinMarketCapPricesUsedForAlerts[symbol] = c;
      } catch (e) {
        log("Error: ", e);
      }
    });

    defines.Globals.prices = prices;

    log("Successfully Updated CoinGecko prices!");
  }
}
//-----------------------------------------------------------------------------
/**
 * Prints the currently calculated prices
 */
async function printStatus() {
  let color = "white";

  let data = [
    [`#`, `Symbol`, `Price (USD)`]
    // [
    //   ``, // Number
    //   ``, // Symbol
    //   `  (USD)  `
    // ]
  ];

  let tableHorizontalLines = [0, 1];

  // keys.forEach((k, i) => {
  keys = Object.keys(defines.Globals.coinMarketCapPricesUsedForAlerts);
  for (let i = 0; i < keys.length && defines.Globals.options.enable; i++) {
    const k = keys[i];
    if (!g_cryptosOfInterest.includes(k)) {
      continue;
    }
    cmcPrice =
      defines.Globals.coinMarketCapPricesUsedForAlerts[k].price_usd ||
      defines.Globals.coinMarketCapPricesUsedForAlerts[k].current_price; // coinGecko;

    let cmcPriceFormatted =
      cmcPrice <= 0 ? "N/A".yellow : utility_functions.formatPrice(cmcPrice);

    data.push([
      `${i + 1}`, // Number
      `${k}`[color], // Symbol

      `${cmcPriceFormatted}`
    ]);
  }

  let options = {
    /**
     * @typedef {function} drawHorizontalLine
     * @param {number} index
     * @param {number} size
     * @return {boolean}
     */
    drawHorizontalLine: (index, size) => {
      // console.log('index: ', JSON.stringify(index));
      // return tableHorizontalLines.indexOf(index) < 0;
      return true;
    }
  };

  let output = table(data, options);
  log(output);

  const api = require("termux");
  if (
    api.hasTermux &&
    Object.keys(defines.Globals.coinMarketCapPricesUsedForAlerts).length > 0 &&
    defines.Globals.coinMarketCapPricesUsedForAlerts["BTC"]
  ) {
    btcPrice =
      defines.Globals.coinMarketCapPricesUsedForAlerts["BTC"].price_usd ||
      defines.Globals.coinMarketCapPricesUsedForAlerts["BTC"].current_price; // coinGecko;

    let btcPriceFormatted =
      btcPrice <= 0 ? "N/A".yellow : utility_functions.formatPrice(btcPrice);

    let notificationOutput = `BTC: ${btcPriceFormatted}`;
    api
      .notification()
      .content(notificationOutput)
      .id(1)
      .title(`Prices updated on (` + moment().format("MM/DD h:mm:ss ") + `)`)
      //  .url('...')
      .run();
  }
}

/**
 *
 * @param {object} options
 * @param {number} options.maxNumberOfIterations
 * @param {boolean} options.loopForEver
 * @param {boolean} options.getCoinGeckoPrices
 * @param {boolean} options.getForexData_oxr
 */
async function main(options = {}) {
  defines.Globals.startTime = moment().valueOf();
  let maxNumberOfIterations = options.maxNumberOfIterations || 10;
  let loopForEver = options.loopForEver || false;
  log("Please wait...");
  if (options.getCoinGeckoPrices) {
    await getAllPriceFullCoinGecko();
  }
  // if (options.getForexData_oxr) {
  //   getForexData_oxr();
  // } else {
  //   log.warn(
  //     "getForexData_oxr is false. Tickers with forex currencies will not be calculated."
  //   );
  // }

  defines.Globals.intervals.aggregatePriceInterval = setInterval(() => {
    if (defines.Globals.options.enable) {
      printStatus();
    }
  }, 5000);

  defines.Globals.intervals.coingGeckoUpdateInterval = setInterval(() => {
    if (defines.Globals.options.enable) {
      getAllPriceFullCoinGecko();
    }
  }, 10 * 1000);

  // updateStatusBar();
  // defines.Globals.intervals.statusBarTextInterval = setInterval(() => {
  //   if (defines.Globals.options.enable) {
  //     updateStatusBar();
  //   }
  // }, 0.1 * 1000);
}

main();
