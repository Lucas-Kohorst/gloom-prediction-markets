import { describe, expect, test } from "bun:test";
import { adjacentSearchVenue, normalizeAdjacentSearchEvents } from "./adjacent-search";

describe("adjacent event search", () => {
  test("turns a Kalshi event into contract rows", () => {
    const markets = normalizeAdjacentSearchEvents([{
      event_id: "kalshi:KXFEDDECISION-26OCT",
      name: "Fed decision in Oct 2026?",
      markets: [{
        platform: "kalshi",
        ticker: "KXFEDDECISION-26OCT-H0",
        question: "Will the Fed hold?",
        probability: 84,
        volume: 100,
        link: "https://kalshi.com/markets/kxfeddecision/kxfeddecision-26oct",
        status: "active",
      }],
    }], "kalshi");
    expect(markets).toHaveLength(1);
    expect(markets[0]?.eventTicker).toBe("KXFEDDECISION-26OCT");
    expect(markets[0]?.yesPrice).toBeCloseTo(0.84);
    expect(markets[0]?.venue).toBe("kalshi");
  });

  test("treats every probability as a percent, including values at or below 1", () => {
    const markets = normalizeAdjacentSearchEvents([{
      event_id: "polymarket:51456",
      name: "How many Fed rate cuts in 2026?",
      markets: [
        { platform: "polymarket", ticker: "0xabc", question: "One cut?", probability: 1 },
        { platform: "polymarket", ticker: "0xdef", question: "Tiny cut?", probability: 0.2 },
      ],
    }], "polymarket");
    expect(markets[0]?.yesPrice).toBeCloseTo(0.01);
    expect(markets[1]?.yesPrice).toBeCloseTo(0.002);
  });

  test("reads share and dollar units separately", () => {
    const [market] = normalizeAdjacentSearchEvents([{
      event_id: "polymarket:51456",
      name: "How many Fed rate cuts in 2026?",
      markets: [{
        platform: "polymarket",
        ticker: "0xabc",
        question: "No cuts?",
        probability: 84,
        volume: 20,
        volume_unit: "shares",
        volume_24h: 10,
        volume_24h_unit: "shares",
        open_interest: 5,
        open_interest_unit: "usd",
      }],
    }], "polymarket");
    expect(market?.volume24hUnit).toBe("contracts");
    expect(market?.totalVolumeUnit).toBe("contracts");
    expect(market?.openInterestUnit).toBe("usd");
    expect(market?.volume24hUnit).not.toBe("usd");
  });

  test("keys Polymarket by the Gamma id and Polymarket US by the gateway id", () => {
    const [polymarket] = normalizeAdjacentSearchEvents([{
      event_id: "polymarket:51456",
      name: "How many Fed rate cuts in 2026?",
      markets: [{
        platform: "polymarket",
        ticker: "0xabc",
        market_id: "polymarket:12345",
        question: "No cuts?",
        probability: 84,
      }],
    }], "polymarket");
    expect(polymarket?.key).toBe("polymarket:12345");
    expect(polymarket?.marketId).toBe("12345");
    expect(polymarket?.eventId).toBe("51456");
    expect(polymarket?.conditionId).toBe("0xabc");

    const [polymarketUs] = normalizeAdjacentSearchEvents([{
      event_id: "polymarket-us:mlb-nlchamp-2026-09-27",
      name: "National League Champion",
      markets: [{
        platform: "polymarket-us",
        ticker: "tec-mlb-nlchamp-2026-09-27-lad",
        market_id: "polymarket-us:7909",
        question: "Los Angeles Dodgers",
        probability: 46.9,
      }],
    }], "polymarket-us");
    expect(polymarketUs?.key).toBe("polymarket-us:7909");
    expect(polymarketUs?.marketId).toBe("7909");
    expect(polymarketUs?.eventId).toBe("National League Champion");
  });

  test("leaves Limitless on its own catalog", () => {
    expect(adjacentSearchVenue("limitless")).toBeNull();
    expect(adjacentSearchVenue("pascal")).toBeNull();
    expect(adjacentSearchVenue("kalshi")).toBe("kalshi");
  });
});
