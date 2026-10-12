import { describe, expect, test } from "bun:test";
import { matchSettlement, type SettlementMatch } from "./settlement";

const cf: SettlementMatch = {
  label: "CF Benchmarks index",
  command: null,
  aside: "The crypto quote is a different print.",
};

const pyth: SettlementMatch = {
  label: "Pyth price at the settle time",
  command: null,
  aside: "The futures last trade is a different print.",
};

const binance: SettlementMatch = {
  label: "Binance price",
  command: null,
  aside: "The crypto quote is a different print.",
};

const cpi: SettlementMatch = {
  label: "CPI-U",
  command: "CPI",
  aside: null,
};

const payrolls: SettlementMatch = {
  label: "Payrolls and unemployment",
  command: "ECST",
  aside: null,
};

const gdp: SettlementMatch = {
  label: "GDP and PCE",
  command: "ECST",
  aside: null,
};

const recession: SettlementMatch = {
  label: "NBER recession dates",
  command: null,
  aside: "This is not the GDP print.",
};

const treasury: SettlementMatch = {
  label: "Treasury yield",
  command: "GC",
  aside: null,
};

const aaa: SettlementMatch = {
  label: "AAA regular gasoline",
  command: null,
  aside: "DOE is the EIA weekly series.",
};

const eia: SettlementMatch = {
  label: "EIA petroleum",
  command: "DOE",
  aside: null,
};

const exchange: SettlementMatch = {
  label: "Exchange settlement",
  command: "CTM",
  aside: "CTM is the futures settlement, not a 15-minute print.",
};

const weather: SettlementMatch = {
  label: "Station temperature",
  command: "WX",
  aside: null,
};

const fed: SettlementMatch = {
  label: "Fed funds target",
  command: "WIRP",
  aside: "WIRP is the futures path. The meeting's cut, hold, or hike is the statement.",
};

const score: SettlementMatch = {
  label: "Final score",
  command: "ODDS",
  aside: null,
};

const bill: SettlementMatch = {
  label: "Congress bill",
  command: "BILLS",
  aside: null,
};

const register: SettlementMatch = {
  label: "Federal Register",
  command: "FR",
  aside: null,
};

const strait: SettlementMatch = {
  label: "Strait traffic",
  command: "SHIP",
  aside: null,
};

const quake: SettlementMatch = {
  label: "Earthquake",
  command: "QUAKE",
  aside: null,
};

const cases: Array<{
  name: string;
  input: Parameters<typeof matchSettlement>[0];
  match: SettlementMatch | null;
}> = [
  { name: "matches a BTC series to CF Benchmarks", input: { seriesTicker: "KXBTC" }, match: cf },
  { name: "matches an ETH series prefix to CF Benchmarks", input: { seriesTicker: "KXETHMAX" }, match: cf },
  { name: "matches a lowercase SOL series to CF Benchmarks", input: { seriesTicker: "kxsol" }, match: cf },
  { name: "matches an XRP event suffix to CF Benchmarks", input: { eventTicker: "KXXRP-26DEC" }, match: cf },
  {
    name: "matches cfbenchmarks.com",
    input: { resolutionSource: "https://www.cfbenchmarks.com/indices/BRTI" },
    match: cf,
  },
  {
    name: "matches a www-prefixed uppercase CF Benchmarks host",
    input: { resolutionSource: "https://WWW.CFBENCHMARKS.COM/indices" },
    match: cf,
  },
  { name: "matches KXBTC15M to CF Benchmarks, not Pyth", input: { seriesTicker: "KXBTC15M" }, match: cf },
  { name: "matches KXSOL15M to CF Benchmarks, not Pyth", input: { seriesTicker: "KXSOL15M" }, match: cf },
  {
    name: "prefers CF Benchmarks when the series is BTC and the host is Binance",
    input: { seriesTicker: "KXBTC", resolutionSource: "https://www.binance.com/en" },
    match: cf,
  },
  { name: "matches KXWTI15M to Pyth, not CTM", input: { seriesTicker: "KXWTI15M" }, match: pyth },
  { name: "matches a pyth host", input: { resolutionSource: "https://hermes.pyth.network/v2/price" }, match: pyth },
  { name: "matches www.pyth.network", input: { resolutionSource: "https://www.pyth.network/price" }, match: pyth },
  {
    name: "prefers Pyth when the host contains pyth and the series is KXWTI",
    input: { seriesTicker: "KXWTI", resolutionSource: "https://pyth.network/price" },
    match: pyth,
  },
  { name: "matches binance.com", input: { resolutionSource: "https://www.binance.com/en/price/bitcoin" }, match: binance },
  { name: "matches KXCPI", input: { seriesTicker: "KXCPI" }, match: cpi },
  { name: "matches KXCPIYOY-26SEP to CPI", input: { eventTicker: "KXCPIYOY-26SEP" }, match: cpi },
  { name: "matches a lowercase CPI event suffix", input: { seriesTicker: "kxcpiyoy-26sep" }, match: cpi },
  { name: "matches KXCPICORE", input: { seriesTicker: "KXCPICORE" }, match: cpi },
  { name: "matches KXCPICOREYOY", input: { seriesTicker: "KXCPICOREYOY" }, match: cpi },
  { name: "matches KXECONSTATCPI", input: { seriesTicker: "KXECONSTATCPI" }, match: cpi },
  {
    name: "matches bls.gov when the title mentions inflation",
    input: { resolutionSource: "https://www.bls.gov/cpi/", title: "Year-over-year inflation" },
    match: cpi,
  },
  {
    name: "matches bls.gov when the title mentions CPI",
    input: { resolutionSource: "https://bls.gov/news", title: "CPI-U rose" },
    match: cpi,
  },
  {
    name: "prefers CPI when a BLS title mentions both CPI and unemployment",
    input: { resolutionSource: "https://www.bls.gov/news", title: "CPI and unemployment" },
    match: cpi,
  },
  { name: "matches KXPAYROLLS", input: { seriesTicker: "KXPAYROLLS" }, match: payrolls },
  { name: "matches KXU3", input: { seriesTicker: "KXU3" }, match: payrolls },
  { name: "matches KXJOBLESS", input: { eventTicker: "KXJOBLESS-26OCT" }, match: payrolls },
  {
    name: "matches bls.gov when the title mentions unemployment",
    input: { resolutionSource: "https://www.bls.gov/lau/", title: "Unemployment rate" },
    match: payrolls,
  },
  {
    name: "matches dol.gov when the title mentions jobless claims",
    input: { resolutionSource: "https://www.dol.gov/ui/data.pdf", title: "Weekly jobless claims" },
    match: payrolls,
  },
  {
    name: "matches dol.gov when the title mentions payrolls",
    input: { resolutionSource: "https://dol.gov/news", title: "Nonfarm payrolls" },
    match: payrolls,
  },
  { name: "matches KXGDP", input: { seriesTicker: "KXGDP" }, match: gdp },
  { name: "matches KXPCECORE", input: { seriesTicker: "KXPCECORE" }, match: gdp },
  {
    name: "matches bea.gov when the title mentions GDP",
    input: { resolutionSource: "https://www.bea.gov/data/gdp", title: "Real GDP growth" },
    match: gdp,
  },
  {
    name: "matches bea.gov when the title mentions PCE",
    input: { resolutionSource: "https://bea.gov/data/pce", title: "Core PCE" },
    match: gdp,
  },
  {
    name: "prefers GDP when a BEA title also mentions a recession",
    input: { resolutionSource: "https://www.bea.gov/gdp", title: "GDP during a recession" },
    match: gdp,
  },
  {
    name: "matches a BEA recession title that is not the GDP print",
    input: { resolutionSource: "https://www.bea.gov/news", title: "NBER recession dates" },
    match: recession,
  },
  { name: "matches a T-note series prefix", input: { seriesTicker: "KXTNOTE10Y" }, match: treasury },
  { name: "matches a Treasury series prefix", input: { eventTicker: "KXUST2Y-26" }, match: treasury },
  {
    name: "matches home.treasury.gov when the title mentions yield",
    input: { resolutionSource: "https://home.treasury.gov/data", title: "10-year yield" },
    match: treasury,
  },
  {
    name: "matches home.treasury.gov when the title mentions treasuries",
    input: { resolutionSource: "https://www.home.treasury.gov/auctions", title: "Treasury auctions" },
    match: treasury,
  },
  { name: "matches an AAA gasoline series prefix", input: { seriesTicker: "KXAAAGASW" }, match: aaa },
  {
    name: "matches gasprices.aaa.com",
    input: { resolutionSource: "https://gasprices.aaa.com/state-gas-price-averages/" },
    match: aaa,
  },
  { name: "matches KXGAS", input: { seriesTicker: "KXGAS" }, match: eia },
  { name: "matches KXOIL", input: { seriesTicker: "KXOIL" }, match: eia },
  {
    name: "matches eia.gov when the title mentions gas",
    input: { resolutionSource: "https://www.eia.gov/petroleum/", title: "Weekly gasoline stocks" },
    match: eia,
  },
  {
    name: "matches eia.gov when the title mentions oil",
    input: { resolutionSource: "https://eia.gov/petroleum/supply", title: "Crude oil" },
    match: eia,
  },
  { name: "matches KXWTI", input: { seriesTicker: "KXWTI" }, match: exchange },
  {
    name: "matches theice.com",
    input: { resolutionSource: "https://www.theice.com/products/futures" },
    match: exchange,
  },
  { name: "matches ice.com", input: { resolutionSource: "https://ice.com/energy" }, match: exchange },
  { name: "matches a high-temperature series prefix", input: { seriesTicker: "KXHIGHNY" }, match: weather },
  { name: "matches a low-temperature series prefix", input: { seriesTicker: "KXLOWT" }, match: weather },
  { name: "matches a rain series prefix", input: { seriesTicker: "KXRAIN" }, match: weather },
  { name: "matches a temperature series prefix", input: { eventTicker: "KXTEMP-26SEP" }, match: weather },
  { name: "matches weather.com", input: { resolutionSource: "https://weather.com/forecast" }, match: weather },
  { name: "matches weather.gov", input: { resolutionSource: "https://www.weather.gov/obs" }, match: weather },
  {
    name: "matches forecast.weather.gov",
    input: { resolutionSource: "https://forecast.weather.gov/MapClick.php" },
    match: weather,
  },
  {
    name: "strips one leading www from forecast.weather.gov",
    input: { resolutionSource: "https://www.forecast.weather.gov/MapClick.php" },
    match: weather,
  },
  { name: "matches KXFEDDECISION", input: { seriesTicker: "KXFEDDECISION" }, match: fed },
  { name: "matches KXFED", input: { seriesTicker: "KXFED" }, match: fed },
  { name: "matches KXFED from an event suffix", input: { eventTicker: "KXFED-27APR" }, match: fed },
  { name: "matches KXRATECUT", input: { seriesTicker: "KXRATECUT" }, match: fed },
  {
    name: "matches federalreserve.gov when the title mentions the Fed",
    input: { resolutionSource: "https://www.federalreserve.gov/monetarypolicy", title: "Fed holds" },
    match: fed,
  },
  {
    name: "matches federalreserve.gov when the title mentions the FOMC",
    input: { resolutionSource: "https://federalreserve.gov/fomc", title: "FOMC minutes" },
    match: fed,
  },
  {
    name: "matches federalreserve.gov when the title mentions a rate",
    input: { resolutionSource: "https://www.federalreserve.gov/", title: "Target rate" },
    match: fed,
  },
  { name: "matches espn.com", input: { resolutionSource: "https://www.espn.com/nfl/game" }, match: score },
  { name: "matches foxsports.com", input: { resolutionSource: "https://www.foxsports.com/nba" }, match: score },
  { name: "matches nfl.com", input: { resolutionSource: "https://www.nfl.com/scores" }, match: score },
  { name: "matches nba.com", input: { resolutionSource: "https://www.nba.com/game" }, match: score },
  { name: "matches mlb.com", input: { resolutionSource: "https://www.mlb.com/scores" }, match: score },
  { name: "matches ncaa.com", input: { resolutionSource: "https://www.ncaa.com/game" }, match: score },
  { name: "matches fifa.com", input: { resolutionSource: "https://www.fifa.com/match" }, match: score },
  { name: "matches nhl.com", input: { resolutionSource: "https://www.nhl.com/game" }, match: score },
  { name: "matches a Sports category", input: { category: "Sports", title: "Who wins?" }, match: score },
  {
    name: "matches congress.gov when the title mentions a bill",
    input: { resolutionSource: "https://www.congress.gov/bill/119th-congress", title: "The bill failed" },
    match: bill,
  },
  {
    name: "matches congress.gov when the title mentions H.R.",
    input: { resolutionSource: "https://congress.gov/bill", title: "H.R. 1" },
    match: bill,
  },
  {
    name: "matches congress.gov when the title mentions an act",
    input: { resolutionSource: "https://www.congress.gov/bill", title: "An Act to provide funding" },
    match: bill,
  },
  {
    name: "matches federalregister.gov",
    input: { resolutionSource: "https://www.federalregister.gov/documents/2026/01/01" },
    match: register,
  },
  {
    name: "matches portwatch.imf.org",
    input: { resolutionSource: "https://portwatch.imf.org/pages/data" },
    match: strait,
  },
  {
    name: "matches earthquake.usgs.gov",
    input: { resolutionSource: "https://earthquake.usgs.gov/earthquakes/eventpage/abc" },
    match: quake,
  },
  {
    name: "returns null for an nytimes.com resolution source",
    input: {
      resolutionSource: "https://www.nytimes.com/2026/04/01/business/cpi.html",
      title: "CPI rose more than expected",
    },
    match: null,
  },
  {
    name: "returns null for a congress.gov title that is a senate race",
    input: {
      resolutionSource: "https://www.congress.gov/member/senate",
      title: "Senate race in Ohio",
    },
    match: null,
  },
  { name: "returns null for an empty input", input: {}, match: null },
  {
    name: "returns null when every field is null",
    input: {
      seriesTicker: null,
      eventTicker: null,
      title: null,
      resolutionSource: null,
      category: null,
    },
    match: null,
  },
  {
    name: "returns null when the resolution source is not a URL",
    input: { resolutionSource: "BLS", title: "CPI rose" },
    match: null,
  },
  {
    name: "returns null when pyth is only in the path",
    input: { resolutionSource: "https://example.com/pyth/price" },
    match: null,
  },
  {
    name: "returns null for bls.gov without a CPI or labor title",
    input: { resolutionSource: "https://www.bls.gov/eci/", title: "Employment cost index" },
    match: null,
  },
  {
    name: "returns null for bea.gov without GDP, PCE, or a recession",
    input: { resolutionSource: "https://www.bea.gov/news", title: "Personal income" },
    match: null,
  },
  {
    name: "returns null for eia.gov without gas or oil",
    input: { resolutionSource: "https://www.eia.gov/electricity/", title: "Electricity generation" },
    match: null,
  },
  {
    name: "returns null for federalreserve.gov without a Fed, FOMC, or rate title",
    input: { resolutionSource: "https://www.federalreserve.gov/publications", title: "Beige book" },
    match: null,
  },
  {
    name: "does not strip an event suffix that does not start with digits",
    input: { seriesTicker: "KXFED-DEC" },
    match: null,
  },
  {
    name: "uses the series ticker before the event ticker",
    input: { seriesTicker: "KXCPI", eventTicker: "KXWTI15M" },
    match: cpi,
  },
];

describe("matchSettlement", () => {
  for (const entry of cases) {
    test(entry.name, () => {
      expect(matchSettlement(entry.input)).toEqual(entry.match);
    });
  }
});
