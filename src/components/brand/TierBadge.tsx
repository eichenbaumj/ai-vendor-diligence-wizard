import { TIER_LABELS } from "@shared/schemas.ts";

export interface TierBadgeProps {
  tier: 0 | 1 | 2 | 3 | 4;
  size?: string; // "md" | "lg"
  /* Icon and color only, the label kept for screen readers: for a tight
     control whose own text already names the tier. */
  iconOnly?: boolean;
}

/*
  Verdict tier badge: color + icon + label, always together (WCAG 1.4.1 —
  color is never the sole signal). Colors come from the --color-tier-*
  tokens in brand.css; labels come from the shared TIER_LABELS contract.
*/

const TIER_COLORS: Record<0 | 1 | 2 | 3 | 4, { fg: string; bg: string }> = {
  0: { fg: "var(--color-tier-nr)", bg: "var(--color-tier-nr-soft)" },
  1: {
    fg: "var(--color-tier-unverified)",
    bg: "var(--color-tier-unverified-soft)",
  },
  2: { fg: "var(--color-tier-gaps)", bg: "var(--color-tier-gaps-soft)" },
  3: {
    fg: "var(--color-tier-emerging)",
    bg: "var(--color-tier-emerging-soft)",
  },
  4: {
    fg: "var(--color-tier-established)",
    bg: "var(--color-tier-established-soft)",
  },
};

function TierIcon({ tier, className }: { tier: 0 | 1 | 2 | 3 | 4; className: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (tier) {
    case 0: // circle-question
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.2 1-1.2 1.8" />
          <line x1="12" y1="17" x2="12" y2="17.01" />
        </svg>
      );
    case 1: // octagon-alert
      return (
        <svg {...shared}>
          <polygon points="7.9 2 16.1 2 22 7.9 22 16.1 16.1 22 7.9 22 2 16.1 2 7.9" />
          <line x1="12" y1="8" x2="12" y2="12.5" />
          <line x1="12" y1="16.5" x2="12" y2="16.51" />
        </svg>
      );
    case 2: // triangle-alert
      return (
        <svg {...shared}>
          <path d="M10.3 3.8 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" />
          <line x1="12" y1="9" x2="12" y2="13.5" />
          <line x1="12" y1="17.5" x2="12" y2="17.51" />
        </svg>
      );
    case 3: // compass / route
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="15.6 8.4 13.6 13.6 8.4 15.6 10.4 10.4" />
        </svg>
      );
    case 4: // check-shield
      return (
        <svg {...shared}>
          <path d="M12 2 4 5.5V11c0 5 3.4 9.3 8 10.5 4.6-1.2 8-5.5 8-10.5V5.5z" />
          <path d="m8.5 12.2 2.4 2.4 4.6-5.2" />
        </svg>
      );
  }
}

export function TierBadge({ tier, size = "md", iconOnly = false }: TierBadgeProps) {
  const colors = TIER_COLORS[tier];
  const isLg = size === "lg";
  return (
    <span
      className={`inline-flex items-center rounded-pill font-sans font-bold ${
        iconOnly ? "p-2" : isLg ? "gap-2.5 px-5 py-2.5 text-lg" : "gap-2 px-4 py-1.5 text-sm"
      }`}
      style={{ color: colors.fg, backgroundColor: colors.bg }}
    >
      <TierIcon tier={tier} className={isLg ? "h-6 w-6 shrink-0" : "h-4 w-4 shrink-0"} />
      <span className={iconOnly ? "sr-only" : undefined}>{TIER_LABELS[tier]}</span>
    </span>
  );
}
