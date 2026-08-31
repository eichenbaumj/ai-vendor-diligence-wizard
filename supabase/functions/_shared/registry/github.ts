/*
  D4.2 — Engineering footprint: does a public GitHub organization exist for
  this vendor, and is anyone pushing code?

  Tries up to three org-slug guesses derived from the vendor name candidates
  and the domain. Absence is a definitive miss but a LOW/neutral signal:
  most government vendors publish no public code, and the summary says so.
  Severity is applied downstream, not here.

  Pure module: no Deno APIs, no module-level state. Never throws.
*/
import type { RegistryCheck } from "../schemas.ts";

export interface RegistryCtx {
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
  apiKeys?: Record<string, string>;
  now?: () => Date;
}

const CHECK_ID = "github_org";
const SOURCE = "GitHub";

const MAX_GUESSES = 3;

/* Corporate-suffix tokens stripped from the end of a name before
   comparison. */
const NAME_SUFFIXES = new Set([
  "inc", "incorporated", "llc", "corp", "corporation", "co", "company",
  "ltd", "limited", "pbc",
]);

/* Investment-vehicle vocabulary: a match whose name contains these when the
   query name does not is rejected as a false positive. */
const VEHICLE_PATTERN = /\b(series|spv|fund|holdings)\b/i;

function resolveFetch(ctx: RegistryCtx): typeof fetch {
  return ctx.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
}

function nowIso(ctx: RegistryCtx): string {
  return (ctx.now?.() ?? new Date()).toISOString();
}

function normalizeCompanyName(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" ").filter((p) => p.length > 0);
  while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts.join(" ");
}

function isVehicleMismatch(candidateName: string, queryNames: string[]): boolean {
  return (
    VEHICLE_PATTERN.test(candidateName) &&
    !queryNames.some((q) => VEHICLE_PATTERN.test(q))
  );
}

const VALID_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,37})$/;

function buildSlugGuesses(candidates: string[], domain: string): string[] {
  const guesses: string[] = [];
  const push = (slug: string) => {
    const s = slug.replace(/^-+|-+$/g, "");
    if (s.length > 0 && VALID_SLUG.test(s) && !guesses.includes(s)) guesses.push(s);
  };

  const domainBase = domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^www\./, "")
    .split(".")[0];
  if (domainBase) push(domainBase);

  for (const candidate of candidates) {
    const norm = normalizeCompanyName(candidate);
    if (!norm) continue;
    push(norm.replace(/\s+/g, ""));
    push(norm.replace(/\s+/g, "-"));
  }
  return guesses.slice(0, MAX_GUESSES);
}

export async function checkGithubOrg(
  args: { candidates: string[]; domain: string },
  ctx: RegistryCtx = {},
): Promise<RegistryCheck> {
  const retrieved_at = nowIso(ctx);
  const fetchFn = resolveFetch(ctx);
  const queryNames = [...args.candidates, args.domain];
  const searchName = args.candidates[0] ?? args.domain;
  const searchUrl = `https://github.com/search?q=${encodeURIComponent(searchName)}&type=orgs`;

  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "ai-vendor-diligence-wizard",
  };
  if (ctx.apiKeys?.github) headers["authorization"] = `Bearer ${ctx.apiKeys.github}`;

  const guesses = buildSlugGuesses(args.candidates, args.domain);

  if (guesses.length === 0) {
    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "not_applicable",
      summary: "We did not have a usable company name or domain to look up on GitHub.",
      evidence_url: searchUrl,
      confidence: null,
      retrieved_at,
      data: null,
    };
  }

  try {
    let rateLimited = false;
    let anySearched = false;

    for (const slug of guesses) {
      const res = await fetchFn(`https://api.github.com/orgs/${encodeURIComponent(slug)}`, {
        signal: ctx.signal,
        headers,
      });

      if (res.status === 404) {
        anySearched = true;
        continue;
      }
      if (res.status === 403 || res.status === 429) {
        rateLimited = true;
        break;
      }
      if (!res.ok) continue;

      anySearched = true;
      const org = (await res.json()) as Record<string, unknown>;
      const login = typeof org["login"] === "string" ? (org["login"] as string) : slug;
      const orgName = typeof org["name"] === "string" ? (org["name"] as string) : login;
      const blog = typeof org["blog"] === "string" ? (org["blog"] as string) : "";
      const publicRepos = typeof org["public_repos"] === "number" ? (org["public_repos"] as number) : 0;
      const htmlUrl =
        typeof org["html_url"] === "string" ? (org["html_url"] as string) : `https://github.com/${login}`;

      /* Reject investment-vehicle false positives. */
      if (isVehicleMismatch(orgName, queryNames)) continue;

      /* Confidence: exact when the org's display name matches a normalized
         candidate, or the org's website points at the vendor's domain. */
      const normalizedOrg = normalizeCompanyName(orgName);
      const nameExact = args.candidates.some(
        (c) => normalizeCompanyName(c) === normalizedOrg && normalizedOrg.length > 0,
      );
      const siteExact = blog.toLowerCase().includes(
        args.domain.toLowerCase().replace(/^www\./, ""),
      ) && args.domain.length > 0;
      const confidence = nameExact || siteExact ? "exact" as const : "name_similarity" as const;

      /* Best-effort recent-activity lookup. */
      let lastPush: string | null = null;
      let repoSample: Array<{ name: string; pushed_at: string | null }> = [];
      try {
        const reposRes = await fetchFn(
          `https://api.github.com/orgs/${encodeURIComponent(login)}/repos?sort=pushed&per_page=5`,
          { signal: ctx.signal, headers },
        );
        if (reposRes.ok) {
          const repos: unknown = await reposRes.json();
          if (Array.isArray(repos)) {
            repoSample = repos
              .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
              .map((r) => ({
                name: typeof r["name"] === "string" ? (r["name"] as string) : "",
                pushed_at: typeof r["pushed_at"] === "string" ? (r["pushed_at"] as string) : null,
              }));
            lastPush = repoSample.find((r) => r.pushed_at !== null)?.pushed_at ?? null;
          }
        }
      } catch {
        /* repos are optional detail; the org itself is the finding */
      }

      const activity = lastPush
        ? ` Code was last updated on ${lastPush.slice(0, 10)}.`
        : "";
      const repoPhrase =
        publicRepos === 0
          ? "no public code repositories"
          : `${publicRepos} public code repositor${publicRepos === 1 ? "y" : "ies"}`;

      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "hit",
        summary: `We found a public GitHub organization "${login}" with ${repoPhrase}.${activity} Public code is a sign of real engineering activity.`,
        evidence_url: htmlUrl,
        confidence,
        retrieved_at,
        data: {
          org: login,
          org_name: orgName,
          public_repos: publicRepos,
          last_push: lastPush,
          repos: repoSample,
          checked_slugs: guesses,
        },
      };
    }

    if (rateLimited && !anySearched) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "coverage_limited",
        summary: "GitHub limited our lookup requests, so we could not run this check. This does not count against the vendor.",
        evidence_url: searchUrl,
        confidence: null,
        retrieved_at,
        data: { checked_slugs: guesses },
      };
    }

    if (!anySearched) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "coverage_limited",
        summary: "GitHub could not be searched right now, so this check did not run. This does not count against the vendor.",
        evidence_url: searchUrl,
        confidence: null,
        retrieved_at,
        data: { checked_slugs: guesses },
      };
    }

    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "definitive_miss",
      summary: "We did not find a public GitHub organization for this vendor. Most government software vendors publish no public code, so this is a neutral result.",
      evidence_url: searchUrl,
      confidence: null,
      retrieved_at,
      data: { checked_slugs: guesses },
    };
  } catch {
    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "error",
      summary: "We could not reach GitHub, so this check did not run. This does not count against the vendor.",
      evidence_url: searchUrl,
      confidence: null,
      retrieved_at,
      data: null,
    };
  }
}
