// const api = require("termux");
const api = require("termux");
require("ansicolor").nice;
const CoinGecko = require("coingecko-api");
const CoinGeckoClient = new CoinGecko();
const numeral = require("numeral");
const currencyFormatter = require("currency-formatter");

var log;
if (api.hasTermux) {
  log = require("ololog").configure({
    time: { yes: true, print: x => x.toLocaleString().bright.cyan + " " },
    locate: false,
    tag: (
      lines,
      {
        level = "",
        levelColor = {
          info: cyan,
          warn: yellow,
          error: red.bright.inverse,
          debug: blue
        }
      }
    ) => {
     
      const levelStr =
        level && (levelColor[level] || (s => s))(level.toUpperCase());

      return bullet(
        levelStr.padStart(6) + " ",
        lines
      );
    }
  });
} else {
  log = require("log-with-statusbar")({
    ololog_configure: {
      time: { yes: true, print: x => x.toLocaleString().bright.cyan + " " },
      locate: false,
      tag: true
    },
    initialStatusTextArray: ["Please wait..."],
    minVerbosity: 1, //Minimum verbosity level
    verbosity: 1, //Default verbosity level
    enableStatusBar: true
  });
}

var defines = require("./defines");
var moment = require("moment");
var utility_functions = require("./utility");
require("ansicolor").nice;

const { table, getBorderCharacters } = require("table");

var g_cryptosOfInterest = [`BTC`, `ETH`, `LTC`];
var g_printStatusCounter = 0;
let statusBarText = Array(3);
//-----------------------------------------------------------------------------
async function getGlobalMarketData() {
  log.info("Getting global market data from CoinGecko...");

  let data = await CoinGeckoClient.global();
  defines.Globals.globalData = data.data.data;
  log.info("Successfully updated CoinGecko global market data!");
}
//-----------------------------------------------------------------------------
async function getAllPriceFullCoinGecko() {
  log.info("Getting prices from Coin Gecko...");

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
        log.info("Error: ", e);
      }
    });

    defines.Globals.prices = prices;
    defines.Globals.priceUpdateTimestamp = moment().valueOf();
    log.info("Successfully Updated CoinGecko prices!");
  }
}
//-----------------------------------------------------------------------------

async function updateStatusBar() {
  // let frames = log.getSpinners().moon.frames.concat(log.getSpinners().earth.frames);
  let frames = log.getSpinners().dots.frames;

  statusBarText[0] =
    frames[g_printStatusCounter++ % frames.length].toString().bright.green +
    ` Prices as of: ` +
    moment(defines.Globals.priceUpdateTimestamp).format(
      `MM/DD/YYYY, h:mm:ss A`
    );
  var filtered = statusBarText.filter(el => {
    return el != null;
  });

  log.setStatusBarText(filtered);
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
      `${data.length}`, // Number
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
      // console.log.info('index: ', JSON.stringify(index));
      // return tableHorizontalLines.indexOf(index) < 0;
      return true;
    }
  };

  let output = table(data, options);
  if (
    Object.keys(defines.Globals.coinMarketCapPricesUsedForAlerts).length > 0
  ) {
    if (api.hasTermux) {
      log.info(output);
    } else {
      let rowsFormat = output.split("\n");

      let i = 1;
      rowsFormat.forEach(r => {
        if (r != "") {
          statusBarText[i++] = r;
        }
      });

      let newArray = [];
      newArray.push(statusBarText[0]);
      newArray = newArray.concat(rowsFormat);
      statusBarText = newArray;
    }
  }
  let notificationOutput = "";
  g_cryptosOfInterest.forEach(c => {
    let btcPrice =
      defines.Globals.coinMarketCapPricesUsedForAlerts[c].price_usd ||
      defines.Globals.coinMarketCapPricesUsedForAlerts[c].current_price; // coinGecko;

    let btcPriceFormatted =
      btcPrice <= 0 ? "N/A".yellow : utility_functions.formatPrice(btcPrice);

    notificationOutput += `${c}: ${btcPriceFormatted}, `;
  });

  // Calculate marketcap
  let mktCapFormatted = numeral(
    defines.Globals.globalData.total_market_cap.usd
  ).format("0.00 a");
  let pricePostFix = /\S+\s+(.*)/.exec(mktCapFormatted);

  pricePostFix = pricePostFix[1].toUpperCase();
  mktCapFormatted = currencyFormatter.format(mktCapFormatted, {
    code: "USD",
    precision: 2
  });
  mktCapFormatted = `MKTCAP: ${mktCapFormatted} ${pricePostFix}`;

  log.info("notificationOutput: ", notificationOutput + mktCapFormatted);

  if (
    api.hasTermux &&
    Object.keys(defines.Globals.coinMarketCapPricesUsedForAlerts).length > 0 &&
    defines.Globals.coinMarketCapPricesUsedForAlerts["BTC"]
  ) {
    api
      .notification()
      .content(notificationOutput)
      .id(1)
      .title(
        `Updated on ` + moment().format("MM/DD h:mm") + `, ` + mktCapFormatted
      )
      //  .url('...')
      .run();
  }
}
//-----------------------------------------------------------------------------
/**
 *
 */
async function main() {
  defines.Globals.startTime = moment().valueOf();
  if (api.hasTermux) {
    api
      .notification()
      .content("Updating crypto prices...")
      .id(1)
      .title(`Please wait...`)
      //  .url('...')
      .run();
  }

  if (defines.Globals.options.getCoinGeckoPrices) {
    await getAllPriceFullCoinGecko();
    await getGlobalMarketData();
  }

  defines.Globals.intervals.aggregatePriceInterval = setInterval(() => {
    if (defines.Globals.options.enable) {
      printStatus();
    }
  }, 5000);

  defines.Globals.intervals.coingGeckoUpdateInterval = setInterval(() => {
    if (defines.Globals.options.enable) {
      getAllPriceFullCoinGecko();
      getGlobalMarketData();
    }
  }, 10 * 1000);

  if (!api.hasTermux) {
    updateStatusBar();
    defines.Globals.intervals.statusBarTextInterval = setInterval(() => {
      if (defines.Globals.options.enable) {
        updateStatusBar();
      }
    }, 0.1 * 1000);
  }
}

main();
