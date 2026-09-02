/*
  Name collision notice (methodology 1.7, name-only submissions).

  Every audited case of a namesake's record slipping into a report ran
  from a bare name shared by several registered companies, and the report
  never said so. When a name-only check (no website supplied) finds two or
  more live exact-name registry records it could not tie to the vendor,
  the honesty panel carries this row under "Needs your attention" and the
  report overview repeats the notice. Informational by construction: the
  candidate records it points to already earn nothing and drive no
  warning, and the row never enters the tier inputs.

  Pure TS. The reason is sized under HonestyItem's 300-character cap by
  construction (the count is a short integer); the copy names no entity.
*/
import type { HonestyItem } from "./schemas.ts";

export const NAME_COLLISION_CHECK_ID = "name_collision";
export const NAME_COLLISION_LABEL = "Name collision check";
/* Refused exact-name records that trip the notice on a bare-name run. */
export const NAME_COLLISION_THRESHOLD = 2;

const REASON_CAP = 300;

export function nameCollisionReason(count: number): string {
  const n = Math.max(1, Math.floor(count));
  const withCount =
    `At least ${n} registry records under this exact name could not be tied to this vendor. ` +
    "They appear as candidate records in the ledger and earn no credit and drive no warning. " +
    "Confirm the vendor's legal name and state of registration, and run a new check with the vendor's web address.";
  if (withCount.length <= REASON_CAP) return withCount;
  return (
    "Several registry records under this exact name could not be tied to this vendor. " +
    "They appear as candidate records and earn no credit and drive no warning. " +
    "Confirm the legal name and run a new check with the vendor's web address."
  );
}

export function nameCollisionItem(count: number): HonestyItem {
  return {
    check_id: NAME_COLLISION_CHECK_ID,
    label: NAME_COLLISION_LABEL,
    status: "flag",
    reason: nameCollisionReason(count),
    group: "flag",
  };
}

/* The overview's repeat of the notice, records-only wording: "refused"
   means untied, never "other companies" (dual entities exist). */
export const NAME_COLLISION_NOTICE =
  "Other registry records under this vendor's name could not be tied to it. They earn no credit and drive no warning. Confirm the legal name with the vendor. Adding the web address to a new check makes the match much stronger.";

/* Does this run trip the notice? Name runs without a supplied website only:
   with a website the root check already disambiguates, and other input
   kinds carry the vendor's own domains. */
export function nameCollisionApplies(args: {
  inputKind: "paste" | "name" | "pdf" | "url";
  submittedDomain: string | null;
  namesakeRecords: number;
}): boolean {
  return (
    args.inputKind === "name" &&
    !args.submittedDomain &&
    args.namesakeRecords >= NAME_COLLISION_THRESHOLD
  );
}
