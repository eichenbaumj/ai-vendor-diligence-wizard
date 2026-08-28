# Per-Evaluation Cost Model — AI Vendor Diligence Wizard (Anthropic API, August 2026)

All prices verified against live Anthropic documentation on 2026-08-28. Every dollar figure below traces to a cited URL. Where the docs do not publish a number (per-search result token loads, server-loop iteration counts), the assumption is labeled **estimate** — I am explicit below about which numbers are documented and which are modeled.

---

## 1. Verified pricing inputs (the ground truth layer)

### 1.1 Model rates — [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)

| Model (exact API ID) | Base input | 5m cache write | 1h cache write | Cache read | Output |
|---|---|---|---|---|---|
| Claude Sonnet 5 (`claude-sonnet-5`) | $2.00/MTok | $2.50/MTok | $4.00/MTok | $0.20/MTok | $10.00/MTok |
| Claude Haiku 4.5 (`claude-haiku-4-5-20251001`, alias `claude-haiku-4-5`) | $1.00/MTok | $1.25/MTok | $2.00/MTok | $0.10/MTok | $5.00/MTok |
| Claude Opus 5 (`claude-opus-5`) — reference only | $5.00/MTok | $6.25/MTok | $10.00/MTok | $0.50/MTok | $25.00/MTok |

Two pricing facts that de-risk the model:

- **Sonnet 5's $2/$10 is now permanent.** The pricing page states the introductory price "is now the standard price. The previously scheduled increase to $3/$15 per million input/output tokens on September 1, 2026 will not occur" ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)). No budget cliff four days from now.
- **No long-context surcharge.** "Claude 4.6 and later models include the full 1M token context window at standard pricing. (A 900k-token request is billed at the same per-token rate as a 9k-token request.)" ([pricing — long context](https://platform.claude.com/docs/en/about-claude/pricing)). S3's context can exceed 200K on Sonnet 5 without a premium tier kicking in.

Model specs relevant to stage design ([models overview](https://platform.claude.com/docs/en/models/overview)): Sonnet 5 — 1M context, 128K max output, adaptive thinking, `effort` parameter (default `high`). Haiku 4.5 — **200K context**, 64K max output, no `effort` parameter, retirement commitment "not sooner than October 15, 2026" (i.e., a Haiku successor/migration is plausible within the tool's first year — budget a migration re-baseline).

### 1.2 Tool fees

- **Web search: $10 per 1,000 searches ($0.01/search)**, "plus standard token costs for search-generated content. Web search results retrieved throughout a conversation are counted as input tokens, in search iterations executed during a single turn and in subsequent conversation turns." Errored searches are not billed. ([web search tool — usage and pricing](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool); same text on [pricing](https://platform.claude.com/docs/en/about-claude/pricing))
- **Web fetch: no per-fetch fee — token costs only.** "The web fetch tool is available on the Claude API at no additional cost." Documented token yardsticks: average web page (10 kB) ≈ 2,500 tokens; large documentation page (100 kB) ≈ 25,000 tokens; research-paper PDF (500 kB) ≈ 125,000 tokens. `max_content_tokens` truncates fetched text (approximate cap). Failed fetches count against `max_uses` but cost ~nothing in tokens. ([web fetch tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool))
- **Code execution is free when used with web search/fetch dynamic filtering.** "When `web_search_20260209` (or later) or `web_fetch_20260209` (or later) is included in your API request, there are no additional charges for code execution tool calls beyond the standard input and output token costs." Standalone code execution: 1,550 free hours/org/month, then $0.05/container-hour — irrelevant to this pipeline. ([pricing — code execution](https://platform.claude.com/docs/en/about-claude/pricing); confirmed in [release notes](https://platform.claude.com/docs/en/release-notes/overview), Feb 9, 2026 entry)
- **Tool-use system prompt overhead** (auto-added when any tool is present): Sonnet 5 = 354 tokens, Haiku 4.5 = 496 tokens at `tool_choice: auto` ([pricing — tool use](https://platform.claude.com/docs/en/about-claude/pricing)). Included in the S3 base-context estimate.

### 1.3 Caching and batch mechanics

- Cache multipliers: 5-min write 1.25×, 1-hour write 2×, read 0.1× of base input; multipliers stack with the batch discount ([pricing — prompt caching](https://platform.claude.com/docs/en/about-claude/pricing)).
- **Critical design dependency:** minimum cacheable prefix is model-dependent — **4,096 tokens on Haiku 4.5** (512 on Opus 5, 1,024 on Sonnet 5). A shorter prefix *silently* fails to cache — no error, just `cache_creation_input_tokens: 0` ([prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). The S5 methodology system prompt must be ≥ 4,096 tokens or the S5/S6 cache economics below do not materialize.
- **Server tools auto-cache mid-turn:** when a request already uses caching, web search "automatically insert[s] a 5-minute cache write after tool results" ([prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). This is what makes the S3 loop affordable — see §3.
- **Batch API: 50% off all tokens** including cache reads/writes; web search/fetch fully supported in batches at identical per-search pricing, with a *higher* per-turn iteration limit for the server-side agentic loop; most batches finish under 1 hour (24h expiry window); batch cache hits are best-effort, "typically 30% to 98%" — use the 1-hour TTL for batch shared prefixes (Anthropic's own tip). Batches "may go slightly over your Workspace's configured spend limit." ([batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing); [server tools — batch requests](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools))

### 1.4 Dynamic filtering: does it materially cut S3 token cost? Yes — use `web_search_20260318` / `web_fetch_20260318`

- Mechanism (documented): with `web_search_20260209`+, "Claude instead writes and runs code that filters the results first, so only relevant content reaches the context window. This reduces token use on search-heavy requests." Same for fetch: extract sections from long documents before they enter context. The code execution it rides on is auto-provisioned and free. ([web search — dynamic filtering](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool); [web fetch — dynamic filtering](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool); [release notes](https://platform.claude.com/docs/en/release-notes/overview) Feb 9, 2026: "filter results before they reach the context window for better performance and reduced token cost")
- Magnitude: **Anthropic publishes no percentage for dynamic filtering itself.** The nearest published anchor is programmatic tool calling (the same filter-in-sandbox mechanism): **24% fewer input tokens on agentic search benchmarks, with a higher score** ([programmatic tool calling docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling), as quoted in Anthropic's cost-optimization guidance). I am uncertain about the exact saving for this workload; the model below assumes filtered search blocks are ~50% smaller and filtered fetches ~40–60% smaller than raw, and I carry raw-size numbers in the worst-case bound so nothing depends on the optimistic assumption.
- **`web_search_20260318`/`web_fetch_20260318` add `response_inclusion: "excluded"`** — drops consumed result blocks from the API response, "reducing output token costs for agentic workflows that don't need to echo raw search content back" ([web search — response inclusion](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)). S3 keeps only its research notes; set this.
- **Model gate that drives the sensitivity analysis:** dynamic filtering requires Claude 4.6+ models. **Haiku 4.5 does not get it** — on Haiku you must run basic `web_search_20250305`/`web_fetch_20250910` or set `allowed_callers: ["direct"]`, meaning full raw results enter context ([web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool); [server tools — ZDR and allowed_callers](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools)).
- **Government-relevant caveat:** the dynamic-filtering versions are **not Zero Data Retention–eligible** (they rely on code execution); ZDR requires the basic variants or `allowed_callers: ["direct"]` ([server tools — ZDR](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools)). If a partner ever requires ZDR, S3's token cost roughly doubles (see the "caching broken/raw results" bound).

---

## 2. Modeling assumptions (what is documented vs. estimated)

**Documented:** all rates above; that search results re-bill as input across loop iterations; that the server-side loop runs multiple model iterations inside one request (`pause_turn` mechanics, [server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools)); fetch token yardsticks; auto cache writes after tool results.

**Estimates (flagged per the no-false-precision rule):**
- Tokens entering context per search-result block: **~1,000–1,500 with dynamic filtering; ~2,500–3,000 raw** (docs say "1–3 searches for simple factual queries; 10+ for comparative research" but publish no per-block token size; the pricing page's own single-search example shows ~7K cache-creation tokens for one search cycle, consistent with this range).
- Tokens per fetch entering context: 2K (low) / 4K (typical, filtered) / 10K (heavy, some near the 30K `max_content_tokens` cap) — anchored to the documented 2,500-token average page.
- Loop iterations: ~2 tool calls per model iteration → iterations ≈ (searches+fetches)/2 + 2. Not documented; cache reads scale linearly with this, so a ±50% error moves S3 by roughly ±$0.03 (typical).
- S3 run at `effort: "medium"` on Sonnet 5 — Anthropic's published effort curves for research workloads show `medium` matching default accuracy at 70–85% of cost ([cost optimization guidance](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence)).
- Pipeline **must send `cache_control`** on the S3 request so the server loop's auto-cache engages; every S3 figure below assumes it. The "caching absent" column shows what happens if this is misconfigured.

---

## 3. Stage-by-stage cost table (tokens and dollars per evaluation)

| Stage | Model / rate basis | Low | Typical | Heavy |
|---|---|---|---|---|
| **S1 Pitch extraction** (pitch → structured JSON) | Haiku 4.5 | 2.5K in / 0.4K out → **$0.005** | 7K in / 0.8K out → **$0.011** | 20K in / 1.2K out → **$0.026** |
| **S2 Registry checks** (SAM.gov, SOS, USASpending — no LLM) | HTTP + serverless | **$0 API** (~$0.001 infra) | ~$0.001 | ~$0.002 |
| **S3 Agentic research** (Sonnet 5, `web_search_20260318` max_uses 20, `web_fetch_20260318` max_uses 10 @ 30K cap, cached, effort medium) | searches used 6/12/20; fetches 3/6/10; context growth 20K/48K/163K; iterations ~6/11/17 | **$0.15** (incl. $0.06 search fees) | **$0.34** (incl. $0.12 search fees) | **$0.97** (incl. $0.20 search fees) |
| **S4 Classification** | Haiku 4.5, 4–8K in / ~0.3K out | **$0.005** | **$0.007** | **$0.010** |
| **S5 Two-pass synthesis** (Haiku, 8K cached methodology prompt, warm cache) | pass 1 + pass 2 | **$0.033** | **$0.042** | **$0.061** |
| **S6 Follow-up chat** (Haiku, ~8.5K cached report context, 800 max_tokens/turn) | ~$0.006–0.007/turn | $0 (no chat) | 5 turns × 50% of users → **$0.017** | 10 turns → **$0.07–0.09** |
| **Total per evaluation** | | **≈ $0.20** | **≈ $0.42** | **≈ $1.17** |

**S3 breakdown at "typical"** (the number the founder asked for): cache writes 48.4K tokens × $2.50/M = $0.12; cache reads ~266K token-reads × $0.20/M = $0.05; output 5K × $10/M = $0.05; search fees 12 × $0.01 = $0.12. Note the search *fee* is a third of S3 — the feared "$0.20 of searches" is real but the token side, tamed by caching + filtering, is what varies 10×.

**Bounds that matter for budgeting:**
- **Per-evaluation hard ceiling ≈ $2.30** (all caps exhausted: 20 searches at raw size, 10 fetches at the full 30K cap, 20-turn chat) — *with caching working*.
- **If S3 caching is absent/broken, the same worst case is ≈ $6.40 for S3 alone** (each of ~17 iterations re-bills the full accumulated context at $2/MTok), and even the typical eval rises from $0.34 to **$0.74**. Prompt caching in S3 is the single largest cost control in the product — treat `cache_read_input_tokens > 0` as a monitored invariant, not a nice-to-have ([prompt caching — verifying cache hits](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).

**Blended per-eval cost** at a 20% low / 70% typical / 10% heavy mix: **≈ $0.45**.

### Monthly cost at volume (blended; range = all-low to all-heavy)

| Volume/month | Blended | Range |
|---|---|---|
| 100 evals | **~$45** | $20 – $117 |
| 1,000 evals | **~$450** | $200 – $1,170 |
| 10,000 evals | **~$4,500** | $2,000 – $11,700 |

Free-tier sizing: a $500/month API budget supports ~1,100 blended evaluations; with a 30% vendor-repeat cache-hit rate (see §6) ~1,500. A $100/month pilot ≈ 200–250 evaluations.

---

## 4. Sensitivity 1 — S3 model choice: Sonnet 5 vs. Haiku 4.5

| Config | Typical full eval | Notes |
|---|---|---|
| S3 on Sonnet 5 (dynamic filtering) | **$0.42** | baseline |
| S3 on Haiku 4.5 (basic tools, no filtering) | **$0.36** | S3 alone: $0.28 vs $0.34 |

**Recommendation: keep Sonnet 5 in S3. The switch saves only ~15%, not the 50% the rate card implies**, because (a) Haiku loses dynamic filtering (4.6+ only), so raw search/fetch results inflate its token load ~60%, eating most of the 2× rate advantage; (b) the $0.12 search fee is model-independent; (c) **the heavy scenario's context (~223K tokens raw) exceeds Haiku's 200K window outright** — the verification-hungry cases would have to be truncated, which is precisely the fairness failure the founder flagged; (d) Haiku has no `effort` parameter and materially weaker multi-hop research (Anthropic's published comparison: Haiku 4.5 at ~63% vs 92% accuracy on knowledge questions against a frontier model — [cost optimization guidance](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence)). The $0.06/eval saved is not worth degraded verification of small legitimate vendors.

## 5. Sensitivity 2 — search/fetch caps

| Knob | Typical S3 | Heavy S3 | Fairness impact |
|---|---|---|---|
| Baseline: max_uses 20 search / 10 fetch, 30K content cap | $0.34 | $0.97 | — |
| Cut caps to 10 / 5 | $0.30 (−13%) | $0.48 (−50%) | **Degrades the customer-trace ladder** — binds exactly on multi-entity verification of obscure vendors, where "could not verify" false negatives originate |
| Keep 20/10 caps, cut `max_content_tokens` 30K → 15K | $0.34 (~0%) | $0.81 (−17%) | **Fairness-preserving**: reduces depth-per-document, not the number of independent sources consulted |

**Recommendation:** the caps are affordable at 20/10 — they bind only on the ~10% heavy tail and are the per-request hard stop against runaway cost, not a routine economizer. If trimming is ever needed, cut `max_content_tokens` first; cut `max_uses` last. Note the docs' own calibration: "Simple factual queries typically use 1–3 searches; comparative or multientity research can use 10 or more" ([web search — max uses](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)) — 20 is a genuine tail allowance, not a typical spend.

## 6. S6 chat budget recommendation (concrete)

At Haiku rates with the report context cached (~8.5K tokens, above Haiku's 4,096 cache minimum): **~$0.006–0.007 per turn** (cache read $0.0009 + history + question ≈ $0.001–0.002 + 800 output tokens ≈ $0.004). Recommend: **10 turns per session, 800 max_tokens/turn, total session budget ~60K input-equivalent + 8K output tokens → hard session ceiling ≈ $0.10, typical session ≈ $0.03–0.07.** Ten turns is generous for "what does this finding mean / what do I ask in the demo" follow-ups; a 20-turn session costs ~$0.29 uncached vs ~$0.17 cached, so cache the conversation tail too (automatic top-level `cache_control`).

## 7. S5 cache-write economics across daily volume

Methodology prompt of 8K tokens on Haiku (write 5m $1.25/M, write 1h $2/M, read $0.10/M):
- **≥ ~300 evals/day** (average gap < 5 min): the 5-minute cache self-sustains — effectively one $0.01 write/day, every eval reads at $0.0008. S5 warm ≈ **$0.042/eval**.
- **~20–300 evals/day**: use the **1-hour TTL** ($0.016/write); ~12–24 writes/day = $0.20–0.40/day total — noise.
- **< ~20 evals/day**: accept cold writes; worst case adds ~$0.015/eval. Caching remains break-even after one read ([pricing — prompt caching](https://platform.claude.com/docs/en/about-claude/pricing)).
- Design constraint worth restating: **pad the methodology prompt to ≥ 4,096 tokens** or Haiku silently never caches it ([prompt caching — minimums](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).

## 8. Abuse economics for a free public tool

The threat model: worst-case ~$2.30/eval means one scripted actor submitting 1,000 junk domains/day can burn **$450–$2,300/day**. Layered controls, cheapest first:

1. **Cloudflare Turnstile on the submit form — free**: 20 widgets, 10 hostnames/widget, **unlimited challenges** on the free tier ([Turnstile plans](https://developers.cloudflare.com/turnstile/plans/); [overview](https://developers.cloudflare.com/turnstile/)). Non-intrusive CAPTCHA alternative; blocks naive scripting outright.
2. **Per-IP and per-session caps**: e.g., 3 evaluations/IP/day anonymous, 10/day for verified .gov/.us email sessions; excess queued. Procurement officers are inherently low-frequency users; this caps a single hostile IP at ~$1.35–$7/day.
3. **Result caching by vendor identity (biggest structural lever)**: key completed reports by normalized vendor domain + freshness window (e.g., 30 days); serve repeats at **$0**. Inbound pitches concentrate heavily (the same call-center-AI vendors pitch every state agency — the New America survey's #1 category), so even a 30% repeat rate cuts the blended bill 30% and makes popular-vendor lookups instant. Anthropic's own web-fetch server cache (`use_cache: true`, default) independently reduces fetch latency/variance on repeats ([web fetch — cache bypass](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool)).
4. **Queue bulk demand through the Batches API**: a "bulk triage" tier (upload N pitches, results within ~an hour) runs at **≈ $0.23 typical for S3 / ≈ $0.26 for the full no-chat eval** — 50% off all tokens, search fees unchanged, server-tool loop supported with a higher iteration limit ([batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing); [server tools — batch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools)). Use 1-hour cache TTL inside batches (documented best-effort hit rates 30–98%).
5. **Platform backstops**: Workspace spend limit in the Console ([settings/billing](https://platform.claude.com/settings/billing) — referenced in the batch docs, which note batches may slightly overshoot it) as the hard monthly stop; org rate limits by tier throttle concurrency ([rate limits](https://platform.claude.com/docs/en/api/rate-limits)).
6. **Per-request kill switches already in the design**: `max_uses` on both tools, `max_content_tokens: 30000`, per-stage `max_tokens`, and web fetch's built-in URL validation (it can only fetch URLs already present in the conversation — an inherent anti-exfiltration/anti-abuse property, [web fetch — URL validation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool)). Add `blocked_domains` for known junk/link-farm domains as they surface.
7. **Optional gateway layer**: Cloudflare AI Gateway (available on all plans) adds provider-level response caching, rate limiting, and per-request cost analytics in front of the Anthropic API ([AI Gateway](https://developers.cloudflare.com/ai-gateway/)).

*Benchmarking caveat, stated plainly:* this session's search budget was exhausted before I could survey named free civic LLM tools' published abuse-control practices, so items 1–7 are grounded in the cited Cloudflare and Anthropic documentation plus common practice for free public LLM tools (email-domain gating, daily quotas, shared result caches) — labeled as common practice, not a measured survey. The dollar math above (what an attacker can burn, what each control caps) is this tool's own, and does not depend on that survey.

## 9. Build checklist implied by the cost model

1. Send `cache_control` on the S3 request (top-level automatic caching + explicit breakpoint on the static system prefix) — halves S3; monitor `cache_read_input_tokens > 0` as an invariant.
2. Use `web_search_20260318` + `web_fetch_20260318` with `response_inclusion: "excluded"`; do not add a separate `code_execution` tool (auto-provisioned, free on this path).
3. Set S3 `effort: "medium"`; keep 20/10 `max_uses` and 30K `max_content_tokens`; treat caps as tail insurance.
4. Pad the S5/S6 Haiku methodology prompts to ≥ 4,096 tokens; choose cache TTL by daily volume (§7).
5. Cap S6 at 10 turns / 800 tokens per turn (~$0.10 session ceiling).
6. Ship Turnstile + per-IP caps + vendor-keyed result cache before public launch; set a Workspace spend limit.
7. Log `response.usage` per stage from day one — it is the only ground truth for this model's assumptions, and the two flagged estimates (per-search token load, iteration count) should be replaced with measured values in week one.
8. Watch Haiku 4.5's lifecycle (retirement possible after Oct 15, 2026) and re-baseline on migration; if a ZDR requirement ever appears, re-cost S3 with `allowed_callers: ["direct"]` (roughly doubles S3 tokens).

**Bottom line:** ≈ **$0.20 / $0.42 / $1.17 per evaluation (low/typical/heavy), ~$0.45 blended, ~$2.30 absolute per-eval ceiling with caps and caching intact.** ~$450/month at 1,000 evaluations. The two decisions that keep it there: caching wired into S3 (a 2×–3× swing) and dynamic filtering on Sonnet 5 (which also rules out the Haiku downgrade, since Haiku can't run the heavy case at all).