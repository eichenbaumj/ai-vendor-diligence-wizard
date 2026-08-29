/*
  Honesty-panel grouping, single-sourced for backend and frontend.

  The flat panel read as "most checks don't work" because permanently-manual
  lanes (LinkedIn, SOC 2) and transient failures rendered identically. The
  server stamps each item's group at assembly; the frontend renders groups
  in this order and uses defaultGroup() as the fallback for reports stored
  before the field existed (statuses alone cannot distinguish "for you to
  check" from "unavailable", so old reports collapse those two).
*/

export const HONESTY_GROUPS = [
  { id: "flag", label: "Needs your attention" },
  { id: "checked", label: "Checked against records" },
  { id: "needs_you", label: "For you to check" },
  { id: "unavailable", label: "Source unavailable" },
  { id: "not_applicable", label: "Not applicable to this vendor" },
] as const;

export type HonestyGroup = (typeof HONESTY_GROUPS)[number]["id"];

export function defaultGroup(
  status: "pass" | "flag" | "could_not_check" | "not_applicable",
): HonestyGroup {
  if (status === "flag") return "flag";
  if (status === "pass") return "checked";
  if (status === "not_applicable") return "not_applicable";
  return "unavailable";
}
