/*
  D1.7 — Email/DNS hygiene: does the vendor's domain actually receive email,
  and does it publish SPF and DMARC records? Also notes when the pitch was
  sent from a different domain than the company website.

  Uses DNS-over-HTTPS (Cloudflare, application/dns-json). MX presence is the
  status driver; SPF/DMARC are recorded as facts. Severity is applied
  downstream, not here.

  Pure module: no Deno APIs, no module-level state. Never throws.
*/
import type { RegistryCheck } from "../schemas.ts";

export interface RegistryCtx {
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
  apiKeys?: Record<string, string>;
  now?: () => Date;
}

const CHECK_ID = "dns_email_hygiene";
const SOURCE = "DNS records (Cloudflare DNS over HTTPS)";

/* DNS RR type codes and rcodes we care about. */
const TYPE_MX = 15;
const TYPE_TXT = 16;
const RCODE_NOERROR = 0;
const RCODE_NXDOMAIN = 3;

/* Common two-part public suffixes for the simple registrable-domain
   heuristic (not a full PSL — good enough to compare sender vs. site). */
const TWO_PART_SUFFIX = new Set(["co", "com", "net", "org", "gov", "edu", "ac", "gc"]);

interface DohAnswer {
  name?: string;
  type?: number;
  data?: string;
}

interface DohResponse {
  Status?: number;
  Answer?: DohAnswer[];
}

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
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

/* Simple registrable-domain heuristic: last two labels, or last three when
   the second-to-last label is a common two-part suffix (co.uk, com.au...). */
export function registrableDomain(raw: string): string {
  const parts = cleanDomain(raw).split(".").filter((p) => p.length > 0);
  if (parts.length <= 2) return parts.join(".");
  const secondToLast = parts[parts.length - 2];
  const take = TWO_PART_SUFFIX.has(secondToLast) ? 3 : 2;
  return parts.slice(-take).join(".");
}

async function dohQuery(
  fetchFn: typeof fetch,
  name: string,
  type: "MX" | "TXT",
  signal?: AbortSignal,
): Promise<DohResponse> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetchFn(url, {
    signal,
    headers: { accept: "application/dns-json" },
  });
  if (!res.ok) throw new Error(`DNS query returned HTTP ${res.status}`);
  return (await res.json()) as DohResponse;
}

/* TXT record data arrives quoted, sometimes in concatenated chunks. */
function unquoteTxt(data: string): string {
  return data.replace(/"/g, "").trim();
}

export async function checkEmailHygiene(
  args: { domain: string; senderDomain: string | null },
  ctx: RegistryCtx = {},
): Promise<RegistryCheck> {
  const retrieved_at = nowIso(ctx);
  const domain = cleanDomain(args.domain);
  const humanUrl = `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${encodeURIComponent(domain)}`;
  const fetchFn = resolveFetch(ctx);

  try {
    /* MX drives the status; a failure here fails the whole check. */
    const mxResp = await dohQuery(fetchFn, domain, "MX", ctx.signal);
    const mxRecords = (mxResp.Answer ?? [])
      .filter((a) => a.type === TYPE_MX && typeof a.data === "string")
      .map((a) => (a.data as string).trim());

    /* SPF and DMARC are best-effort facts; a lookup failure leaves null. */
    let spfRecord: string | null = null;
    let spfChecked = false;
    try {
      const txtResp = await dohQuery(fetchFn, domain, "TXT", ctx.signal);
      spfChecked = true;
      for (const a of txtResp.Answer ?? []) {
        if (a.type !== TYPE_TXT || typeof a.data !== "string") continue;
        const value = unquoteTxt(a.data);
        if (value.toLowerCase().startsWith("v=spf1")) {
          spfRecord = value;
          break;
        }
      }
    } catch {
      spfChecked = false;
    }

    let dmarcRecord: string | null = null;
    let dmarcChecked = false;
    try {
      const dmarcResp = await dohQuery(fetchFn, `_dmarc.${domain}`, "TXT", ctx.signal);
      dmarcChecked = true;
      for (const a of dmarcResp.Answer ?? []) {
        if (a.type !== TYPE_TXT || typeof a.data !== "string") continue;
        const value = unquoteTxt(a.data);
        if (value.toLowerCase().startsWith("v=dmarc1")) {
          dmarcRecord = value;
          break;
        }
      }
    } catch {
      dmarcChecked = false;
    }

    const senderRegistrable = args.senderDomain ? registrableDomain(args.senderDomain) : null;
    const siteRegistrable = registrableDomain(domain);
    const senderDiffers = senderRegistrable !== null && senderRegistrable !== siteRegistrable;

    const senderNote = senderDiffers
      ? ` Note: the pitch email came from ${senderRegistrable}, which is a different domain than ${domain}.`
      : "";

    const data = {
      has_mx: mxRecords.length > 0,
      mx_records: mxRecords,
      has_spf: spfRecord !== null,
      spf_record: spfRecord,
      spf_checked: spfChecked,
      has_dmarc: dmarcRecord !== null,
      dmarc_record: dmarcRecord,
      dmarc_checked: dmarcChecked,
      sender_domain: args.senderDomain,
      sender_registrable: senderRegistrable,
      site_registrable: siteRegistrable,
      sender_domain_differs: senderDiffers,
      mx_rcode: mxResp.Status ?? null,
    };

    if (mxRecords.length > 0) {
      let hygiene: string;
      if (spfRecord && dmarcRecord) {
        hygiene = " It also publishes SPF and DMARC records, standard email security settings for an established company.";
      } else if (spfRecord) {
        hygiene = " It publishes an SPF record but we did not find a DMARC record, a common email security setting.";
      } else if (spfChecked && dmarcChecked) {
        hygiene = " We did not find SPF or DMARC records, email security settings most established companies use.";
      } else {
        hygiene = " We could not fully check its SPF and DMARC email security settings.";
      }
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "hit",
        summary: `The domain ${domain} is set up to receive email.${hygiene}${senderNote}`,
        evidence_url: humanUrl,
        confidence: "exact",
        retrieved_at,
        data,
      };
    }

    const rcode = mxResp.Status;
    if (rcode === RCODE_NOERROR || rcode === RCODE_NXDOMAIN) {
      return {
        check_id: CHECK_ID,
        source: SOURCE,
        status: "definitive_miss",
        summary: `We found no mail servers for ${domain}. A company using this domain for email would normally have them.${senderNote}`,
        evidence_url: humanUrl,
        confidence: null,
        retrieved_at,
        data,
      };
    }

    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "coverage_limited",
      summary: `The DNS lookup for ${domain} did not return a usable answer, so we could not check its email setup.`,
      evidence_url: humanUrl,
      confidence: null,
      retrieved_at,
      data,
    };
  } catch {
    return {
      check_id: CHECK_ID,
      source: SOURCE,
      status: "error",
      summary: `We could not reach the DNS lookup service, so we could not check this domain's email setup. This does not count against the vendor.`,
      evidence_url: humanUrl,
      confidence: null,
      retrieved_at,
      data: null,
    };
  }
}
