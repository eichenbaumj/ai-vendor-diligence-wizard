/*
  Design-system barrel. Other pages import ONLY from this path:
    import { Section, PillButton, ... } from "@/components/brand";
  The exported names and prop signatures are a cross-agent contract —
  do not rename without coordinating.
*/
export { SiteHeader } from "./SiteHeader";
export { SiteFooter } from "./SiteFooter";
export { BetaBanner } from "./BetaBanner";
export { Section } from "./Section";
export type { SectionProps, SectionTone } from "./Section";
export { PillButton } from "./PillButton";
export type {
  PillButtonProps,
  PillButtonVariant,
  PillButtonSize,
} from "./PillButton";
export { MarqueeBand } from "./MarqueeBand";
export type { MarqueeBandProps } from "./MarqueeBand";
export { TierBadge } from "./TierBadge";
export type { TierBadgeProps } from "./TierBadge";
export { DotField } from "./DotField";
export type { DotFieldProps } from "./DotField";
