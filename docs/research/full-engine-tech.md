# Technical Engine Research: Claude-Powered Vendor-Evaluation Pipeline (verified against live Anthropic/Supabase/Cloudflare docs, August 28, 2026)

**Note on URLs:** `docs.claude.com` now 302-redirects to `platform.claude.com/docs/...`. All Anthropic citations below are the live post-redirect URLs, fetched today.

---

## 1. Server-side web search tool

Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

- **How it works:** You add a tool object to `tools` in a Messages API request; the API runs searches server-side in an agentic loop ("This process can repeat multiple times throughout a single request"). No tool_result handling by your code. Three versions exist:
  - `web_search_20250305` — basic search
  - `web_search_20260209` — adds **dynamic filtering**: Claude writes/runs code (auto-provisioned code execution, free when used this way) that filters search results *before* they enter the context window, cutting token use on search-heavy requests. Available on Claude 4.6+ models.
  - `web_search_20260318` — adds `response_inclusion: "excluded"` to drop consumed search-result blocks from the response, reducing output echo for agentic workflows.
- **Pricing:** **$10 per 1,000 searches ($0.01/search), plus standard token costs for search-generated content.** Each search = one use regardless of result count; errored searches are not billed. Important cost nuance: "Web search results retrieved throughout a conversation are counted as input tokens, in search iterations executed during a single turn and in subsequent conversation turns" — i.e., results are re-billed as input on every loop iteration and follow-up turn, which is why prompt caching matters (Section 4).
- **Citations:** Always on. Each cited span carries `web_search_result_location` with `url`, `title`, `encrypted_index`, and `cited_text` (up to 150 chars). `cited_text`/`title`/`url` do **not** count toward token usage. Anthropic requires displaying citations to end users — directly relevant for an evidence-based evaluation report UI. Multi-turn continuation requires passing back `encrypted_content` unmodified or the API 400s.
- **`max_uses`:** Hard cap on searches per request; exceeding it returns a `web_search_tool_result_error` with code `max_uses_exceeded` (in-band, HTTP still 200). Docs: simple queries use 1–3 searches; "comparative or multientity research can use 10 or more" — a vendor-diligence pass at `max_uses: 15–25` is squarely in the documented envelope.
- **Domain lists:** `allowed_domains` OR `blocked_domains` (never both; 400 if both). Bare domains, optional path, no scheme (`sam.gov`, `example.com/blog`). Rules (https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools#domain-filtering): subdomains auto-included; a specific subdomain restricts to it; subpaths match prefixes for search; wildcards only in paths (`example.com/*` valid, `*.example.com` invalid); ASCII-only recommended (homograph-attack warning in docs). Org-level domain restrictions can also be set in Console (Settings → Privacy) and request-level allowed lists must be a subset of them.
- **`user_location`:** `{type:"approximate", city, region, country, timezone}` — useful to localize results to the buyer's state.
- **Errors (in-band, HTTP 200):** `too_many_requests`, `invalid_tool_input`, `max_uses_exceeded`, `query_too_long`, `request_too_large`, `unavailable`. A long turn can return `stop_reason: "pause_turn"` — re-send the assistant content as-is with the same tools to continue (see https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools#the-server-side-loop-and-pause-turn). Your edge-function loop must handle pause_turn with a capped retry count.
- **Org setting:** Web search is on by default but an admin can disable it in Console; if disabled, requests including the tool fail with 400 `invalid_request_error`.
- **Usage reporting:** `usage.server_tool_use.web_search_requests` in every response — log this per evaluation for cost telemetry.

## 2. Web fetch tool

Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool

- **Status:** GA server tool on the Claude API (no beta header shown in current docs). Versions: `web_fetch_20250910` (basic), `web_fetch_20260209` (dynamic filtering), `web_fetch_20260309` (+`use_cache: false` bypass), `web_fetch_20260318` (+`response_inclusion`). Fetches full pages **and PDFs** (PDFs come back base64 and are processed like attached PDFs — ideal for vendor marketing PDFs and SOC 2 summaries hosted at URLs). Does **not** render JavaScript.
- **Pricing:** **No additional charge** — you pay only standard token costs for fetched content. Docs' own sizing: ~2,500 tokens per average 10 kB page; ~25,000 per 100 kB docs page; ~125,000 per 500 kB PDF. Cap with `max_content_tokens` (approximate limit, e.g. 25,000–50,000 for this app).
- **Security / URL validation:** Claude can only fetch URLs that already appeared in context (user message, prior search/fetch results, client tool results) — it cannot invent URLs (`url_not_in_prior_context` error otherwise). This is a real anti-exfiltration property for a public app that ingests untrusted vendor pitches. Docs still warn of residual exfiltration risk and recommend `max_uses` + `allowed_domains` when handling sensitive data.
- **Parameters:** `max_uses` (failed fetches count; no default limit — set one), `allowed_domains`/`blocked_domains` (domain-only matching for fetch; path entries never match), `citations: {enabled: true}` (off by default, unlike search — turn it on), `max_content_tokens`, `use_cache` (results are cached server-side; `false` forces fresh).
- **Errors:** `url_too_long` (250-char max), `url_not_allowed` (blocked by filters, robots.txt, or private addresses), `url_not_accessible`, `unsupported_content_type` (text/HTML/PDF only), `max_uses_exceeded`, etc.
- **Combined search+fetch** is an explicitly documented pattern: search locates, fetch reads in depth, citations flow through — exactly the vendor-diligence flow (find the vendor's site, SEC/state filings, news; then fetch and read them).

## 3. Structured outputs / tool-forced JSON

Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs

- **Current mechanism:** `output_config.format` with `{type: "json_schema", schema: {...}}` — guarantees the response parses against your schema. The old `output_format` param is deprecated-but-accepted; the `structured-outputs-2025-11-13` beta header is no longer required. Separately, `strict: true` on a client tool definition guarantees valid tool-call inputs.
- **Supported models:** claude-opus-5, claude-sonnet-5, claude-haiku-4-5, claude-opus-4-8/4-7/4-6/4-5, claude-sonnet-4-6/4-5 — i.e., every model you'd consider.
- **Schema limits that matter for a report schema:** no recursion, no `minimum`/`maximum`/`minLength`/`maxLength`/regex `pattern`, `additionalProperties` must be `false`, array `minItems` only 0/1. Enums of strings/numbers are fine — so a `verdict` enum like `["do_not_engage","insufficient_evidence","emerging_vendor","established_vendor"]` and a `confidence` enum work; numeric score ranges must be enforced in your own validator. SDKs (`client.messages.parse()` with Pydantic/Zod) auto-strip unsupported constraints and re-validate client-side.
- **Grammar compilation:** first request with a new schema adds latency; compiled grammars are cached 24h from last use; changing schema structure or the tool set invalidates it (changing only names/descriptions doesn't). A small extra system prompt is injected (slight input-token bump).
- **Interaction with web search:** the docs page does not explicitly address combining `output_config` with server tools in one request. **I am uncertain whether one request can both run web search and emit schema-constrained JSON.** The robust architecture (and the one I'd recommend regardless): **two-pass pipeline** — Pass A: research request with web_search/web_fetch producing a cited narrative + the raw citation blocks; Pass B: cheap request (Haiku 4.5) with `output_config` that converts Pass A's output into the strict report JSON. This also lets you keep citations verbatim from Pass A.

## 4. Prompt caching (for a large reused methodology system prompt)

Sources: https://platform.claude.com/docs/en/build-with-claude/prompt-caching and https://platform.claude.com/docs/en/about-claude/pricing#prompt-caching

- **Mechanics:** two modes — (a) *automatic*: one top-level `cache_control: {"type": "ephemeral"}` on the request, breakpoint auto-managed; (b) *explicit*: `cache_control` on individual blocks, up to **4 breakpoints**, 20-block lookback, hierarchy tools → system → messages. Cache hit requires a **100% identical prefix** (tools + system + messages, in order). Put the breakpoint on the last *unchanging* block — never after per-request content like the pasted vendor pitch.
- **Pricing multipliers:** 5-min write = 1.25× base input; 1-hour write (`{"type":"ephemeral","ttl":"1h"}`) = 2× base; **cache read = 0.1× base input**. 5-min TTL refreshes free on each reuse (TTL measured from request start). Stacks with the Batch discount.
- **Minimum cacheable size:** 512 tokens on Opus 5/Fable 5; **1,024 on Sonnet 5**; **4,096 on Haiku 4.5** (also Opus 4.6/4.5). A 10–20k-token methodology prompt clears all thresholds.
- **Worked numbers for a ~15,000-token methodology system prompt on Sonnet 5 ($2/MTok input):** uncached = $0.030 per evaluation; cached = $0.003 per read (plus $0.0375 for the occasional 5-min write). At steady traffic, ~90% off that prompt. Equally important: **cache reads do NOT count toward ITPM rate limits** on current models (https://platform.claude.com/docs/en/api/rate-limits#cache-aware-itpm) — caching multiplies the effective throughput of a public app on a low usage tier.
- **Inside the agentic search loop:** every loop iteration and the follow-up chat re-sends the growing prefix; with a breakpoint after the system prompt (and automatic caching for conversation growth), those re-sends bill at 0.1× instead of 1×. Cache-invalidation gotchas from the docs' table: toggling the web-search tool, citations, or `tool_choice` invalidates caches — keep the tool array byte-identical between the research pass and any continuation.
- **Pre-warming:** `max_tokens: 0` requests write the cache before users arrive (not allowed inside batches). Caches are isolated per Console workspace.

## 5. Message Batches API

Source: https://platform.claude.com/docs/en/build-with-claude/batch-processing

- `POST /v1/messages/batches`; each batch ≤ **100,000 requests or 256 MB**; most batches finish **< 1 hour**, hard expiry at 24 h (expired requests not billed); results downloadable for **29 days**; poll `processing_status` (SDKs have polling helpers).
- **50% off both input and output tokens** (Sonnet 5 drops to $1/$5 per MTok; Haiku 4.5 to $0.50/$2.50; Opus 5 to $2.50/$12.50; Fable 5 to $5/$25). **Web search calls in batches are priced the same $10/1,000 — the 50% discount does not apply to the per-search fee.** Server tools (web search, web fetch, code execution) are all batch-supported; `stream: true` is not. Anthropic throttles `web_search` per org inside batches to protect shared capacity (auto-retried; big search batches just take longer).
- Prompt caching works in batches but hits are best-effort (30–98% observed); docs recommend the 1-hour TTL for batch workloads. Batches can slightly overshoot a workspace spend limit (documented caveat).
- Rate limits (https://platform.claude.com/docs/en/api/rate-limits#message-batches-api): Start tier = 1,000 RPM, 200,000 queued batch requests, 100,000 per batch.
- **Fit for this product:** the interactive triage flow can't batch (users wait 1–3 min), but batches are the right engine for a "re-verify all 500 vendors in our registry monthly" or "bulk-upload a spreadsheet of pitches" feature at half token cost.

## 6. Cost per evaluation (computed from current listed prices)

Prices from https://platform.claude.com/docs/en/about-claude/pricing (per MTok): **Sonnet 5 $2 in / $10 out** (the launch "introductory" price is now permanent — the scheduled Sept 1, 2026 increase to $3/$15 was cancelled, per a note on the pricing page); **Haiku 4.5 $1 / $5**; **Opus 5 $5 / $25** (the recommended top model for "complex agentic work"); **Fable 5 $10 / $50** ("highest available capability", per https://platform.claude.com/docs/en/models/overview). Search fee $0.01 each.

Scenarios (billed input ≈ cumulative pitch + search results + fetched pages across the loop; output ≈ report):

| Scenario | Searches | Input | Output | Haiku 4.5 | Sonnet 5 | Opus 5 | Fable 5 |
|---|---|---|---|---|---|---|---|
| Light | 10 | 50k | 5k | **$0.18** | **$0.25** | $0.48 | $0.85 |
| Typical | 15 | 100k | 8k | **$0.29** | **$0.43** | $0.85 | $1.55 |
| Heavy | 25 | 150k | 12k | **$0.46** | **$0.67** | $1.30 | $2.35 |

(Example, Sonnet 5 typical: 100k × $2/M = $0.20 in + 8k × $10/M = $0.08 out + 15 × $0.01 = $0.15 search = $0.43.)

Caveats that move these numbers:
- **Loop re-billing:** because search results count as input on each iteration, cumulative billed input can run 2–4× the final context size on a 15-search loop **without caching**; with a system-prompt breakpoint + automatic caching, re-read prefix bills at 0.1×, keeping the table above realistic. Dynamic filtering (`web_search_20260209+`) further cuts input by discarding irrelevant result content before it enters context, with the code-execution calls free in that configuration.
- **Tokenizer:** models from Opus 4.7 onward (incl. Sonnet 5, Opus 5, Fable 5) tokenize ~30% heavier than Sonnet 4.6-era models for the same text (pricing-page note), so compare per-dollar-of-work, not per-nominal-token.
- **Practical planning number:** ~$0.30–$0.70 per evaluation on Sonnet 5; ~$0.20–$0.50 on Haiku 4.5 (Haiku's 200k context is fine here; its weaker research judgment is the real tradeoff). A hybrid — Sonnet 5 research pass + Haiku 4.5 structured-output pass + Haiku 4.5 follow-up chat — keeps typical cost near $0.45. Budget: 1,000 evaluations/month ≈ **$300–$700 on Sonnet 5**; 10,000/month ≈ $3–7k (at which point negotiate or add gating).

## 7. Spend caps and abuse prevention for a free public app

- **Anthropic Console (platform) layer:**
  - Tier spend caps: Start $500/mo, Build $1,000/mo, Scale $200k/mo; hitting the tier cap 429s with `error_code: enforced_spend_limit_reached` until month rollover (https://platform.claude.com/docs/en/api/rate-limits#spend-limits). You can also set your **own lower org spend limit** at Settings → Billing (hitting it returns HTTP 400 "You have reached your specified API usage limits").
  - **Workspaces** (https://platform.claude.com/docs/en/manage-claude/workspaces): create a dedicated workspace for this app with its own API key, a **monthly spend limit + alert thresholds** (Spend limits tab) and **per-workspace RPM/ITPM/OTPM rate limits** (Rate limits tab), all lower than org limits. This is the single most important blast-radius control: a runaway free tool can't drain the firm's whole account. Track it via the `anthropic-workspace-id` response header and the Usage & Cost Admin API. (Note: the separate "Spend Limits API" at https://platform.claude.com/docs/en/manage-claude/spend-limits-api is **Claude Enterprise per-member seats only** — not applicable to Console API workspaces; workspace caps are Console-configured.)
  - Rate-limit headers (`anthropic-ratelimit-input-tokens-remaining`, etc.) let the edge function degrade gracefully (queue or show "high demand") before hitting 429s.
- **App layer (Supabase):**
  - **Per-session token budget:** every Messages response reports exact `usage` (input, output, cache read/write, `server_tool_use.web_search_requests`). Persist a running sum per session/user row in Postgres; refuse new work past e.g. 300k tokens + 30 searches per session. Enforce `max_uses` on the tools and `max_tokens` on every call as hard per-request ceilings. The free token-counting endpoint `POST /v1/messages/count_tokens` (https://platform.claude.com/docs/en/build-with-claude/token-counting; 2,000 RPM at Start tier, separate from Messages limits) lets you pre-reject oversized pasted pitches before spending anything.
  - **IP/device rate limiting on edge functions:** Supabase's documented pattern is Upstash Redis over HTTP/REST with atomic increments (https://supabase.com/docs/guides/functions/examples/rate-limiting), keyed on Supabase Auth user ID (or IP from `x-forwarded-for` for anonymous). A simpler zero-dependency variant: a Postgres `rate_limits` table with an atomic `increment` RPC — fine at this app's volume. Layer: 3 evaluations/hour/IP, 10/day/email, plus a global daily circuit breaker.
  - **Cloudflare Turnstile vs CAPTCHA:** Turnstile is Cloudflare's CAPTCHA alternative — no visual puzzles; managed / non-interactive / invisible modes (https://developers.cloudflare.com/turnstile/). Server-side check: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` + `response` (+ optional `remoteip`, `idempotency_key`); tokens are single-use and valid 5 minutes (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). Cloudflare markets Turnstile as free for standard use; I could not verify exact free-plan widget/hostname caps from the pages fetched — treat that detail as unconfirmed. **Supabase Auth natively supports Turnstile** as a CAPTCHA provider (Dashboard → Auth → Bot and Abuse Protection; token passed via `options.captchaToken` on sign-up/sign-in: https://supabase.com/docs/guides/auth/auth-captcha). Recommendation: invisible/managed Turnstile on the evaluate action itself, verified in the edge function before any Claude call — far better UX for non-technical gov staff than a puzzle CAPTCHA.
  - **Email gating:** a soft tier works well for this audience — N free anonymous evaluations (Turnstile-verified), then require sign-in. Supabase Auth email OTP/magic links; optionally prioritize `.gov`/`.us` domains rather than blocking others (many local agencies use .org/.com). Auth's built-in rate limits plus captcha cover the sign-up surface.

## 8. Streaming to the browser through Supabase Edge Functions

- **Limits** (https://supabase.com/docs/guides/functions/limits): wall-clock **150 s (free plan) / 400 s (paid)**; **2 s CPU time** per request (async I/O — i.e., awaiting Anthropic — doesn't count); 256 MB memory; and a 150 s **request idle timeout** — if *nothing* has been sent within 150 s the platform returns 504.
- **Implication for a 1–3 minute pipeline:** it fits inside the paid 400 s wall clock, and SSE solves the idle timeout because you start writing bytes immediately. Anthropic streaming (`stream: true`) emits SSE (`message_start`, `content_block_start`, `input_json_delta` for the search query, a pause while the search executes, results in a single `content_block_start`, then text deltas — event sequence documented on the web-search page). The edge function can pipe Anthropic's `ReadableStream` straight through as its own `text/event-stream` response, interleaving custom progress events ("Searching: 'Acme AI SOC 2'…" — the streamed `input_json_delta` gives you the literal query to display). On the **free Supabase plan the 150 s wall clock is the binding constraint** — a heavy 25-search run can exceed it, so plan on a paid project ($10/mo Pro) or the fallback below.
- **Background-task fallback** (https://supabase.com/docs/guides/functions/background-tasks): `EdgeRuntime.waitUntil(promise)` keeps the instance alive after responding, still capped by the same wall-clock/CPU/memory limits; listen for `beforeunload` to checkpoint. Robust architecture for long runs: edge function validates + inserts an `evaluations` row, runs the pipeline via `waitUntil` writing incremental progress/results to Postgres; browser subscribes via Supabase Realtime (postgres_changes) — survives tab refreshes and mobile connections, which pure SSE doesn't. Local dev: set `[edge_runtime] policy = "per_worker"` in `supabase/config.toml` so background tasks complete.
- Handle `pause_turn` inside the pipeline (re-send assistant content, same tools, capped continuations) — a 20-search turn will pause at least once.

## 9. Constraining follow-up chat to grounded text-only Q&A with a hard token cap

Pattern assembled from the cited docs:
1. **No tools in the follow-up requests.** Omit `tools` entirely — the model then cannot search or fetch (server tools only run when declared per-request), and per https://platform.claude.com/docs/en/about-claude/pricing#tool-use-pricing, with no tools provided `tool_choice: none` adds 0 system-prompt tokens. Follow-up chat is pure text over the report.
2. **Ground it:** system prompt = short "answer only from the report; if not in the report, say so and suggest which recommended vendor question would surface it" + the completed report JSON/markdown as a system block with `cache_control` (1,024+ tokens on Sonnet 5, 4,096+ on Haiku 4.5 to actually cache). Every follow-up turn then re-reads the report at 0.1× price and 0 ITPM impact. Do **not** replay the research transcript (it would drag `encrypted_content` and cost along); the report is the sole context.
3. **Hard caps:** per-turn `max_tokens` 700–1,000 (output cap; OTPM counts only generated tokens, so a tight max_tokens has no rate-limit downside per https://platform.claude.com/docs/en/api/rate-limits); per-session budget enforced in the edge function from summed `usage` fields (e.g., 25k total follow-up tokens or 15 questions, whichever first), then return a friendly "session limit reached — start a new evaluation" without calling the API. Pre-check long pasted questions with the free count_tokens endpoint. Cap input per turn too (truncate/reject >2k-token questions).
4. **Cheap model:** Haiku 4.5 ($1/$5) is ample for report-grounded Q&A — a 15-question session over a cached 8k-token report costs roughly $0.02–$0.04.

---

### Recommended engine configuration (synthesis)
- **Research pass:** `claude-sonnet-5`, `tools: [{type:"web_search_20260318", name:"web_search", max_uses:20, blocked_domains:[content farms]}, {type:"web_fetch_20260318", name:"web_fetch", max_uses:10, citations:{enabled:true}, max_content_tokens:30000}]`, methodology system prompt behind a `cache_control` breakpoint, streaming SSE through a paid-plan Supabase edge function (waitUntil + Realtime fallback), pause_turn loop with a continuation cap.
- **Structuring pass:** `claude-haiku-4-5` with `output_config.format` json_schema → the report object (verdict enum, evidence list with URLs, question list).
- **Follow-up chat:** `claude-haiku-4-5`, no tools, cached report, max_tokens ~800, edge-function-enforced session budget.
- **Cost & safety envelope:** ~$0.45/evaluation typical; dedicated Console workspace with monthly spend cap + alerts + workspace rate limits; Turnstile (invisible) on every evaluate action; per-IP and per-account limits in Postgres/Upstash; batch mode later for bulk re-verification at 50% token cost.