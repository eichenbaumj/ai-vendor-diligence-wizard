# 50-State Business-Registry Verification Feasibility Map (as of Aug 28, 2026)

**Research method note:** Every claim below labeled *verified* was confirmed by live fetch/API call on 2026-08-28. Claims labeled *reported* could not be re-verified today (usually because the state's site blocks automated fetchers — which is itself a finding). Where a portal returned 403/402/CAPTCHA to a well-behaved automated fetcher, that is exactly what the wizard's own backend or LLM agent would experience.

---

## 1. The headline finding: the worked example proves the spec's failure mode is real

**Polimorphic, Inc.** — a real, VC-backed AI govtech vendor (AI chat/voice for local government, exactly the profile that pitches benefits agencies) — is a Delaware C-corp. Here is what each registry lane returned today:

| Source | Result | Evidence |
|---|---|---|
| **SEC EDGAR full-text search** (free, federal) | ✅ **HIT.** "Polimorphic, Inc. (CIK 0001880550)," **two Form D filings** (2021-09-03, file 021-412351; 2025-06-09, file 021-548405), `inc_states: ["DE"]`, principal place of business "Trabuco Canyon, CA" | Live query to https://efts.sec.gov/LATEST/search-index?q=%22Polimorphic%22&forms=D with declared User-Agent |
| **Colorado open data** (free SODA API) | ✅ **HIT.** "POLIMORPHIC, INC.", entity ID 20241401282, foreign (DE-formed) profit corp, principal address 122 W 26th St Rm 1104, New York NY, registered 2024-04-08, status **"Noncompliant"** | https://data.colorado.gov/resource/4ykn-tg5h.json?$q=polimorphic |
| **Connecticut open data** (free SODA API) | ✅ **HIT.** "Polimorphic, Inc.", Delaware stock corporation, same NYC address, registered 2024-11-14, **"Active — annual report past due"** | https://data.ct.gov/resource/n7gp-d28j.json?$q=polimorphic |
| **New York open data — its HQ state** (free SODA API) | ❌ **NO RECORD.** Both `$q=polimorphic` and `$where=current_entity_name like '%POLIMORPHIC%'` return empty on the NY DOS Active Corporations dataset — which is demonstrably current (it contains ANTHROPIC, PBC, DOS ID 6565058, filed 2022-08-16, and domestic entities filed Oct 2024) | https://data.ny.gov/resource/n9v6-gdp6.json?$q=polimorphic |
| **Delaware — its incorporation state** | ⚠️ **NOT AUTOMATABLE.** Free ICIS name search exists but its page states "Use of automated tools in any form may result in the suspension of your access" and prohibits "mining data" | https://icis.corp.delaware.gov/ecorp/entitysearch/NameSearch.aspx |
| **GLEIF LEI API** (free) | ❌ Empty (expected — startups rarely hold LEIs) | https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=Polimorphic |
| **OpenCorporates public website** | ⚠️ **CAPTCHA-gated** ("verify you are human") | https://opencorporates.com/companies?q=polimorphic |

**Implications:** (1) Under the current spec — "no registration under any disclosed name after LLM search of the HQ state's SoS → CRITICAL" — Polimorphic, a legitimate funded vendor, gets the tool's harshest output, because a NYC-HQ'd Delaware corp had (as of the dataset's refresh) simply not registered as a foreign corp with NY DOS. (2) The registrations that DO exist are in **customer states** (CO, CT) — for govtech vendors, foreign registrations accumulate where their government customers are, often before the HQ state. (3) The strongest single free identity signal for the modal pitch profile (VC-backed startup) is **federal, not state**: any company that raised a Reg D round has a Form D on EDGAR, and the filing itself declares the state of incorporation. (4) Benign statuses like "Noncompliant"/"annual report past due" are common at young companies and must not be styled as red-alarm findings. (5) Name matching has SPV noise: the Texas Comptroller file contains eight entities named "AUGMENT COLLECTIVE, LLC SERIES ANTHROPIC PBC N" (investment SPVs) alongside the real "ANTHROPIC, PBC" — exact-legal-name discipline is required.

Secondary worked example (established vendor): **Anthropic, PBC** — NY DOS foreign business corp DOS ID 6565058 (filed 2022-08-16, via n9v6-gdp6); Texas Comptroller taxpayer 32092109902 with **TX SOS file number 0805470362** (chartered 2024-03-19) via https://data.texas.gov/resource/9cir-efmm.json?$q=anthropic. Established vendors light up multiple states; that asymmetry is itself a triage signal.

---

## 2. State-by-state feasibility map (50 states + DC)

Categories: **(a)** free public API / bulk open data; **(b)** free web search usable without CAPTCHA (form-based; simple automation plausible but not deterministic); **(c)** CAPTCHA/bot-blocked/SPA-only — an LLM fetch agent cannot reliably traverse; **(d)** paid-only for programmatic/bulk access.

### Tier A — free, deterministic, API-grade (6 verified jurisdictions)

| State | Category | Details (all verified by live query today) |
|---|---|---|
| **New York** | (a) | data.ny.gov Socrata: "Active Corporations: Beginning 1800" ([n9v6-gdp6](https://data.ny.gov/resource/n9v6-gdp6.json)) — entity-level, fields incl. `current_entity_name`, `dos_id`, `initial_dos_filing_date`, `jurisdiction`, `entity_type`, DOS process (agent) name/address; current (contains 2024 filings). Companions: All Filings ([63wc-4exh](https://data.ny.gov/resource/63wc-4exh.json) — filing events only, no name field), Name Status History (ekwr-p59j), Addresses (2tms-hftb), **Daily Corporation Filing Data** (k4vb-judh). |
| **Colorado** | (a) | data.colorado.gov Socrata: "Business Entities in Colorado" ([4ykn-tg5h](https://data.colorado.gov/resource/4ykn-tg5h.json)) — CDOS official, since 1864; incl. status, jurisdiction of formation, entity type, principal address. Companions: Transaction History (casm-dbbj), True Name (qpft-q492). |
| **Connecticut** | (a) | data.ct.gov Socrata: "CT Business Registry — Business Master" ([n7gp-d28j](https://data.ct.gov/resource/n7gp-d28j.json)) plus Agents (qh2m-n44y), Principals (ka36-64k6), Filing History (ah3s-bes7), Name Changes (enwv-52we) — a full relational registry mirror from the Secretary of the State. |
| **Florida** | (a) | Sunbiz **free bulk SFTP**: host https://sftp.floridados.gov, username `Public`, password `PubAccess1845!` (publicly documented at https://dos.fl.gov/sunbiz/other-services/data-downloads/): daily delta files + quarterly full extracts of all active entities. Note: the web search (search.sunbiz.org GET URLs) returned 403 to my automated fetcher — the SFTP mirror is the reliable lane. |
| **Oregon** | (a) | data.oregon.gov Socrata: "Active Businesses — ALL" ([tckn-sxa6](https://data.oregon.gov/resource/tckn-sxa6.json)) — registry number, business name, entity type, addresses, plus a per-record deep link into the legacy GET-URL search at egov.sos.state.or.us. Also Active Nonprofits (8kyv-b2kw). |
| **Texas** | (a)* | Via the **Comptroller**, not the SoS: free [Franchise Tax Account Status search](https://comptroller.texas.gov/taxes/franchise/account-status/search) (search by name, 11-digit taxpayer number, 9-digit EIN, or SOS file number; no CAPTCHA) with a **documented free public API** (https://api-doc.comptroller.texas.gov/public-data/), plus Socrata bulk "Active Franchise Taxpayers" ([9cir-efmm](https://data.texas.gov/resource/9cir-efmm.json)) which includes SOS charter/file numbers, and "Texas Tax-Exempt Entities" (8gur-z4cy). Covers every entity with Texas franchise-tax nexus (i.e., anyone lawfully doing business in TX). The SoS's own SOSDirect remains pay-per-search (reported ~$1.00/search; unverified today). |

Socrata mechanics (verified): both `$q=` full-text and `$where=upper(col) like '%NAME%'` work; app tokens are free to register and remove throttling — "we do not throttle API requests that are using an application token unless… abusive" (https://dev.socrata.com/docs/app-tokens.html).

### Tier A-possible — reported free bulk, could not verify today (sites block bots)

| State | Status |
|---|---|
| **Alaska** | Corporations database download reported free at https://www.commerce.alaska.gov/cbp/main/search/entities; the download page 403'd my fetcher. **Unverified.** |
| **Ohio** | Free business-data extracts reported at ohiosos.gov; both https://www.ohiosos.gov/businesses/business-data/ and https://businesssearch.ohiosos.gov/ returned 403 to automated fetch. **Unverified.** |

### Tier B — free searchable, no CAPTCHA observed, but form/POST-based (not deterministic for an LLM fetch agent; usable for a human via deep link)

- **New Jersey** — free HTML form, wildcard search, no CAPTCHA (https://www.njportal.com/DOR/BusinessNameSearch/Search/BusinessName, Treasury/DORES) — verified.
- **Maryland** — Business Express entity search, free, searchable by name/Dept ID/EIN (https://egov.maryland.gov/BusinessExpress/EntitySearch) — verified.
- **Minnesota** — free form search (name/file number), no CAPTCHA; paid "online subscriptions" for bulk (https://mblsportal.sos.mn.gov/Business/Search) — verified.
- **Alabama** — free search, current through 08/26/2026, rich filters (https://arc-sos.state.al.us/cgi/corpname.mbr/input) — verified.
- **Rhode Island** — free form, searchable by name/agent/address/NAICS (https://business.sos.ri.gov/CorpWeb/CorpSearch/CorpSearch.aspx) — verified.
- **Kentucky** — free ASP.NET postback search (https://sosbes.sos.ky.gov/BusSearchNProfile/search.aspx) — verified.
- **West Virginia** — free JS search app, no CAPTCHA; $10 certificates (https://apps.wv.gov/SOS/BusinessEntitySearch/) — verified.
- **South Dakota** — free POST search; **paid full-database download** offered (https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx) — verified.
- **Wisconsin** — free search; fees for copies (https://apps.dfi.wi.gov/apps/corpsearch/search.aspx) — verified.
- **Massachusetts** — classic ASP.NET POST search (VIEWSTATE), free; served empty content to my fetcher (https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx) — partially verified.
- **Delaware** — free ICIS name search returns entity name, file number, incorporation/formation date, registered agent name/address/phone for active AND inactive entities; **but explicit ToS: no data mining, no automated tools** (verified). Paid: $10 online status, $20 status+tax+filing history (https://corp.delaware.gov/onlinestatus/, verified), $50 short-form / $175 long-form certificates of good standing. **No API, no bulk data — this is the Delaware opacity problem: the registry of record for most venture-backed AI vendors is legally off-limits to automation.**

### Tier C — CAPTCHA, bot-blocked, or SPA-only (an automated agent cannot reliably search; verified today unless noted)

- **CAPTCHA required to search:** Wyoming (image CAPTCHA gate, wyobiz.wyo.gov), Maine (reCAPTCHA + "automated tools may result in suspension," apps3.web.maine.gov ICRS), Louisiana (reCAPTCHA, coraweb.sos.la.gov), South Carolina (CAPTCHA before search, businessfilings.sc.gov), Nebraska (reCAPTCHA; oddly also the cheapest paid bulk in America: **batch records $15 per 1,000**, images $0.45/page — nebraska.gov corpsearch.cgi).
- **Hard bot-blocks (403/402/405/TLS to automated fetch):** Georgia (ecorp.sos.ga.gov), Pennsylvania (file.dos.pa.gov; PA's only open dataset is county-level **counts**, data.pa.gov xvd7-5r2c — not entity-level), Illinois (apps.ilsos.gov), Iowa (sos.iowa.gov and even data.iowa.gov's catalog API), Kansas (sos.ks.gov), Mississippi (corp.sos.ms.gov), Michigan (mibusinessregistry.lara.state.mi.us), Missouri (bsd.sos.mo.gov), Montana (biz.sosmt.gov), Utah (businessregistration.utah.gov), New Hampshire (quickstart.sos.nh.gov), Hawaii (new portal hbe.dcca.hawaii.gov; opendata.hawaii.gov lists only a link-out, no bulk), Tennessee (tncab.tnsos.gov returned HTTP 402), Arkansas (sos-corp-search.ark.org returned 405), Oklahoma (TLS handshake failure for automated client), Nevada (active bot-detection interstitial, esos.nv.gov).
- **JS single-page apps that return empty shells to fetchers (headless browser required; no CAPTCHA observed):** **California** (bizfileonline.sos.ca.gov — the largest AI-vendor HQ state has no official API and no free bulk), **Washington** (ccfs.sos.wa.gov; data.wa.gov has **no** SoS dataset — verified absence; DOR's separate "Business Lookup" license/excise dataset is a partial corroboration source, catalog.data.gov), **Virginia** (cis.scc.virginia.gov; no bulk/API found on scc.virginia.gov/businesses), Arizona (arizonabusinesscenter.azcc.gov), Idaho (sosbiz.idaho.gov), North Dakota (firststop.sos.nd.gov), New Mexico (enterprise.sos.nm.gov), Vermont (bizfilings.vermont.gov; no dataset on data.vermont.gov — verified absence), Indiana (bsd.sos.in.gov), **DC** (CorpOnline now redirects to boss.dc.gov, a JS app; Access DC login historically required to search — login status unverified today), Connecticut's portal (service.ct.gov — irrelevant since CT has full open data).

### Tier D — free search but automation contractually prohibited / bulk paid-only

- **North Carolina** — free interactive search, but "Automated or scripted searches… are not permitted"; bulk only via paid Data Subscription Services (https://www.sosnc.gov/divisions/business_registration) — verified.
- **Delaware** (see above), **Maine** (see above) — same contractual posture.

**Bottom line coverage math:** free-and-deterministic today = **6 of 51 jurisdictions (~12%)** (NY, CO, CT, FL, OR, TX), possibly 8 (~16%) if AK/OH bulk downloads check out. Weighted by where AI vendors actually claim HQ, coverage is better than 12% (NY is the #2 AI hub; TX, CO, FL meaningful) but **California — the single largest vendor-HQ state — has no free deterministic lane**, and Delaware — the incorporation state for most of them — prohibits automation outright.

---

## 3. Aggregators and commercial KYB (verified status, Aug 2026)

**OpenCorporates** (verified from https://opencorporates.com/pricing and https://opencorporates.com/terms-of-use-2/):
- Paid API tiers: **Essentials £2,250/yr (500 calls/mo, 200/day)**; Starter £6,600/yr (2,500/mo, 500/day); Basic £12,000/yr (5,000/mo, 1,000/day); Enterprise custom. All paid tiers permit "internal & external use."
- Free "at-scale" access exists for investigative journalists, NGOs, universities, anti-corruption groups ("Permitted Users") via share-alike API keys that require publicly contributing improvements back under open licenses. **Critically, the ToS states "financial institutions, corporations, government departments and regulatory authorities are not Permitted Users"** — a government-audience tool operated by a consultancy sits in a gray zone that would need written confirmation from their public-benefit team.
- Website use is licensed for "personal use only"; scraping is prohibited; and the public site is now **CAPTCHA-gated even for reading** (verified live). Attribution requirement: a hyperlink reading "from OpenCorporates" at ≥70% of the largest relevant font; ODbL share-alike applies.
- Practical verdict: at Essentials, 500 calls/month is roughly 16 evaluations/day — too small for a free public tool's primary lane; viable only as a negotiated public-benefit arrangement or a low-volume fallback (~£0.38–£4.50 per call depending on utilization).

**Middesk** (verified from https://www.middesk.com/ and https://docs.middesk.com/llms.txt): REST/GraphQL KYB API; Business verification includes SoS registrations "across jurisdictions" (drawing on "400+ government and authoritative sources"), TIN/EIN match, watchlists, liens, web presence. **Pricing not published anywhere; sales-quoted only.** Industry-reported per-verification prices are low-single-digit dollars — I am uncertain about this figure and could not verify it.

**Baselayer** (verified from https://baselayer.com/): live KYB product claiming instant verification of "100% of U.S. businesses"; API at docs.baselayer.com; "Startup & Growth Plans" exist but **no public pricing**; demo-gated.

**Cobalt Intelligence** (https://cobaltintelligence.com/): the site **blocks automated fetchers site-wide (403)** and its docs subdomain no longer resolves; pricing and current 50-state real-time claims **could not be verified as of today**. Treat as sales-contact-required; historically marketed a real-time SoS-scraping API across all 50 states (unverified).

**SOS-api.com:** **domain does not resolve (NXDOMAIN)** — apparently defunct as of Aug 2026.

**Free federal/partial alternatives (all verified live today):**
- **SEC EDGAR full-text search** — https://efts.sec.gov/LATEST/search-index?q=%22{name}%22&forms=D (and company search at https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company={name}). Free, deterministic, returns CIK, incorporation state, principal-place-of-business, filing history for **any company that ever filed** — which includes essentially every VC-backed startup (Form D) and every public company. Requires a declared User-Agent per SEC's automated-access policy (https://www.sec.gov/os/accessing-edgar-data; ~10 req/sec fair-use). Empirically: my fetch without a compliant UA got 403; with `User-Agent: Org contact@email` it returned full JSON. Caveat: the Form D business address can be stale (Polimorphic's says Trabuco Canyon, CA; its registrations say NYC) — use EDGAR for **existence and incorporation state**, not current HQ.
- **GLEIF LEI API** — https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]={name}: free, no auth; useful only for larger/financial-sector vendors.
- **SAM.gov Entity Management API** — https://open.gsa.gov/api/entity-api/: free with API key, returns UEI/CAGE/registration status/address; **but non-federal accounts without a role get only 10 requests/day** (1,000/day with role) — a corroboration lane ("has federal contracting registration"), not a primary lane.
- **IRS Tax-Exempt Organization Search + bulk** — https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads: Pub 78, EO BMF, auto-revocation list, 990 filings — free, monthly; covers nonprofit vendors.
- **Deep-link directory for every state's human-facing search:** LLC University maintains a current 50-state + DC + PR list (verified; it reflects 2025-26 portal migrations like AZ's arizonabusinesscenter.azcc.gov, MI's mibusinessregistry.lara.state.mi.us, TN's tncab.tnsos.gov): https://www.llcuniversity.com/50-secretary-of-state-sos-business-entity-search/ — use it (or mirror it) to power the manual-check card.

---

## 4. Design answers

### (1) What fraction of states can be covered free-and-deterministically today?
**~12% of jurisdictions (6/51: NY, CO, CT, FL, OR, TX), up to ~16% if Alaska and Ohio bulk downloads verify.** By vendor-HQ weighting, I estimate (uncertain — this is an inference from AI-industry geography, not measured data) roughly 25–35% of inbound vendors are HQ'd in a deterministic state. **But the effective existence-check coverage is far higher than the state map suggests, because SEC EDGAR Form D covers the modal pitch profile (venture-funded startup) regardless of HQ state, and it names the incorporation state.** The correct architecture is therefore: EDGAR first, then a cheap "wide net" across all six open-data states in parallel (six free GET calls; any hit anywhere proves legal existence — Polimorphic was invisible in its HQ state but present in two customer states).

### (2) Correct lookup order for a Delaware-incorporated, foreign-registered vendor
1. **SEC EDGAR** (FTS + company search): existence, CIK, `inc_states`, filing history. If Form D exists with `inc_states: DE`, Delaware incorporation is federally corroborated **without touching Delaware**.
2. **Six-state open-data sweep in parallel** (NY, CO, CT, FL-mirror, OR, TX-Comptroller): free, deterministic; any foreign registration = proof of legal existence + registered-agent data. For govtech vendors specifically, sweep these regardless of claimed HQ — customer-state registrations are often the earliest.
3. **HQ state**: if it's a Tier-A state, the sweep already covered it; if Tier B/C/D, emit a **manual-check deep link** (from the 50-state directory) rather than attempting an LLM traversal.
4. **Delaware itself**: never automate (ToS); emit the ICIS deep link for the human, note the $10 official status option, and rely on EDGAR corroboration. Searching "home state only" is wrong in both directions: Delaware alone misses the operating footprint; HQ state alone (the current spec) misses Delaware entities that haven't foreign-registered at HQ — the exact Polimorphic case.
5. **Paid KYB fallback** (optional, operator-budgeted): only when steps 1–4 all return nothing AND the evaluation would otherwise emit a registration-related finding.

### (3) Output when the registry is unreachable / coverage is paid-only — and the rule change

**Rule change (replaces Check 1.1's deterministic trigger):**
> "No registration found" may fire as a CRITICAL finding **only when a definitive search actually ran and definitively returned empty**, meaning: (i) a deterministic source (Tier-A dataset/API or EDGAR) was queried successfully with both exact and fuzzy name variants, **and** (ii) the state queried is one where the vendor affirmatively claims domestic incorporation or registration (e.g., pitch says "a New York corporation" and the NY dataset has no such entity), **or** the source returned affirmative negative evidence (revoked, dissolved, administratively terminated — and even then, distinguish 'annual report past due'-class lapses, which are common at young firms, from termination). Absence of a foreign registration in the HQ state is **never** a CRITICAL on its own. If the registry for the relevant state is Tier B/C/D (unreachable, CAPTCHA-gated, automation-prohibited, or paid-only), the identity check emits a **coverage-limited manual-check card**, not a finding, and the Tier-1 gate is evaluated on the checks that did run. A silent error in any registry call must surface as coverage-limited, never as 'not found.'

**Draft coverage-limited card language:**
> **Registration check: coverage limited — needs a 2-minute manual look.**
> We could not run an automatic registry search for **[State]** — its Secretary of State search cannot be queried by automated tools [reason chip: requires CAPTCHA / blocks automated access / prohibits automated searches in its terms / paid access only]. This is a limitation of the state's website, **not evidence of anything about the vendor.**
> What we did check: [e.g., ✅ SEC EDGAR: Form D on file, incorporated in Delaware (2025) · ✅ Colorado: registered foreign corporation since 2024 · — New York: no automatic search available].
> **Do this before responding to the vendor:** open [State]'s official business search → **[deep link]** ← and search for "[legal name]" and "[disclosed name variants]." A registration typically shows the entity name, file number, formation date, status, and registered agent. If nothing appears under any name the vendor has disclosed, ask the vendor directly for their **state of incorporation and entity file number** — a legitimate vendor answers this in one email.
> *Delaware note (when applicable):* Delaware's registry prohibits automated searches, so we can never check it for you. The free search at icis.corp.delaware.gov shows basic details; an official status costs $10 at corp.delaware.gov/onlinestatus.

Also honor the contractual no-automation states (DE, ME, NC verified; treat NE/WY CAPTCHA walls as equivalent): the tool should *by policy* never scrape them, and the coverage map in the tool's methodology page should say so — that's a trust feature for a public-sector audience, not a weakness.

### (4) Realistic per-evaluation cost with a paid KYB API as fallback only
Verified price anchors: OpenCorporates Essentials £2,250/yr ≈ **£0.38–£4.50/call** depending on utilization (500 calls/mo cap); Delaware official status **$10/entity**; Nebraska batch records **$15/1,000**; NC/SD/MN paid subscriptions unpriced publicly; Middesk/Baselayer/Cobalt **sales-quoted, unpublished** (industry-reported $1–$10 per verification — unverified, treat as a planning range, not a fact). Model: if EDGAR + the six-state sweep resolves existence for 65–85% of evaluations (my estimate — uncertain; VC-backed vendors nearly always have a Form D), the paid fallback fires on ~15–35%. At an assumed $1–$5/lookup, expected cost ≈ **$0.15–$1.75 per evaluation** (~$150–$1,750/month at 1,000 evaluations) — or **$0** if the fallback is replaced by the manual-check card, which is the correct default for a free tool. The hard ceiling for a definitive answer on any Delaware entity is $10 (official status document). Recommendation: ship v1 with zero paid dependencies (EDGAR + 6-state sweep + deep-link cards); add a paid fallback later only if operators fund it, and never let its absence produce a harsher output than "coverage limited."

---

## 5. Implementation notes for the six deterministic lanes
- Query pattern (all verified): `https://data.{ny,colorado,ct,oregon,texas}.gov/resource/{id}.json?$q={name}` **plus** a `$where=upper(name_col) like '%NAME%'` pass (belt and suspenders — `$q` is full-text, `like` catches punctuation variants). Register free Socrata app tokens per domain to avoid IP throttling (https://dev.socrata.com/docs/app-tokens.html).
- Florida requires a nightly SFTP mirror job (files, not a query API) — budget one small worker + storage.
- EDGAR requires a compliant `User-Agent: OrgName contact@email` header and ≤10 req/s; without it you get 403 (empirically confirmed).
- Normalize names before matching (strip Inc./LLC/commas; uppercase); flag SPV-pattern matches ("SERIES", "FUND", "SPV" in name) as non-matches for identity purposes.
- Log per-lane outcome as one of {hit, definitive-miss, coverage-limited, error} — the Tier-1 gate may only consume hits and definitive-misses.