# State Business-Registry Coverage Map

**Verified by live query on August 28, 2026.** This map records, for all 50 states plus the District of Columbia, whether the AI Vendor Diligence Wizard can search the state's business registry automatically, and if not, why not. It is the factual basis for the "coverage limited" behavior described in [the methodology](./methodology.md) (check D1.1 and Section 10).

## The policy

1. **We honor no-automation terms.** Where a state's registry prohibits automated searches in its terms of service, the tool will never search it by automation, in any version. This is a commitment, not a temporary gap. The same applies in practice to registries behind CAPTCHA walls: a CAPTCHA is a request not to automate, and we treat it that way.
2. **Unreachable never counts against a vendor.** When we cannot search a registry, the check reports "coverage limited" and hands you a manual check card with a direct link to the state's official search. That outcome is a limitation of the state's website. It is never evidence of anything about the vendor, and it can never contribute to an adverse finding or a verdict tier.
3. **Federal first, then the wide net.** Before any state lookup, the tool queries SEC EDGAR full-text search: nearly every venture-funded company has filed a Form D there, which proves the company exists and names its state of incorporation, regardless of where it operates. The tool then sweeps all of the open-data states in parallel (five today; Florida joins when its bulk-data mirror ships), whatever state the vendor claims as home, because government-technology vendors often register first in their customers' states rather than their own. Any hit anywhere proves legal existence.
4. **Registration lapses are not alarms.** Statuses like "noncompliant" or "annual report past due" are common at young companies. They are reported as informational notes, never styled as findings.
5. **Delaware, specifically.** Delaware is the incorporation state for most venture-backed companies, and its registry prohibits automated access. We can never check Delaware automatically. The manual card links Delaware's free search at [icis.corp.delaware.gov](https://icis.corp.delaware.gov/ecorp/entitysearch/NameSearch.aspx) and notes that an official status document costs $10 at [corp.delaware.gov/onlinestatus](https://corp.delaware.gov/onlinestatus/). EDGAR usually corroborates Delaware incorporation federally, which is why the Form D check runs first.

## Status definitions

- **automated**: the tool queries this registry directly through a free public dataset or API. Results can support definitive findings.
- **manual-card**: the tool cannot search this registry by automation (CAPTCHA, bot blocking, or a JavaScript-only portal). The report gives you a direct link and a 2-minute routine. Never adverse.
- **prohibited-by-terms**: the registry's own terms forbid automated searching. We honor that permanently. Never adverse.

## The map (50 states + DC)

| State | Lane | Status |
|---|---|---|
| Alabama | Official SoS search (free, form-based) | manual-card |
| Alaska | Corporations database download reported free; could not be verified (site blocks automated fetch). Candidate for automation | manual-card |
| Arizona | Portal is a JavaScript-only app (arizonabusinesscenter.azcc.gov) | manual-card |
| Arkansas | Search endpoint rejects automated clients | manual-card |
| California | Portal is a JavaScript-only app (bizfileonline.sos.ca.gov); no official API or free bulk data | manual-card |
| Colorado | Open data: data.colorado.gov dataset 4ykn-tg5h (official CDOS data) | **automated** |
| Connecticut | Open data: data.ct.gov dataset n7gp-d28j (full registry mirror from the Secretary of the State) | **automated** |
| Delaware | Free search exists, but terms prohibit automated tools and data mining | **prohibited-by-terms** |
| District of Columbia | Portal (boss.dc.gov) is a JavaScript app; login historically required | manual-card |
| Florida | Sunbiz publishes free daily bulk data files; an automated mirror is planned. Until it ships, the report links the Sunbiz search directly | manual-card (automation planned) |
| Georgia | Site blocks automated fetch (ecorp.sos.ga.gov) | manual-card |
| Hawaii | New portal blocks automated fetch; no bulk dataset on the state open data portal | manual-card |
| Idaho | Portal is a JavaScript-only app (sosbiz.idaho.gov) | manual-card |
| Illinois | Site blocks automated fetch (apps.ilsos.gov) | manual-card |
| Indiana | Portal is a JavaScript-only app (bsd.sos.in.gov) | manual-card |
| Iowa | Site blocks automated fetch | manual-card |
| Kansas | Site blocks automated fetch (sos.ks.gov) | manual-card |
| Kentucky | Official SoS search (free, form-based) | manual-card |
| Louisiana | Search requires CAPTCHA (coraweb.sos.la.gov) | manual-card |
| Maine | Search requires CAPTCHA and terms warn against automated tools | **prohibited-by-terms** |
| Maryland | Business Express search (free, form-based) | manual-card |
| Massachusetts | Form-based search (corp.sec.state.ma.us); served empty pages to automated fetch | manual-card |
| Michigan | Site blocks automated fetch (mibusinessregistry.lara.state.mi.us) | manual-card |
| Minnesota | Free form search; bulk data is paid | manual-card |
| Mississippi | Site blocks automated fetch (corp.sos.ms.gov) | manual-card |
| Missouri | Site blocks automated fetch (bsd.sos.mo.gov) | manual-card |
| Montana | Site blocks automated fetch (biz.sosmt.gov) | manual-card |
| Nebraska | Search requires CAPTCHA; paid batch records exist ($15 per 1,000) | manual-card |
| Nevada | Active bot-detection interstitial (esos.nv.gov) | manual-card |
| New Hampshire | Site blocks automated fetch (quickstart.sos.nh.gov) | manual-card |
| New Jersey | Free form search, no CAPTCHA observed (njportal.com) | manual-card |
| New Mexico | Portal is a JavaScript-only app (enterprise.sos.nm.gov) | manual-card |
| New York | Open data: data.ny.gov dataset n9v6-gdp6 (Active Corporations, DOS) | **automated** |
| North Carolina | Free search, but terms prohibit automated or scripted searches; bulk is paid | **prohibited-by-terms** |
| North Dakota | Portal is a JavaScript-only app (firststop.sos.nd.gov) | manual-card |
| Ohio | Free business-data extracts reported; could not be verified (site blocks automated fetch). Candidate for automation | manual-card |
| Oklahoma | Site rejects automated clients at the connection level | manual-card |
| Oregon | Open data: data.oregon.gov dataset tckn-sxa6 (Active Businesses) | **automated** |
| Pennsylvania | Site blocks automated fetch; the state's only open dataset is county-level counts, not entities | manual-card |
| Rhode Island | Free form search (business.sos.ri.gov) | manual-card |
| South Carolina | Search requires CAPTCHA (businessfilings.sc.gov) | manual-card |
| South Dakota | Free form search; full-database download is paid | manual-card |
| Tennessee | Site returned a payment-required response to automated fetch | manual-card |
| Texas | Comptroller franchise-tax data: free search, documented public API, and open data (data.texas.gov dataset 9cir-efmm, includes SOS file numbers). Covers every entity lawfully doing business in Texas | **automated** |
| Utah | Site blocks automated fetch (businessregistration.utah.gov) | manual-card |
| Vermont | Portal is a JavaScript-only app; no dataset on the state open data portal | manual-card |
| Virginia | Portal is a JavaScript-only app (cis.scc.virginia.gov); no bulk or API found | manual-card |
| Washington | Portal is a JavaScript-only app (ccfs.sos.wa.gov); no SoS dataset on data.wa.gov | manual-card |
| West Virginia | Free search app, no CAPTCHA observed | manual-card |
| Wisconsin | Free search; fees for copies | manual-card |
| Wyoming | Search requires an image CAPTCHA (wyobiz.wyo.gov) | manual-card |

**Coverage math:** 5 of 51 jurisdictions are automated today (New York, Colorado, Connecticut, Oregon, Texas). Florida's free bulk data makes it the next automation, and Alaska and Ohio are candidates if their reported bulk downloads verify. Effective coverage for existence checks is much higher than 5 of 51, because SEC EDGAR covers venture-funded companies in every state, and because the multi-state sweep catches foreign registrations that vendors file in their customers' states.

## Keeping this map current

State portals migrate and policies change. Each row above was verified by a live query on the date at the top of this page. If a state opens a new dataset, drops a CAPTCHA, or changes its terms, please open an issue or pull request in the repository with a link; promoting a state from manual-card to automated is one of the highest-value contributions this project can receive. For the human-facing deep links used on manual cards, we track the current portal for every jurisdiction against a maintained public directory of state business search pages.
