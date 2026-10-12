import type { PredictionVenue } from "./types";

export const PREDICTION_VENUE_LABELS: Record<PredictionVenue, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  gemini: "Gemini",
  limitless: "Limitless",
  "crypto-com": "Crypto.com",
  "polymarket-us": "Polymarket US",
  pascal: "Pascal",
};

export const PREDICTION_VENUE_ORDER: readonly PredictionVenue[] = [
  "polymarket",
  "kalshi",
  "gemini",
  "limitless",
  "crypto-com",
  "polymarket-us",
  "pascal",
];
