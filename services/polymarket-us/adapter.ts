import { buildPredictionCatalogResourceKey } from "../../cache";
import type {
  PredictionCategoryId,
  PredictionMarketSummary,
} from "../../types";
import {
  fetchJson,
  loadCachedPredictionResource,
  PREDICTION_CACHE_POLICIES,
} from "../fetch";
import { normalizePolymarketUsCatalog } from "./normalize";
import type { PolymarketUsMarketsResponse } from "./types";

const POLYMARKET_US_PAGE_LIMIT = 100;

function buildPolymarketUsCatalogUrl(): string {
  const url = new URL("https://gateway.polymarket.us/v1/markets");
  url.searchParams.set("limit", String(POLYMARKET_US_PAGE_LIMIT));
  url.searchParams.set("closed", "false");
  return url.toString();
}

export async function loadPolymarketUsCatalog(
  searchQuery = "",
  categoryId: PredictionCategoryId = "all",
  options?: { signal?: AbortSignal },
): Promise<PredictionMarketSummary[]> {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return await loadCachedPredictionResource(
    "catalog",
    buildPredictionCatalogResourceKey("polymarket-us", categoryId, normalizedQuery),
    async () => {
      const response = await fetchJson<PolymarketUsMarketsResponse>(
        buildPolymarketUsCatalogUrl(),
        options?.signal,
      );
      return normalizePolymarketUsCatalog(
        response.markets ?? [],
        normalizedQuery,
        categoryId,
      );
    },
    PREDICTION_CACHE_POLICIES.catalog,
  );
}
