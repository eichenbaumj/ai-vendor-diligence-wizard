/*
  D1.4 — Domain age vs. explicit age/track-record claims.

  RDAP lookup via rdap.org (which redirects to the registry-of-record's RDAP
  server). Parses events[] for the "registration" event. When the pitch claims
  a founding year and the domain was registered more than a year AFTER it,
  the check records a contradiction neutrally; severity is applied downstream.

  Pure module: no Deno APIs, no module-level state. Never throws.
*/
import type { RegistryCheck } from "../schemas.ts";

export interface RegistryCtx {
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
  apiKeys?: Record<string, string>;
  now?: () => Date;
}

const CHECK_ID = "rdap_domain_age";
const SOURCE = "Domain registration records (RDAP)";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function resolveFetch(ctx: RegistryCtx): typeof fetch {
  return ctx.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
}

function nowIso(ctx: RegistryCtx): string {
  return (ctx.now?.() ?? new Date()).toISOString();
}

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "") // strip scheme if a URL slipped in
    .replace(/[/?#].*$/, "") // strip any path
    .replace(/\.$/, "");
}

function monthYear(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export async function checkDomainAge(
  args: { domain: string; claimedFoundingYear: number | null },
  ctx: RegistryCtx = {},
): Promise<RegistryCheck> {
  const retrieved_at = nowIso(ctx);
  const domain = cleanDomain(args.domain);
  const humanUrl = `https://lookup.icann.org/en/lookup?name=${encodeURIComponent(domain)}`;

  try {
    /* rdap.org flakes routinely (most of QA run 1 on 2026-08-29). One quick
       retry inside the check turns a bad minute into a result instead of a
       coverage gap; the shared endpoint signal still bounds total time. */
    const fetchOnce = () =>
      resolveFetch(ctx)(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
        signal: ctx.signal,
        headers: { accept: "application/rdap+json, application/json" },
      });
    let res = await fetchOnce().catch(() => null);
    if (res === null || (!res.ok && res.status !== 404)) {
      await new Promise((r) => setTimeout(r, 800));
      res = await fetchOnce();
    }

    if (res.status === 404) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "definitive_miss",
        summary: `We could not find a registration record for ${domain}. The domain does not appear to be registered.`,
        evidence_url: humanUrl,
        confidence: null,
        retrieved_at,
        data: null,
      };
    }

    if (!res.ok) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "coverage_limited",
        summary: `The domain registration lookup for ${domain} was unavailable, so this check did not run. This does not count against the vendor.`,
        evidence_url: humanUrl,
        confidence: null,
        retrieved_at,
        data: { http_status: res.status },
      };
    }

    const body = (await res.json()) as Record<string, unknown>;
    const events = Array.isArray(body["events"])
      ? (body["events"] as Array<Record<string, unknown>>)
      : [];
    const regEvent = events.find(
      (e) =>
        typeof e["eventAction"] === "string" &&
        (e["eventAction"] as string).toLowerCase() === "registration",
    );
    const regDateRaw =
      regEvent && typeof regEvent["eventDate"] === "string"
        ? (regEvent["eventDate"] as string)
        : null;
    const regDate = regDateRaw ? new Date(regDateRaw) : null;
    const validDate = regDate !== null && !Number.isNaN(regDate.getTime());

    if (!validDate) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "hit",
        summary: `The domain ${domain} is registered, but the public record does not show when it was first registered.`,
        evidence_url: humanUrl,
        confidence: "exact",
        retrieved_at,
        data: {
          registered: true,
          registration_date: null,
          registered_year: null,
          claimed_year: args.claimedFoundingYear,
          contradiction: false,
          events,
        },
      };
    }

    const registeredYear = regDate.getUTCFullYear();
    const when = monthYear(regDate);
    const claimed = args.claimedFoundingYear;
    const contradiction = claimed !== null && registeredYear > claimed + 1;

    let summary: string;
    if (contradiction) {
      summary = `The domain ${domain} was registered in ${when}; the pitch describes work going back to ${claimed}. A company can be older than its current website, so this is worth asking about.`;
    } else if (claimed !== null) {
      summary = `The domain ${domain} was registered in ${when}, which is consistent with the founding year described in the pitch (${claimed}).`;
    } else {
      summary = `The domain ${domain} was registered in ${when}.`;
    }

    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "hit",
      summary,
      evidence_url: humanUrl,
      confidence: "exact",
      retrieved_at,
      data: {
        registered: true,
        registration_date: regDate.toISOString(),
        registered_year: registeredYear,
        claimed_year: claimed,
        contradiction,
        events,
      },
    };
  } catch {
    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "error",
      summary: `We could not reach the domain registration records service, so this check did not run. This does not count against the vendor.`,
      evidence_url: humanUrl,
      confidence: null,
      retrieved_at,
      data: null,
    };
  }
}
