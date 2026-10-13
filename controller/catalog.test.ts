import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import * as gloomberbReact from "gloomberb/react";
import { testRender } from "gloomberb/test-support";
import { normalizeAdjacentSearchEvents } from "../services/adjacent-search";
import type { PredictionMarketSummary } from "../types";

let latestRefresh: (() => void) | null = null;

mock.module("gloomberb/react", () => ({
  ...gloomberbReact,
  useAutoRefresh(_lastUpdated: number | null, refresh: () => void) {
    latestRefresh = refresh;
  },
}));

const {
  catalogPendingContribution,
  mergeSearchHitsIntoCatalog,
  scanSearchCatalogs,
  seedCatalogPending,
  usePredictionCatalogData,
  visibleSearchHitCount,
} = await import("./catalog");

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  latestRefresh = null;
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function row(
  overrides: Partial<PredictionMarketSummary> & Pick<PredictionMarketSummary, "key" | "venue" | "marketId">,
): PredictionMarketSummary {
  return {
    title: overrides.marketId,
    marketLabel: overrides.marketId,
    eventLabel: overrides.marketId,
    status: "open",
    url: "",
    description: "",
    endsAt: null,
    updatedAt: null,
    yesPrice: 0.5,
    noPrice: 0.5,
    yesBid: null,
    yesAsk: null,
    noBid: null,
    noAsk: null,
    spread: null,
    lastTradePrice: 0.5,
    volume24h: null,
    volume24hUnit: "usd",
    totalVolume: null,
    totalVolumeUnit: "usd",
    openInterest: null,
    openInterestUnit: "usd",
    liquidity: null,
    liquidityUnit: "usd",
    ...overrides,
  };
}

function polymarketEvent(id: string, question: string) {
  return {
    id: "9001",
    title: question,
    markets: [{
      id,
      question,
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.5", "0.5"],
      active: true,
      closed: false,
    }],
  };
}

describe("catalog pending", () => {
  test("seeds only the uncached venues in scope", () => {
    const kalshiOnly = seedCatalogPending({
      categoryId: "macro",
      includeKalshi: true,
      includePolymarket: false,
      venueScope: "kalshi",
    });
    expect(kalshiOnly).toEqual({ "kalshi|macro|": 1 });

    const all = seedCatalogPending({
      categoryId: "macro",
      includeKalshi: false,
      includePolymarket: true,
      venueScope: "all",
    });
    expect(all["polymarket|macro|"]).toBe(1);
    expect(all["kalshi|macro|"]).toBeUndefined();
    for (const venue of ["gemini", "limitless", "crypto-com", "polymarket-us", "pascal"] as const) {
      expect(all[`${venue}|macro|`]).toBe(1);
    }
  });

  test("counts an uncached unsettled key as loading", () => {
    const cacheKey = "gemini|macro|";
    const resourceKey = "gemini:macro:all";
    expect(catalogPendingContribution(cacheKey, resourceKey, {}, { [cacheKey]: 1 }, {})).toBe(1);
    expect(catalogPendingContribution(cacheKey, resourceKey, {}, {}, { [cacheKey]: true })).toBe(0);
    expect(catalogPendingContribution(cacheKey, resourceKey, { [cacheKey]: [] }, {}, {})).toBe(0);
    expect(catalogPendingContribution(cacheKey, resourceKey, {}, {}, {})).toBe(1);
  });
});

describe("search hit merge", () => {
  test("counts only rows that match the query", () => {
    const markets = [
      row({ key: "polymarket:1", venue: "polymarket", marketId: "1", title: "qxunique wins", marketLabel: "qxunique wins" }),
      row({ key: "polymarket:2", venue: "polymarket", marketId: "2", title: "home side", marketLabel: "home side" }),
    ];
    expect(visibleSearchHitCount(markets, "qxunique")).toBe(1);
  });

  test("merges catalog ids and skips a second copy of the same event", () => {
    const polymarketCatalog = [
      row({
        key: "polymarket:111",
        venue: "polymarket",
        marketId: "111",
        eventId: "51456",
        title: "No cuts?",
      }),
    ];
    const [sameShape, conditionCopy] = normalizeAdjacentSearchEvents([{
      event_id: "polymarket:51456",
      name: "How many Fed rate cuts in 2026?",
      markets: [
        {
          platform: "polymarket",
          ticker: "0xdef",
          market_id: "polymarket:12345",
          question: "One cut?",
        },
        {
          platform: "polymarket",
          ticker: "0xabc",
          market_id: "polymarket:0xabc",
          question: "No cuts?",
        },
      ],
    }], "polymarket");
    const polymarketMerged = mergeSearchHitsIntoCatalog(polymarketCatalog, [sameShape!, conditionCopy!]);
    expect(polymarketMerged.map((market) => market.key)).toEqual(["polymarket:111", "polymarket:12345"]);

    const usCatalog = [
      row({
        key: "polymarket-us:7909",
        venue: "polymarket-us",
        marketId: "7909",
        eventId: "National League Champion",
        title: "Los Angeles Dodgers",
      }),
    ];
    const usHits = normalizeAdjacentSearchEvents([{
      event_id: "polymarket-us:mlb-nlchamp-2026-09-27",
      name: "National League Champion",
      markets: [
        {
          platform: "polymarket-us",
          ticker: "tec-mlb-nlchamp-2026-09-27-lad",
          market_id: "polymarket-us:7909",
          question: "Los Angeles Dodgers",
        },
        {
          platform: "polymarket-us",
          ticker: "tec-mlb-nlchamp-2026-09-27-lad",
          market_id: "polymarket-us:tec-mlb-nlchamp-2026-09-27-lad",
          question: "Los Angeles Dodgers",
        },
        {
          platform: "polymarket-us",
          ticker: "tec-mlb-nlchamp-2026-09-27-nym",
          market_id: "polymarket-us:7913",
          question: "New York Mets",
        },
      ],
    }], "polymarket-us");
    expect(mergeSearchHitsIntoCatalog(usCatalog, usHits).map((market) => market.key)).toEqual([
      "polymarket-us:7909",
      "polymarket-us:7913",
    ]);

    const [offCatalog] = normalizeAdjacentSearchEvents([{
      event_id: "polymarket-us:other-event",
      name: "Independent question",
      markets: [{
        platform: "polymarket-us",
        ticker: "some-slug",
        question: "Independent question",
      }],
    }], "polymarket-us");
    expect(mergeSearchHitsIntoCatalog([], [offCatalog!]).map((market) => market.key)).toEqual([
      "polymarket-us:some-slug",
    ]);

    const kalshiCatalog = [
      row({
        key: "kalshi:KXFED-A",
        venue: "kalshi",
        marketId: "KXFED-A",
        eventTicker: "KXFED",
        title: "Hold",
      }),
    ];
    const [kalshiHit] = normalizeAdjacentSearchEvents([{
      event_id: "kalshi:KXFED",
      name: "Fed",
      markets: [{ platform: "kalshi", ticker: "KXFED-B", question: "Cut" }],
    }], "kalshi");
    expect(mergeSearchHitsIntoCatalog(kalshiCatalog, [kalshiHit!]).map((market) => market.key)).toEqual([
      "kalshi:KXFED-A",
      "kalshi:KXFED-B",
    ]);
  });
});

describe("scanSearchCatalogs", () => {
  function installFetch(searchEvents: unknown[]) {
    const urls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      urls.push(url);
      if (url.includes("gamma-api.polymarket.com/public-search")) {
        return jsonResponse({ events: searchEvents });
      }
      if (url.includes("gamma-api.polymarket.com/events")) {
        return jsonResponse([polymarketEvent("111", "Will the home side win?")]);
      }
      if (url.includes("gateway.polymarket.us")) return jsonResponse({ markets: [] });
      if (url.includes("api.gemini.com")) return jsonResponse({ data: [] });
      if (url.includes("api.elections.kalshi.com")) return jsonResponse({ series: [], events: [] });
      if (url.includes("api.adjacent.markets")) return jsonResponse({ data: [] });
      return jsonResponse({ data: [], events: [], markets: [], series: [] });
    }) as typeof fetch;
    return urls;
  }

  function platforms(urls: string[]): string[] {
    return urls
      .filter((url) => url.includes("api.adjacent.markets"))
      .map((url) => new URL(url).searchParams.get("platform") ?? "")
      .sort();
  }

  const scanOptions = {
    categoryId: "sports" as const,
    includePolymarket: true,
    includeKalshi: true,
    includeGemini: true,
    includeLimitless: false,
    includePolymarketUs: true,
    includePascal: false,
  };

  test("an unfiltered catalog page does not count as a found search", async () => {
    const urls = installFetch([]);
    let raw = 0;
    let visible = 0;
    await scanSearchCatalogs({
      ...scanOptions,
      query: "qxunique",
      signal: new AbortController().signal,
      addHits(markets) {
        raw += markets.length;
        visible += visibleSearchHitCount(markets, "qxunique");
      },
    });

    expect(raw).toBeGreaterThan(0);
    expect(visible).toBe(0);
    expect(platforms(urls)).toEqual(["gemini", "kalshi", "polymarket", "polymarket-us"]);
    expect(urls.some((url) => url.includes("gateway.polymarket.us"))).toBe(true);
    expect(urls.filter((url) => url.includes("gamma-api.polymarket.com/events")).every((url) => !url.includes("tag_slug"))).toBe(true);
    expect(urls.filter((url) => url.includes("/trade-api/v2/series")).every((url) => !url.includes("category="))).toBe(true);
  });

  test("a visible venue hit skips Adjacent for that venue and still ignores the category", async () => {
    const urls = installFetch([polymarketEvent("222", "Will qxunique happen?")]);
    let visible = 0;
    await scanSearchCatalogs({
      ...scanOptions,
      query: "qxunique",
      signal: new AbortController().signal,
      addHits(markets) {
        visible += visibleSearchHitCount(markets, "qxunique");
      },
    });

    expect(visible).toBeGreaterThan(0);
    expect(platforms(urls)).toEqual(["gemini", "kalshi", "polymarket-us"]);
    expect(urls.filter((url) => url.includes("gamma-api.polymarket.com")).every((url) => !url.includes("tag_slug"))).toBe(true);
    expect(urls.filter((url) => url.includes("/trade-api/v2/series")).every((url) => !url.includes("category="))).toBe(true);
  });

  test("crypto.com and the first Limitless page are scanned without the browse category", async () => {
    const urls = installFetch([]);
    await scanSearchCatalogs({
      ...scanOptions,
      includeCryptoCom: true,
      includeLimitless: true,
      query: "qxunique",
      signal: new AbortController().signal,
      addHits() {},
    });

    expect(urls.some((url) => url.includes("api.crypto.com/dcm/v1/public/get-events"))).toBe(true);
    expect(urls.some((url) => url.includes("api.limitless.exchange/markets/active") && url.includes("page=1"))).toBe(true);
  });
});

describe("aborted extra catalog loads", () => {
  test("decrement the pending count and the first paint stays loading", async () => {
    let started = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    globalThis.fetch = (async () => {
      started += 1;
      await gate;
      return jsonResponse({ data: [] });
    }) as unknown as typeof fetch;

    const latest: { catalogLoadCount: number; allMarkets: PredictionMarketSummary[] } = {
      catalogLoadCount: 0,
      allMarkets: [],
    };
    function Harness() {
      const data = usePredictionCatalogData({
        categoryId: "macro",
        includeKalshi: false,
        includePolymarket: false,
        searchQuery: "",
        venueScope: "gemini",
      });
      latest.catalogLoadCount = data.catalogLoadCount;
      latest.allMarkets = data.allMarkets;
      return null;
    }

    const rendered = await testRender(createElement(Harness), { width: 20, height: 4 });
    expect(started).toBeGreaterThan(0);
    expect(latest.catalogLoadCount).toBeGreaterThan(0);
    expect(latest.allMarkets).toEqual([]);

    await act(async () => {
      latestRefresh?.();
    });
    // The refresh joins the venue download already in flight.
    expect(started).toBe(1);

    await act(async () => {
      release();
      await gate;
    });
    expect(latest.catalogLoadCount).toBe(0);
    rendered.renderer.destroy();
  });
});
