/*
  Verdict tier presentation tokens. Never color alone: every use pairs the
  color with the tier label and a glyph.
*/
import type { VerdictTier } from "@shared/schemas.ts";

export interface TierTokens {
  softBg: string; // tailwind class for the soft field
  strongText: string; // tailwind class for the strong accent text
  border: string;
}

export const TIER_TOKENS: Record<VerdictTier, TierTokens> = {
  0: {
    softBg: "bg-tier-nr-soft",
    strongText: "text-tier-nr",
    border: "border-tier-nr",
  },
  1: {
    softBg: "bg-tier-unverified-soft",
    strongText: "text-tier-unverified",
    border: "border-tier-unverified",
  },
  2: {
    softBg: "bg-tier-gaps-soft",
    strongText: "text-tier-gaps",
    border: "border-tier-gaps",
  },
  3: {
    softBg: "bg-tier-emerging-soft",
    strongText: "text-tier-emerging",
    border: "border-tier-emerging",
  },
  4: {
    softBg: "bg-tier-established-soft",
    strongText: "text-tier-established",
    border: "border-tier-established",
  },
};
