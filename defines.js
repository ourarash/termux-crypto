Globals = {
  options: {
    loopForEver: true,
    printBanner: true,
    maxNumberOfIterations: 10,
    getCoinGeckoPrices: true,
    getForexData_oxr: false,
    initialCallback: null,
    updateValuesCallback: null,
    cryptosOfInterest : [`BTC`, `ETH`, `LTC`],
    updateIntervalInSeconds: 5,
    // control
    enable: true // Used for start/stop
  },
  startTime: 0,
  iterationEndTime: 0,
  iterationNumber: 0,
  coinGeckoCoinList: [],
  prices: {},
  globalData: {},
  coinMarketCapPrices: {
    fromArray: [],
    fromNames: []
  },
  cryptoPrices: {},
  generalMarketData: {},
  forex: {},
  osx_app_id: "39282bee7c1a40309826a02e0f09438a",
  intervals: {
    aggregatePriceInterval: null,
    coingGeckoUpdateInterval: null,
    statusBarTextInterval: null
  },
  logOptions: {
    ololog_configure: {
      time: { yes: true, print: x => x.toLocaleString().bright.cyan + " " },
      locate: false,
      tag: true
    },
    initialStatusTextArray: ["Please wait..."],
    minVerbosity: 1, //Minimum verbosity level
    verbosity: 1, //Default verbosity level
    enableStatusBar: true
  },
  priceUpdateTimestamp: 0,
};

var exports = (module.exports = {
  Globals: Globals
  // options: options,
  // log: log
});
