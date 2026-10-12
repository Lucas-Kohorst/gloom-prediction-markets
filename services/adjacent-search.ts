import type { PredictionMarketSummary, PredictionVenue, PredictionVolumeUnit } from "../types";
import { fetchJson } from "./fetch";

const ADJACENT_EVENT_SEARCH = "https://api.adjacent.markets/api/v1/public/events";

const ADJACENT_VENUES = ["kalshi", "polymarket", "polymarket-us", "gemini"] as const;
export type AdjacentSearchVenue = (typeof ADJACENT_VENUES)[number];

export function adjacentSearchVenue(venue: PredictionVenue): AdjacentSearchVenue | null {
  return (ADJACENT_VENUES as readonly string[]).includes(venue) ? venue as AdjacentSearchVenue : null;
}

interface AdjacentSearchMarket {
  market_id?: string;
  platform?: string;
  question?: string;
  probability?: number | null;
  volume?: number | null;
  volume_unit?: string | null;
  volume_24h?: number | null;
  volume_24h_unit?: string | null;
  open_interest?: number | null;
  open_interest_unit?: string | null;
  end_date?: string | null;
  link?: string;
  ticker?: string;
  status?: string;
  category?: string;
}

interface AdjacentSearchEvent {
  event_id?: string;
  name?: string;
  category?: string;
  markets?: AdjacentSearchMarket[];
}

interface AdjacentSearchResponse {
  data?: AdjacentSearchEvent[];
}

function probabilityToPrice(probability: number | null | undefined): number | null {
  if (probability == null || !Number.isFinite(probability)) return null;
  return probability / 100;
}

function stripIdPrefix(value: string | undefined, venue: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const prefix = `${venue}:`;
  return trimmed.toLowerCase().startsWith(prefix.toLowerCase())
    ? trimmed.slice(prefix.length)
    : trimmed;
}

function adjacentMarketId(market: AdjacentSearchMarket, venue: PredictionVenue): string | null {
  const ticker = market.ticker?.trim() ?? "";
  const raw = stripIdPrefix(market.market_id, market.platform?.trim() || venue);
  if (raw && raw !== ticker) return raw;
  return ticker || raw || null;
}

function adjacentEventIdentity(
  event: AdjacentSearchEvent,
  venue: PredictionVenue,
): { eventId?: string; eventTicker?: string } {
  const raw = stripIdPrefix(event.event_id, venue);
  if (venue === "kalshi") {
    return { eventId: raw || undefined, eventTicker: raw || undefined };
  }
  if (venue === "polymarket-us" && raw && !/^\d+$/.test(raw)) {
    const name = event.name?.trim();
    return { eventId: name || raw };
  }
  return { eventId: raw || undefined };
}

function volumeUnitFromPayload(
  unit: string | null | undefined,
  fallback: PredictionVolumeUnit,
): PredictionVolumeUnit {
  const normalized = unit?.trim().toLowerCase() ?? "";
  if (!normalized) return fallback;
  if (normalized === "usd" || normalized === "dollar" || normalized === "dollars") return "usd";
  if (
    normalized === "shares" ||
    normalized === "share" ||
    normalized === "contracts" ||
    normalized === "contract"
  ) {
    return "contracts";
  }
  if (normalized.includes("share") || normalized.includes("contract")) return "contracts";
  if (normalized.includes("usd") || normalized.includes("dollar")) return "usd";
  return fallback;
}

function venueOf(platform: string | undefined, fallback: AdjacentSearchVenue): PredictionVenue | null {
  if (platform === "kalshi" || platform === "polymarket" || platform === "polymarket-us" || platform === "gemini") {
    return platform;
  }
  return fallback;
}

export function normalizeAdjacentSearchEvents(
  events: readonly AdjacentSearchEvent[],
  fallbackVenue: AdjacentSearchVenue,
): PredictionMarketSummary[] {
  const markets: PredictionMarketSummary[] = [];
  for (const event of events) {
    for (const market of event.markets ?? []) {
      const venue = venueOf(market.platform, fallbackVenue);
      if (!venue) continue;
      const marketId = adjacentMarketId(market, venue);
      if (!marketId) continue;
      const yesPrice = probabilityToPrice(market.probability);
      const fallbackUnit: PredictionVolumeUnit = venue === "kalshi" ? "contracts" : "usd";
      const volume24hUnit = volumeUnitFromPayload(market.volume_24h_unit, fallbackUnit);
      const totalVolumeUnit = volumeUnitFromPayload(market.volume_unit, fallbackUnit);
      const openInterestUnit = volumeUnitFromPayload(market.open_interest_unit, fallbackUnit);
      const identity = adjacentEventIdentity(event, venue);
      const ticker = market.ticker?.trim() ?? "";
      markets.push({
        key: `${venue}:${marketId}`,
        venue,
        marketId,
        title: market.question?.trim() || event.name?.trim() || marketId,
        marketLabel: market.question?.trim() || marketId,
        eventLabel: event.name?.trim() || market.question?.trim() || marketId,
        eventId: identity.eventId,
        eventTicker: identity.eventTicker,
        category: market.category ?? event.category,
        status: market.status === "active" ? "open" : (market.status ?? "open"),
        url: market.link?.trim() || "",
        description: "",
        endsAt: market.end_date ?? null,
        updatedAt: null,
        yesPrice,
        noPrice: yesPrice == null ? null : 1 - yesPrice,
        yesBid: null,
        yesAsk: null,
        noBid: null,
        noAsk: null,
        spread: null,
        lastTradePrice: yesPrice,
        volume24h: market.volume_24h ?? null,
        volume24hUnit,
        totalVolume: market.volume ?? null,
        totalVolumeUnit,
        openInterest: market.open_interest ?? null,
        openInterestUnit,
        liquidity: null,
        liquidityUnit: volume24hUnit,
        ...(venue === "polymarket" && /^0x[0-9a-f]+$/i.test(ticker) ? { conditionId: ticker } : {}),
      });
    }
  }
  return markets;
}

export async function loadAdjacentEventSearch(
  query: string,
  venue: AdjacentSearchVenue,
  signal?: AbortSignal,
): Promise<PredictionMarketSummary[]> {
  const url = new URL(ADJACENT_EVENT_SEARCH);
  url.searchParams.set("search", query);
  url.searchParams.set("platform", venue);
  url.searchParams.set("scope", "all");
  url.searchParams.set("sort", "volume");
  url.searchParams.set("sort_dir", "desc");
  url.searchParams.set("per_page", "8");
  const response = await fetchJson<AdjacentSearchResponse>(url.toString(), signal);
  return normalizeAdjacentSearchEvents(response.data ?? [], venue);
}
