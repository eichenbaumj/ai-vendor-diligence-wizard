/*
  How a check runs: the plain-language explainer, with three labs that call
  the real shared pure functions. Every sentence, label, and fixture comes
  from src/lib/how-it-works-model.ts; this file holds layout only.

  Layout rules (Joe, 2026-09-01): one typographic hierarchy, a consistent
  spacing rhythm, no abutting or overlapping elements, AA contrast, no text
  overflow, connectors that never cross text, the pipeline legible at 13px
  in a viewBox about 1150 wide and stacked cleanly at 375px. Colors come from
  the brand tokens in brand.css; SVG uses currentColor and token classes only.
  Heading color is a utility on the element (brand.css keeps its heading
  default in @layer base). Secondary text is charcoal-soft; steel is for
  strokes, borders and the unfilled pip glyph only, since it fails AA as text.

  Folds (Joe, 2026-09-02): the pipeline graphic is the hub. No stage card is
  open until a node or a worked-example line is pressed; the report-parts
  chooser lives inside stage 14; the truth table, the FedRAMP box, the source
  chooser, and the fairness list open from a labeled control. Every fold
  stays in the DOM, is reachable by keyboard (aria-expanded, aria-controls,
  Escape closes and returns focus; the stage panel closes on Escape too, and
  the hub's two pills sit in the worked-example band), and prints expanded:
  folds use the
  `hidden print:block` pair rather than the hidden attribute, because the
  preflight's [hidden] rule is !important in an earlier layer and would win
  over print:block on paper. Hash links (#credit-lab, #tier-lab,
  #source-lab, #fairness, #who-wrote-it, #rule-<id>, #stage-<id>) open the
  fold they point at before scrolling.
*/
import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { PillButton, Section, TierBadge } from "@/components/brand";
import {
  EvidenceTierBadge,
  ResultChip,
} from "@/components/report/VerificationLedger";
import {
  CAP_EXPLANATIONS,
  CHIP_KEY,
  CHIP_KEY_DIMENSIONS,
  CHIP_KEY_TIERS,
  COVERAGE_LIMITED_CARD,
  CREDIT_CONTROLS,
  CREDIT_DEFAULT,
  CREDIT_PRESETS,
  CREDIT_RARE_TITLE,
  DIAGRAM_LABELS,
  FAIRNESS_LINES,
  FEDRAMP_LEAD,
  FEDRAMP_PICK,
  FEDRAMP_SCENARIOS,
  FEDRAMP_TITLE,
  FOOTER,
  HERO,
  HONESTY_GROUP_LABELS,
  LADDER_TEXT,
  LANE_LEGEND,
  LEDGER_CHIP_LABELS,
  MEETS_KEY,
  PART_LEADS,
  PART_SCREEN,
  POINT_GROUPS,
  REGISTRY_LANES,
  REPORT_PARTS,
  SECTIONS,
  SOURCE_CLASSES,
  SOURCE_EXAMPLES,
  SOURCE_READ_CONTROL,
  STAGES,
  STAGE_FIELD_LABELS,
  TIER_CAP_STEP,
  TIER_CONTROLS,
  TIER_DEFAULT,
  TIER_LADDER,
  TIER_PRESETS,
  TIER_RESULT_LABELS,
  TIER_SET_HERE,
  TIER_STEPS,
  TRIGGER_KINDS,
  TRUTH_TABLE,
  TRUTH_TABLE_HEADERS,
  WALL_GATES,
  WHO_CHIP,
  WORKED_EXAMPLE_STAGES,
  inertCreditControls,
  plainWords,
  pointsMet,
  runCredit,
  runSource,
  runTier,
  stepOutcomes,
  workedLead,
  type Control,
  type CreditScenario,
  type Lane,
  type Stage,
  type StageId,
  type TierScenario,
} from "@/lib/how-it-works-model";

const REPO = "https://github.com/eichenbaumj/ai-vendor-diligence-wizard/blob/main/";
const STAGE_PANEL_ID = "hiw-stage-panel";

/* ------------------------------------------------------------ primitives */

const KICKER =
  "flex items-baseline gap-3 font-sans text-sm font-bold tracking-[0.14em] [font-variant-caps:all-small-caps] text-brand-cobalt";
const KICKER_N = "font-mono text-[13px] font-medium tracking-normal text-brand-charcoal-soft";
const H2 = "mt-4 max-w-3xl font-serif text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-tight text-brand-cobalt";
const INTRO = "mt-5 max-w-2xl font-sans text-lg leading-relaxed";
const LABEL = "font-sans text-sm font-bold tracking-[0.1em] [font-variant-caps:all-small-caps] text-brand-charcoal-soft";
const CARD = "rounded-md border border-brand-silver-soft bg-white p-6 shadow-soft";
const INLINE_LINK =
  "font-medium text-brand-cobalt underline decoration-brand-carolina decoration-2 underline-offset-2 hover:decoration-brand-cobalt";
const SMALL_KEY = "mt-2 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft";
/* Every hash target sits clear of the sticky header. */
const SCROLL_MT = "scroll-mt-24";

function Kicker({ n, text }: { n: string; text: string }) {
  return (
    <p className={KICKER}>
      <span className={KICKER_N}>{n}</span>
      {text}
    </p>
  );
}

const LANE_CHIP: Record<Lane, string> = {
  ai: "bg-brand-carolina-100 text-brand-deepblue",
  code: "bg-brand-cobalt-100 text-brand-cobalt",
  both: "bg-brand-vellum-deep text-brand-charcoal",
  you: "bg-brand-cream-deep text-brand-charcoal",
};

function WhoChip({ lane }: { lane: Lane }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wide ${LANE_CHIP[lane]}`}
    >
      <LaneSwatch lane={lane} />
      {WHO_CHIP[lane]}
    </span>
  );
}

function LaneSwatch({ lane }: { lane: Lane }) {
  if (lane === "both") {
    return (
      <span aria-hidden="true" className="flex h-3 w-3 shrink-0 overflow-hidden rounded-sm border border-brand-charcoal/40">
        <span className="h-full w-1/2 bg-brand-carolina" />
        <span className="h-full w-1/2 bg-brand-cobalt" />
      </span>
    );
  }
  const fill =
    lane === "ai"
      ? "bg-brand-carolina"
      : lane === "code"
        ? "bg-brand-cobalt"
        : "bg-brand-cream-deep border border-brand-steel";
  return <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-sm ${fill}`} />;
}

/* A segmented control: native buttons in a radiogroup with roving tabindex
   and arrow keys. Buttons are keyed by value and never remounted, so focus
   survives every state change. */
function SegmentedRadio<S extends object>({
  control,
  value,
  onChange,
  inert,
  inertLabel,
}: {
  control: Control<S>;
  value: string;
  onChange: (v: string) => void;
  inert?: boolean;
  inertLabel?: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = control.options.length;
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    onChange(control.options[j].value);
    refs.current[j]?.focus();
  };
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span id={id} className="font-sans text-base font-bold text-brand-ink">
          {control.label}
        </span>
        {inert && inertLabel && (
          <span className="basis-full font-sans text-sm text-brand-charcoal-soft sm:basis-auto">({inertLabel})</span>
        )}
      </div>
      <div role="radiogroup" aria-labelledby={id} className="mt-2 flex flex-wrap gap-2">
        {control.options.map((o, i) => {
          const checked = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => move(e, i)}
              className={`rounded-pill border px-3.5 py-1.5 font-sans text-sm font-medium leading-snug transition-colors ${
                checked && !inert
                  ? "border-brand-cobalt bg-brand-cobalt text-white"
                  : checked
                    ? "border-brand-cobalt-300 bg-brand-cobalt-300 text-white"
                    : inert
                      ? "border-brand-steel/60 bg-white text-brand-charcoal-soft hover:border-brand-cobalt"
                      : "border-brand-steel bg-white text-brand-charcoal hover:border-brand-cobalt"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {control.caption && (
        <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-brand-charcoal-soft">
          {control.caption}
        </p>
      )}
    </div>
  );
}

function PresetRow({
  label,
  items,
  activeId,
  onPick,
}: {
  label: string;
  items: { id: string; label: string }[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <p id={id} className={LABEL}>
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="mt-3 flex flex-wrap gap-2">
        {items.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(p.id)}
              className={`rounded-pill border-[1.5px] px-4 py-1.5 text-left font-sans text-sm font-bold leading-snug transition-colors ${
                active
                  ? "border-brand-cobalt bg-brand-cobalt text-white"
                  : "border-current bg-transparent text-brand-cobalt hover:bg-brand-cobalt-50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Token({ tone, wrap, children }: { tone: "good" | "warn" | "muted" | "cobalt"; wrap?: boolean; children: ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-status-good-soft text-status-good"
      : tone === "warn"
        ? "bg-status-warn-soft text-status-warn-text"
        : tone === "cobalt"
          ? "bg-brand-cobalt-100 text-brand-cobalt"
          : "bg-brand-vellum text-brand-charcoal-soft";
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide ${
        wrap ? "whitespace-normal text-center leading-tight" : "whitespace-nowrap"
      } ${cls}`}
    >
      {children}
    </span>
  );
}

/* A labeled disclosure: one ghost pill that reports its state, and a region
   that is display:none until opened, block in print, focusable so the next
   Tab lands inside it, and closable with Escape (focus returns to the pill).
   The pill is never remounted, so focus survives the toggle. */
function Fold({
  id,
  labelledBy,
  open,
  onToggle,
  openLabel,
  closeLabel,
  className = "",
  regionClassName = "",
  children,
}: {
  id: string;
  /* The heading the region is named after. */
  labelledBy: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  openLabel: string;
  closeLabel: string;
  className?: string;
  regionClassName?: string;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const was = useRef(open);
  useEffect(() => {
    if (open && !was.current) region.current?.focus({ preventScroll: true });
    was.current = open;
  }, [open]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !open) return;
    e.stopPropagation();
    onToggle(false);
    wrap.current?.querySelector("button")?.focus();
  };
  return (
    <>
      <div ref={wrap} className={`print:hidden ${className}`}>
        <PillButton variant="ghost" aria-expanded={open} aria-controls={id} onClick={() => onToggle(!open)}>
          {open ? closeLabel : openLabel}
        </PillButton>
      </div>
      <div
        id={id}
        ref={region}
        role="region"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`${open ? "" : "hidden"} print:block focus:outline-none ${regionClassName}`}
      >
        {children}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ hero */

/* The dot pattern fades toward the title and the fold instead of ending at
   a box edge: two gradients intersected with the pattern mask. */
const PATTERN_MASK = "url(/brand-pattern-01-mixed.svg), linear-gradient(to bottom, #000 45%, transparent 100%), linear-gradient(to right, transparent 0%, #000 30%)";
const HERO_LINK = "font-sans text-base font-bold text-white underline decoration-brand-carolina decoration-2 underline-offset-2 hover:decoration-white";

function Hero() {
  return (
    <Section tone="cobalt" className="relative overflow-hidden">
      {/* Decoration only: the 17A mixed-dot pattern, masked so it takes the
          field's text color at low opacity and dissolves at its edges.
          Hidden below lg, where the title block spans the full width. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 hidden h-[560px] w-[38%] bg-current opacity-[0.16] lg:block"
        style={{
          color: "#fff",
          maskImage: PATTERN_MASK,
          WebkitMaskImage: PATTERN_MASK,
          maskSize: "cover, 100% 100%, 100% 100%",
          WebkitMaskSize: "cover, 100% 100%, 100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "left top",
          WebkitMaskPosition: "left top",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      />
      <div className="relative">
        <p className="font-sans text-sm font-bold tracking-[0.14em] text-white/80 [font-variant-caps:all-small-caps]">
          {HERO.eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-[clamp(2.4rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight">
          {HERO.title}
        </h1>
        <span className="mt-7 block h-[3px] w-16 bg-brand-carolina" aria-hidden="true" />
        <p className="mt-6 max-w-3xl font-serif text-2xl font-bold leading-snug md:text-3xl">
          {HERO.rule}
        </p>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-brand-cobalt-100">
          {HERO.intro}
        </p>
        <p className="mt-3 font-sans text-base text-brand-cobalt-100">{HERO.fiction}</p>
        <p className="mt-3">
          <Link to={HERO.sampleLink.to} className={HERO_LINK}>
            {HERO.sampleLink.label}
          </Link>
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {HERO.lanes.map((lane) => (
            <div key={lane.id} className="rounded-md border border-white/20 bg-white/10 p-5">
              <div className="flex items-center gap-3">
                {/* The legend's own swatch on a white chip, so the key learned
                    here is the key the diagram uses. */}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-white">
                  <LaneSwatch lane={lane.id as Lane} />
                </span>
                <h2 className="font-serif text-xl font-bold leading-snug">{lane.title}</h2>
              </div>
              <ul className="mt-4 space-y-2.5 font-sans text-base leading-relaxed text-brand-cobalt-100">
                {lane.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-carolina" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-md border border-white/15 bg-brand-deepblue p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              <h2 className="font-serif text-2xl font-bold leading-snug">{HERO.wall.title}</h2>
              <p className="mt-2 font-sans text-base text-brand-cobalt-100">{HERO.wall.lead}</p>
              <ol className="mt-5 space-y-4">
                {HERO.wall.doors.map((door, i) => (
                  <li key={door.id} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-carolina/70 font-mono text-base font-bold text-brand-carolina">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-sans text-base font-bold">{door.label}</p>
                      <p className="mt-1 font-sans text-base leading-relaxed text-brand-cobalt-100">{door.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="self-start rounded-md border border-white/20 p-5">
              <h3 className="font-sans text-sm font-bold tracking-[0.14em] text-brand-carolina [font-variant-caps:all-small-caps]">
                {HERO.wall.neverTitle}
              </h3>
              <ul className="mt-3 grid gap-x-4 gap-y-2 font-sans text-base font-medium min-[360px]:grid-cols-2">
                {HERO.wall.never.map((n, i) => (
                  <li key={n} className={`flex items-baseline gap-2 ${i >= 4 ? "min-[360px]:col-span-2" : ""}`}>
                    <span aria-hidden="true" className="text-brand-carolina">×</span>
                    {n}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-white/20 pt-4 font-sans text-base leading-relaxed text-brand-cobalt-100">
                {HERO.wall.exception}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------- pipeline SVG */

const T = "font-sans";
const NODE_FILL: Record<"ai" | "code", { idle: string; on: string; hover: string; stroke: string }> = {
  ai: {
    idle: "fill-white",
    on: "fill-brand-carolina-100",
    hover: "group-hover:fill-brand-carolina-100 group-focus-visible:fill-brand-carolina-100",
    stroke: "stroke-brand-carolina",
  },
  code: {
    idle: "fill-white",
    on: "fill-brand-cobalt-100",
    hover: "group-hover:fill-brand-cobalt-100 group-focus-visible:fill-brand-cobalt-100",
    stroke: "stroke-brand-cobalt",
  },
};
/* The split node's label pill: vellum when open, vellum on hover. */
const SPLIT_LABEL_FILL = {
  on: "fill-brand-vellum",
  idle: "fill-white group-hover:fill-brand-vellum group-focus-visible:fill-brand-vellum",
};

type SelectStage = (id: StageId, opener: Element | null) => void;

function nodeProps(stage: Stage, selected: boolean, onSelect: SelectStage) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-expanded": selected,
    "aria-controls": STAGE_PANEL_ID,
    className: "group cursor-pointer outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cobalt",
    onClick: (e: MouseEvent<SVGGElement>) => onSelect(stage.id, e.currentTarget),
    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(stage.id, e.currentTarget);
      }
    },
  };
}

function PipelineWide({ selected, onSelect }: { selected: StageId | null; onSelect: SelectStage }) {
  /* Node geometry. Every gap that holds a gate is GAP_G wide, so the r=9
     circle clears both node edges by 6 and the dashed tier box (inset
     BOX_IN) by 2. The gap into the verdict node is GAP + 4, so its arrow can
     stop on the dashed box instead of crossing it. W follows from the sum. */
  const PAD = 6;
  const GAP = 8;
  const GAP_G = 30;
  const NW = 67;
  const BOX_IN = 4;
  const AI_Y = 36;
  const CODE_Y = 142;
  const NH = 64;
  const DIV = 121;
  const H = 246;
  const gates = new Map(WALL_GATES.map((g) => [g.from, g]));
  const gapAfter = (i: number) =>
    gates.has(STAGES[i].id) ? GAP_G : STAGES[i + 1]?.id === "verdict" ? GAP_G / 2 + BOX_IN : GAP;
  const xs: number[] = [];
  for (let i = 0; i < STAGES.length; i++) xs.push(i === 0 ? PAD : xs[i - 1] + NW + gapAfter(i - 1));
  const W = xs[STAGES.length - 1] + NW + PAD;
  const gateX = (fromIdx: number) => xs[fromIdx] + NW + GAP_G / 2;
  const laneY = (lane: Lane) => (lane === "ai" ? AI_Y + NH / 2 : CODE_Y + NH / 2);
  const idx = (id: StageId) => STAGES.findIndex((s) => s.id === id);
  const titleId = "hiw-wide-title";
  const descId = "hiw-wide-desc";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-labelledby={`${titleId} ${descId}`}
      className="block h-auto w-full min-w-[1040px] text-brand-charcoal"
    >
      <title id={titleId}>{SECTIONS.pipeline.svgTitle}</title>
      <desc id={descId}>{STAGES.map((s) => `${s.n}. ${s.title} (${s.who})`).join("; ")}</desc>
      <defs>
        <marker id="hiw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-brand-steel" />
        </marker>
        <clipPath id="hiw-wide-field">
          <rect x={0} y={0} width={W} height={H} rx={6} />
        </clipPath>
      </defs>
      {/* lane bands, painted inside one rounded field so the divider ends without a notch */}
      <g clipPath="url(#hiw-wide-field)">
        <rect x={0} y={0} width={W} height={DIV} className="fill-brand-carolina-50" />
        <rect x={0} y={DIV} width={W} height={H - DIV} className="fill-brand-cobalt-50" />
      </g>
      <line x1={0} y1={DIV} x2={W} y2={DIV} strokeWidth={2} strokeDasharray="6 5" className="stroke-brand-deepblue" />
      <text x={PAD} y={18} fontSize={13} fontWeight={700} className={`${T} fill-brand-charcoal`} style={{ fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" }}>
        {LANE_LEGEND.ai}
      </text>
      <text x={PAD} y={H - 12} fontSize={13} fontWeight={700} className={`${T} fill-brand-charcoal`} style={{ fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" }}>
        {LANE_LEGEND.code}
      </text>

      {/* connectors, drawn under the nodes */}
      {STAGES.slice(0, -1).map((s, i) => {
        const next = STAGES[i + 1];
        const gate = gates.get(s.id);
        const x1 = xs[i] + NW;
        /* The arrow into the verdict node stops on the dashed tier box. */
        const x2 = xs[i + 1] - (next.id === "verdict" ? BOX_IN + 1 : 1);
        let d: string;
        if (gate && gate.to === next.id) {
          const yFrom = laneY(s.lane === "both" || s.lane === "you" ? "code" : s.lane);
          const yTo = laneY(next.lane === "ai" ? "ai" : "code");
          const gx = gateX(i);
          d = `M ${x1} ${yFrom} H ${gx} V ${yTo} H ${x2}`;
        } else {
          const y = s.lane === "ai" && next.lane === "ai" ? laneY("ai") : laneY("code");
          d = `M ${x1} ${y} H ${x2}`;
        }
        return <path key={s.id} d={d} fill="none" strokeWidth={1.5} className="stroke-brand-steel" markerEnd="url(#hiw-arrow)" />;
      })}

      {/* the dashed tier box */}
      {(() => {
        const i = idx("verdict");
        return (
          <g aria-hidden="true">
            <rect x={xs[i] - BOX_IN} y={CODE_Y - BOX_IN} width={NW + 2 * BOX_IN} height={NH + 2 * BOX_IN} rx={10} fill="none" strokeWidth={1.5} strokeDasharray="5 4" className="stroke-brand-cobalt" />
            <text x={xs[i] + NW / 2} y={H - 12} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-cobalt`}>
              {TIER_SET_HERE.join(" ")}
            </text>
          </g>
        );
      })()}

      {/* nodes */}
      {STAGES.map((s, i) => {
        const x = xs[i];
        const sel = s.id === selected;
        const props = nodeProps(s, sel, onSelect);
        if (s.lane === "ai" || s.lane === "code") {
          const y = s.lane === "ai" ? AI_Y : CODE_Y;
          const f = NODE_FILL[s.lane];
          return (
            <g key={s.id} {...props}>
              <title>{`${s.n}. ${s.title}`}</title>
              <rect x={x} y={y} width={NW} height={NH} rx={8} strokeWidth={sel ? 3 : 1.5} className={`${sel ? f.on : `${f.idle} ${f.hover}`} ${f.stroke}`} />
              <text x={x + NW / 2} y={y + 18} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-cobalt`}>{s.n}</text>
              <text x={x + NW / 2} y={y + 37} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>{s.label[0]}</text>
              <text x={x + NW / 2} y={y + 53} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>{s.label[1]}</text>
            </g>
          );
        }
        const top = AI_Y;
        const h = CODE_Y + NH - AI_Y;
        if (s.lane === "you") {
          return (
            <g key={s.id} {...props}>
              <title>{`${s.n}. ${s.title}`}</title>
              <rect x={x} y={top} width={NW} height={h} rx={10} strokeWidth={sel ? 3 : 1.5} className="fill-brand-cream-deep stroke-brand-steel" />
              <text x={x + NW / 2} y={top + 82} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-cobalt`}>{s.n}</text>
              <text x={x + NW / 2} y={top + 100} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>{s.label[0]}</text>
              <text x={x + NW / 2} y={top + 116} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>{s.label[1]}</text>
            </g>
          );
        }
        /* both: an AI half above the wall, a code half below, label pill across */
        return (
          <g key={s.id} {...props}>
            <title>{`${s.n}. ${s.title}`}</title>
            <clipPath id={`hiw-clip-${s.id}`}>
              <rect x={x} y={top} width={NW} height={h} rx={10} />
            </clipPath>
            <g clipPath={`url(#hiw-clip-${s.id})`}>
              <rect x={x} y={top} width={NW} height={DIV - top} className="fill-brand-carolina-100" />
              <rect x={x} y={DIV} width={NW} height={top + h - DIV} className="fill-brand-cobalt-100" />
            </g>
            <rect x={x} y={top} width={NW} height={h} rx={10} fill="none" strokeWidth={sel ? 3 : 1.5} className="stroke-brand-deepblue" />
            <text x={x + NW / 2} y={top + 20} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-deepblue`}>{DIAGRAM_LABELS.ai}</text>
            <text x={x + NW / 2} y={top + h - 10} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-cobalt`}>{DIAGRAM_LABELS.code}</text>
            <rect x={x + 4} y={DIV - 27} width={NW - 8} height={54} rx={7} className={sel ? SPLIT_LABEL_FILL.on : SPLIT_LABEL_FILL.idle} strokeWidth={1} />
            <text x={x + NW / 2} y={DIV - 10} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-cobalt`}>{s.n}</text>
            <text x={x + NW / 2} y={DIV + 7} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>{s.label[0]}</text>
            <text x={x + NW / 2} y={DIV + 23} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>{s.label[1]}</text>
          </g>
        );
      })}

      {/* gates, drawn last so they sit on the connectors */}
      {WALL_GATES.map((g) => {
        const gx = gateX(idx(g.from));
        return (
          <g key={g.id} aria-hidden="true">
            <circle cx={gx} cy={DIV} r={9} className="fill-brand-deepblue" />
            <text x={gx} y={DIV + 5} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-white`}>{g.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PipelineNarrow({ selected, onSelect }: { selected: StageId | null; onSelect: SelectStage }) {
  /* One-line labels in 146-wide boxes. PITCH - NH = 28 holds the r=9 gate
     circle with 5 clear above and below; the dashed tier box (inset BOX_IN)
     stays 2 clear of gate C. */
  const W = 320;
  const AI_X = 6;
  const CODE_X = 168;
  const CW = 146;
  const INSET = 10;
  const DIV = 160;
  const Y0 = 30;
  const NH = 44;
  const PITCH = 72;
  const BOX_IN = 3;
  const H = Y0 + (STAGES.length - 1) * PITCH + NH + 14;
  const ys = STAGES.map((_, i) => Y0 + i * PITCH);
  const cx = (lane: Lane) => (lane === "ai" ? AI_X + CW / 2 : CODE_X + CW / 2);
  const gates = new Map(WALL_GATES.map((g) => [g.from, g]));
  const idx = (id: StageId) => STAGES.findIndex((s) => s.id === id);
  const titleId = "hiw-narrow-title";
  const descId = "hiw-narrow-desc";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-labelledby={`${titleId} ${descId}`}
      className="block w-full max-w-[420px] text-brand-charcoal"
    >
      <title id={titleId}>{SECTIONS.pipeline.svgTitle}</title>
      <desc id={descId}>{STAGES.map((s) => `${s.n}. ${s.title} (${s.who})`).join("; ")}</desc>
      <defs>
        <marker id="hiw-arrow-n" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-brand-steel" />
        </marker>
        <clipPath id="hiw-narrow-field">
          <rect x={0} y={0} width={W} height={H} rx={6} />
        </clipPath>
      </defs>
      <g clipPath="url(#hiw-narrow-field)">
        <rect x={0} y={0} width={DIV} height={H} className="fill-brand-carolina-50" />
        <rect x={DIV} y={0} width={W - DIV} height={H} className="fill-brand-cobalt-50" />
      </g>
      <line x1={DIV} y1={0} x2={DIV} y2={H} strokeWidth={2} strokeDasharray="6 5" className="stroke-brand-deepblue" />
      <text x={AI_X + CW / 2} y={18} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-charcoal`} style={{ fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" }}>{WHO_CHIP.ai}</text>
      <text x={CODE_X + CW / 2} y={18} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-charcoal`} style={{ fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" }}>{WHO_CHIP.code}</text>

      {STAGES.slice(0, -1).map((s, i) => {
        const next = STAGES[i + 1];
        const gate = gates.get(s.id);
        const y1 = ys[i] + NH;
        const y2 = ys[i + 1] - (next.id === "verdict" ? BOX_IN + 1 : 1);
        const mid = y1 + (PITCH - NH) / 2;
        let d: string;
        if (gate && gate.to === next.id) {
          const xFrom = cx(s.lane === "ai" ? "ai" : "code");
          const xTo = cx(next.lane === "ai" ? "ai" : "code");
          d = `M ${xFrom} ${y1} V ${mid} H ${xTo} V ${y2}`;
        } else {
          const x = s.lane === "ai" && next.lane === "ai" ? cx("ai") : cx("code");
          d = `M ${x} ${y1} V ${y2}`;
        }
        return <path key={s.id} d={d} fill="none" strokeWidth={1.5} className="stroke-brand-steel" markerEnd="url(#hiw-arrow-n)" />;
      })}

      {(() => {
        const i = idx("verdict");
        return (
          <g aria-hidden="true">
            <rect x={CODE_X - BOX_IN} y={ys[i] - BOX_IN} width={CW + 2 * BOX_IN} height={NH + 2 * BOX_IN} rx={10} fill="none" strokeWidth={1.5} strokeDasharray="5 4" className="stroke-brand-cobalt" />
          </g>
        );
      })()}

      {STAGES.map((s, i) => {
        const y = ys[i];
        const sel = s.id === selected;
        const props = nodeProps(s, sel, onSelect);
        if (s.lane === "ai" || s.lane === "code") {
          const x = s.lane === "ai" ? AI_X : CODE_X;
          const f = NODE_FILL[s.lane];
          return (
            <g key={s.id} {...props}>
              <title>{`${s.n}. ${s.title}`}</title>
              <rect x={x} y={y} width={CW} height={NH} rx={8} strokeWidth={sel ? 3 : 1.5} className={`${sel ? f.on : `${f.idle} ${f.hover}`} ${f.stroke}`} />
              <text x={x + INSET} y={y + 27} fontSize={13} fontWeight={500} className={`${T} fill-brand-charcoal`}>
                <tspan fontWeight={700} className="fill-brand-cobalt">{s.n}</tspan>
                {"  "}{s.label.join(" ")}
              </text>
            </g>
          );
        }
        const w = CODE_X + CW - AI_X;
        if (s.lane === "you") {
          return (
            <g key={s.id} {...props}>
              <title>{`${s.n}. ${s.title}`}</title>
              <rect x={AI_X} y={y} width={w} height={NH} rx={10} strokeWidth={sel ? 3 : 1.5} className="fill-brand-cream-deep stroke-brand-steel" />
              <text x={DIV} y={y + 27} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>
                <tspan fontWeight={700} className="fill-brand-cobalt">{s.n}</tspan>
                {"  "}{s.label.join(" ")}
              </text>
            </g>
          );
        }
        return (
          <g key={s.id} {...props}>
            <title>{`${s.n}. ${s.title}`}</title>
            <clipPath id={`hiw-nclip-${s.id}`}>
              <rect x={AI_X} y={y} width={w} height={NH} rx={10} />
            </clipPath>
            <g clipPath={`url(#hiw-nclip-${s.id})`}>
              <rect x={AI_X} y={y} width={DIV - AI_X} height={NH} className="fill-brand-carolina-100" />
              <rect x={DIV} y={y} width={AI_X + w - DIV} height={NH} className="fill-brand-cobalt-100" />
            </g>
            <rect x={AI_X} y={y} width={w} height={NH} rx={10} fill="none" strokeWidth={sel ? 3 : 1.5} className="stroke-brand-deepblue" />
            <text x={AI_X + 12} y={y + 27} fontSize={13} fontWeight={700} className={`${T} fill-brand-deepblue`}>{DIAGRAM_LABELS.ai}</text>
            <text x={AI_X + w - 12} y={y + 27} fontSize={13} fontWeight={700} textAnchor="end" className={`${T} fill-brand-cobalt`}>{DIAGRAM_LABELS.code}</text>
            <rect x={DIV - 72} y={y + 6} width={144} height={NH - 12} rx={7} className={sel ? SPLIT_LABEL_FILL.on : SPLIT_LABEL_FILL.idle} />
            <text x={DIV} y={y + 27} fontSize={13} fontWeight={500} textAnchor="middle" className={`${T} fill-brand-charcoal`}>
              <tspan fontWeight={700} className="fill-brand-cobalt">{s.n}</tspan>
              {"  "}{s.label.join(" ")}
            </text>
          </g>
        );
      })}

      {WALL_GATES.map((g) => {
        const i = idx(g.from);
        const mid = ys[i] + NH + (PITCH - NH) / 2;
        return (
          <g key={g.id} aria-hidden="true">
            <circle cx={DIV} cy={mid} r={9} className="fill-brand-deepblue" />
            <text x={DIV} y={mid + 5} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-white`}>{g.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------- report parts */

/* The chip chooser and part card, rendered inside stage 14's card (the
   report is that stage's subject). Roving tabindex; the card announces. */
function ReportParts({ printCopy }: { printCopy?: boolean }) {
  const [part, setPart] = useState(REPORT_PARTS[0].id);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = REPORT_PARTS.find((p) => p.id === part)!;
  const lane: Lane = current.who === "ai" ? "ai" : current.who === "both" ? "both" : "code";
  const move = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = REPORT_PARTS.length;
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    setPart(REPORT_PARTS[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div id={printCopy ? undefined : "who-wrote-it"} className={`mt-8 border-t border-brand-silver-soft pt-6 ${SCROLL_MT}`}>
      <p className={LABEL}>{SECTIONS.parts.eyebrow}</p>
      <h4 id={`${id}-t`} className="mt-1 font-serif text-xl font-bold leading-snug text-brand-cobalt">{SECTIONS.parts.title}</h4>
      <p className="mt-2 max-w-2xl font-sans text-base leading-relaxed">{SECTIONS.parts.intro}</p>
      <p className="mt-2 font-sans text-base">
        <Link to={SECTIONS.parts.sampleLink.to} target="_blank" rel="noopener" className={INLINE_LINK}>
          {SECTIONS.parts.sampleLink.label}
        </Link>
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div role="radiogroup" aria-labelledby={`${id}-t`} className="grid grid-cols-1 gap-1.5 sm:flex sm:flex-wrap sm:content-start sm:gap-2">
          {REPORT_PARTS.map((p, i) => {
            const checked = p.id === part;
            return (
              <button
                key={p.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => setPart(p.id)}
                onKeyDown={(e) => move(e, i)}
                className={`w-full rounded-md border px-3.5 py-1.5 text-left font-sans text-sm font-medium leading-snug transition-colors sm:w-auto sm:rounded-pill ${
                  checked
                    ? "border-brand-cobalt bg-brand-cobalt text-white"
                    : "border-brand-steel bg-white text-brand-charcoal hover:border-brand-cobalt"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="rounded-md bg-brand-vellum p-5" aria-live="polite">
          <WhoChip lane={lane} />
          <h5 className="mt-3 font-serif text-xl font-bold leading-snug text-brand-cobalt">{current.label}</h5>
          <p className="mt-2 font-sans text-base font-bold text-brand-ink">{PART_LEADS[current.who]}</p>
          {current.who !== "code" && (
            <p className="mt-1 font-sans text-sm leading-relaxed text-brand-charcoal-soft">{PART_SCREEN}</p>
          )}
          <p className="mt-3 font-sans text-base leading-relaxed">{current.rule}</p>
          {current.id === "meets-n-of-7" && <p className={SMALL_KEY}>{MEETS_KEY}</p>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ stage card */

function anchorHref(anchor: string): string | null {
  const m = anchor.match(/^([^\s:]+)(?::(\d+)(?:-(\d+))?)?/);
  if (!m) return null;
  const [, path, from, to] = m;
  const lines = from ? `#L${from}${to ? `-L${to}` : ""}` : "";
  return `${REPO}${path}${lines}`;
}

const TRY_RULE_TARGET: Partial<Record<StageId, string>> = {
  ties: "#credit-lab",
  research: "#source-lab",
  verdict: "#tier-lab",
};

function StageCard({
  stage,
  printCopy,
  headingRef,
  onClose,
}: {
  stage: Stage;
  /* The always-in-DOM print list: no close control, no duplicated ids. */
  printCopy?: boolean;
  headingRef?: RefObject<HTMLHeadingElement>;
  onClose?: () => void;
}) {
  const gate = WALL_GATES.find((g) => g.id === stage.gate);
  const headingId = `stage-${stage.id}-h${printCopy ? "-print" : ""}`;
  const tryRule = TRY_RULE_TARGET[stage.id];
  /* A long outputs paragraph reads better at one column than squeezed beside a short inputs one. */
  const wide = stage.outputs.length > 500;
  return (
    <article
      id={printCopy ? undefined : `stage-${stage.id}`}
      className={`${CARD} ${printCopy ? "" : SCROLL_MT}`}
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <WhoChip lane={stage.lane} />
          <span className="font-mono text-[13px] tabular-nums text-brand-charcoal-soft">
            {SECTIONS.pipeline.stepOf(stage.n)}
          </span>
        </div>
        {onClose && (
          <span className="text-brand-cobalt print:hidden">
            <PillButton variant="ghost" onClick={onClose} className="!px-4 !py-1.5 !text-sm">
              {SECTIONS.pipeline.close}
            </PillButton>
          </span>
        )}
      </div>
      <h3
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className={`mt-4 font-serif font-bold leading-snug text-brand-cobalt focus:outline-none ${printCopy ? "text-2xl" : "text-2xl md:text-3xl"}`}
      >
        {stage.title}
      </h3>
      <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed md:text-lg">{stage.plain}</p>

      <dl className={`mt-6 grid gap-6 ${wide ? "" : "md:grid-cols-2"}`}>
        <div>
          <dt className={LABEL}>{STAGE_FIELD_LABELS.inputs}</dt>
          <dd className="mt-2 max-w-2xl font-sans text-base leading-relaxed">{stage.inputs}</dd>
        </div>
        <div>
          <dt className={LABEL}>{STAGE_FIELD_LABELS.outputs}</dt>
          <dd className="mt-2 max-w-2xl font-sans text-base leading-relaxed">{stage.outputs}</dd>
          {stage.id === "registry" && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={STAGE_FIELD_LABELS.sources}>
              {Object.entries(REGISTRY_LANES).map(([id, label]) => (
                <li key={id} className="rounded-pill bg-brand-cobalt-50 px-3 py-1 font-sans text-[13px] font-medium text-brand-cobalt">
                  {label}
                </li>
              ))}
            </ul>
          )}
          {stage.id === "assembly" && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={STAGE_FIELD_LABELS.honestyGroups}>
              {HONESTY_GROUP_LABELS.map((label) => (
                <li key={label} className="rounded-pill bg-brand-vellum px-3 py-1 font-sans text-[13px] font-medium text-brand-charcoal">
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </dl>

      {stage.id === "verdict" && (
        <div className="mt-6">
          <p className={LABEL}>{STAGE_FIELD_LABELS.triggerKinds}</p>
          <ol className="mt-2 max-w-2xl list-decimal space-y-1.5 pl-6 font-sans text-base leading-relaxed">
            {TRIGGER_KINDS.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 rounded-md bg-brand-cream-deep p-5">
        <p className={LABEL}>{STAGE_FIELD_LABELS.inThisCheck}</p>
        <p className="mt-2 font-sans text-base leading-relaxed">{stage.inThisCheck}</p>
      </div>

      {/* A rule, not an alert: the carolina rule idiom, like the other callouts. */}
      <div className="mt-6 border-l-4 border-brand-carolina pl-4">
        <p className={LABEL}>{STAGE_FIELD_LABELS.never}</p>
        <p className="mt-1 font-sans text-base leading-relaxed">{stage.never}</p>
      </div>

      {gate && (
        <div className="mt-6 flex gap-4 rounded-md border border-brand-deepblue/30 bg-brand-cobalt-50 p-5">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deepblue font-sans text-sm font-bold text-white">
            {gate.id}
          </span>
          <div>
            <p className={LABEL}>{STAGE_FIELD_LABELS.gate}</p>
            <p className="mt-1 font-sans text-base font-bold text-brand-ink">{gate.label}</p>
            <p className="mt-1 font-sans text-base leading-relaxed">{gate.detail}</p>
          </div>
        </div>
      )}

      <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-base">
        {tryRule && (
          <span className="text-brand-cobalt">
            <PillButton variant="ghost" to={tryRule} className="!px-4 !py-1.5 !text-sm">
              {STAGE_FIELD_LABELS.tryRule}
            </PillButton>
          </span>
        )}
        <a href={`/methodology#${stage.methodologyRef}`} className={INLINE_LINK}>
          {STAGE_FIELD_LABELS.method}
        </a>
      </p>

      <details className="mt-4 group">
        <summary className="cursor-pointer list-none font-sans text-sm font-bold text-brand-charcoal-soft [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
          {STAGE_FIELD_LABELS.code}
        </summary>
        <ul className="mt-3 space-y-1.5 font-mono text-[13px] leading-snug text-brand-charcoal-soft">
          {stage.anchors.map((a) => {
            const href = anchorHref(a);
            return (
              <li key={a} className="break-words">
                {href ? (
                  <a href={href} className="underline decoration-brand-silver underline-offset-2 hover:text-brand-cobalt">
                    {a}
                  </a>
                ) : (
                  a
                )}
              </li>
            );
          })}
        </ul>
      </details>

      {stage.id === "report" && <ReportParts printCopy={printCopy} />}

      {/* The card is long on a phone; a second Close sits at its foot. */}
      {onClose && (
        <p className="mt-6 text-brand-cobalt md:hidden print:hidden">
          <PillButton variant="ghost" onClick={onClose} className="!px-4 !py-1.5 !text-sm">
            {SECTIONS.pipeline.close}
          </PillButton>
        </p>
      )}
    </article>
  );
}

function PipelineSection({
  selected,
  setSelected,
}: {
  selected: StageId | null;
  setSelected: (id: StageId | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [announce, setAnnounce] = useState("");
  const i = selected ? STAGES.findIndex((s) => s.id === selected) : -1;
  const stage = i >= 0 ? STAGES[i] : null;
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<Element | null>(null);
  const showAllWrap = useRef<HTMLSpanElement>(null);
  const pendingFocus = useRef(false);
  const pendingScroll = useRef(false);
  const controlsShown = selected !== null && !showAll;

  const close = () => {
    const opener = openerRef.current;
    openerRef.current = null;
    setSelected(null);
    if (opener && opener.isConnected && "focus" in opener) (opener as HTMLElement).focus();
    else showAllWrap.current?.querySelector("button")?.focus();
  };
  /* A second press on the open node or line closes it, matching aria-expanded. */
  const select: SelectStage = (id, opener) => {
    if (id === selected && !showAll) {
      close();
      return;
    }
    openerRef.current = opener;
    pendingFocus.current = true;
    setShowAll(false);
    setSelected(id);
  };
  const step = (delta: number) => {
    if (i < 0) return;
    const j = Math.min(STAGES.length - 1, Math.max(0, i + delta));
    pendingScroll.current = true;
    setAnnounce(`${SECTIONS.pipeline.stepOf(STAGES[j].n)}. ${STAGES[j].title}`);
    setSelected(STAGES[j].id);
  };
  const toggleAll = (e: MouseEvent<HTMLElement>) => {
    if (showAll && selected === null) select(STAGES[0].id, e.currentTarget);
    else setShowAll((v) => !v);
  };
  useEffect(() => {
    if (!selected) return;
    if (pendingFocus.current) {
      /* A pressed node or worked-example line: bring the panel into view and
         put focus on the card's heading so the next Tab lands inside. */
      pendingFocus.current = false;
      panelRef.current?.scrollIntoView({ block: "nearest" });
      headingRef.current?.focus({ preventScroll: true });
      return;
    }
    if (pendingScroll.current) {
      /* Previous or Next: keep focus on the pressed pill, keep the panel in view. */
      pendingScroll.current = false;
      panelRef.current?.scrollIntoView({ block: "nearest" });
      return;
    }
    /* Opened by a hash: the page scrolls to the target; focus follows. */
    headingRef.current?.focus({ preventScroll: true });
  }, [selected]);
  /* A stage opened by a hash shows its card even while every step is shown. */
  useEffect(() => {
    if (selected !== null) setShowAll(false);
  }, [selected]);

  return (
    <Section tone="cream" id="pipeline" className={SCROLL_MT}>
      <Kicker n={SECTIONS.pipeline.kicker} text={SECTIONS.pipeline.eyebrow} />
      <h2 className={H2}>{SECTIONS.pipeline.title}</h2>
      <p className={INTRO}>
        {SECTIONS.pipeline.intro}{" "}
        <span className="hidden min-[1140px]:inline">{SECTIONS.pipeline.lanesWide}</span>
        <span className="min-[1140px]:hidden">{SECTIONS.pipeline.lanesNarrow}</span>{" "}
        {SECTIONS.pipeline.introTail}
      </p>

      {/* The wide diagram needs about 1090px of card interior to sit at
          13px without scrolling: section padding 64 + card padding 32 puts
          that at a 1140 viewport with the card bled 24px; at xl the column
          is wide enough and the card sits inside it. */}
      <div className="mt-10 rounded-md border border-brand-silver-soft bg-white p-1.5 shadow-soft sm:p-3 md:p-4 min-[1140px]:-mx-6 xl:mx-0">
        <div className="hidden overflow-x-auto min-[1140px]:block print:hidden">
          <p className="px-1 pb-1 text-right font-sans text-sm text-brand-charcoal-soft print:hidden">{SECTIONS.pipeline.pressHint}</p>
          <PipelineWide selected={selected} onSelect={select} />
        </div>
        <div className="flex flex-col items-center min-[1140px]:hidden print:flex">
          <PipelineNarrow selected={selected} onSelect={select} />
          <p className="px-1 pt-2 font-sans text-sm text-brand-charcoal-soft print:hidden">{SECTIONS.pipeline.pressHint}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <p className={LABEL}>{SECTIONS.pipeline.legend}</p>
          <ul className="mt-2 grid grid-cols-1 gap-x-5 gap-y-2 font-sans text-sm min-[420px]:grid-cols-2" aria-label={SECTIONS.pipeline.legend}>
            {(["ai", "code", "both", "you"] as Lane[]).map((lane) => (
              <li key={lane} className="flex items-center gap-2">
                <LaneSwatch lane={lane} />
                {LANE_LEGEND[lane]}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={LABEL}>{SECTIONS.pipeline.gatesTitle}</p>
          <dl className="mt-2 grid gap-2 font-sans text-sm sm:grid-cols-2">
            {WALL_GATES.map((g) => (
              <div key={g.id} className="flex items-baseline gap-2">
                <dt className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-deepblue text-[11px] font-bold text-white">
                  {g.id}
                </dt>
                <dd className="[text-wrap:balance]">{g.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* The worked example, visible without a click: six leads of the
          ClaraDocs story, each a button into that stage's card, with the
          hub's two pills at its foot. */}
      <div className="mt-8 rounded-md bg-brand-cream-deep p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className={LABEL}>{STAGE_FIELD_LABELS.inThisCheck}</p>
          <p className="font-sans text-sm text-brand-charcoal-soft print:hidden">{SECTIONS.pipeline.pressHint}</p>
        </div>
        <ol className="mt-3 grid gap-2 md:grid-cols-2">
          {WORKED_EXAMPLE_STAGES.map((id) => {
            const s = STAGES.find((x) => x.id === id)!;
            const on = selected === id && !showAll;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-controls={STAGE_PANEL_ID}
                  aria-expanded={on}
                  onClick={(e) => select(id, e.currentTarget)}
                  className={`flex h-full w-full flex-col items-start justify-start rounded-md border p-4 text-left transition-colors ${
                    on ? "border-brand-cobalt bg-white" : "border-transparent bg-white/70 hover:border-brand-cobalt hover:bg-white"
                  }`}
                >
                  <span className="block font-sans text-base font-bold text-brand-cobalt">{`${s.n}. ${s.title}`}</span>
                  <span className="mt-1 block font-sans text-[15px] leading-relaxed text-brand-charcoal">
                    {workedLead(s)}{" "}
                    <span className="whitespace-nowrap font-sans text-sm font-bold text-brand-cobalt print:hidden">{SECTIONS.pipeline.openStep(s.n)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex flex-wrap gap-3 text-brand-cobalt print:hidden">
          <span ref={showAllWrap}>
            <PillButton variant="ghost" aria-expanded={showAll} aria-controls="hiw-all-stages" onClick={toggleAll}>
              {showAll ? SECTIONS.pipeline.showOne : SECTIONS.pipeline.showAll}
            </PillButton>
          </span>
          <PillButton variant="ghost" to="#who-wrote-it">
            {SECTIONS.parts.title}
          </PillButton>
        </div>
      </div>

      <div className={SCROLL_MT} ref={panelRef}>
        {controlsShown && (
          <div className="mt-8 flex flex-wrap items-center gap-3 text-brand-cobalt print:hidden">
            <PillButton variant="ghost" onClick={() => step(-1)} disabled={i <= 0}>
              {SECTIONS.pipeline.previous}
            </PillButton>
            <PillButton variant="ghost" onClick={() => step(1)} disabled={i >= STAGES.length - 1}>
              {SECTIONS.pipeline.next}
            </PillButton>
            <p className="sr-only" aria-live="polite">
              {announce}
            </p>
          </div>
        )}

        <div
          id={STAGE_PANEL_ID}
          role="region"
          aria-labelledby={stage ? `stage-${stage.id}-h` : undefined}
          hidden={stage === null || showAll}
          className="mt-6 print:hidden"
          onKeyDown={(e) => {
            if (e.key === "Escape" && stage) {
              e.stopPropagation();
              close();
            }
          }}
        >
          {stage && <StageCard stage={stage} headingRef={headingRef} onClose={close} />}
        </div>
        <ol id="hiw-all-stages" className={`mt-8 space-y-6 ${showAll ? "" : "hidden"} print:block`}>
          {STAGES.map((s) => (
            <li key={s.id}>
              <StageCard stage={s} printCopy />
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- credit lab */

function CandidateChip() {
  return (
    <span className="inline-flex items-center rounded-pill bg-brand-vellum px-2.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide text-brand-charcoal-soft">
      {LEDGER_CHIP_LABELS.candidate}
    </span>
  );
}

function DimensionChip() {
  return (
    <span className="inline-flex items-center rounded-pill border border-brand-steel px-2.5 py-0.5 font-mono text-xs font-bold text-brand-charcoal">
      {LEDGER_CHIP_LABELS.dimension}
    </span>
  );
}

/* The chip key, folded: the one-line reading first, then every evidence
   grade and every area. Rendered under both illustrative ledger rows. */
function ChipKey() {
  return (
    <details className="group mt-2">
      <summary className="cursor-pointer list-none font-sans text-sm font-bold text-brand-charcoal-soft [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
        {SECTIONS.credit.chipKeyTitle}
      </summary>
      <p className={SMALL_KEY}>{CHIP_KEY}</p>
      <ul className="mt-3 space-y-1.5 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">
        {CHIP_KEY_TIERS.map((t) => (
          <li key={t.code}>{t.text}</li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        {CHIP_KEY_DIMENSIONS.map((d) => (
          <Fragment key={d.code}>
            <dt className="font-mono font-bold text-brand-charcoal">{d.code}</dt>
            <dd>{d.name}</dd>
          </Fragment>
        ))}
      </dl>
    </details>
  );
}

function CoverageLimitedCard() {
  const c = COVERAGE_LIMITED_CARD;
  return (
    <div className={CARD}>
      <h3 className="font-serif text-2xl font-bold leading-snug text-brand-cobalt">{c.title}</h3>
      <p className="mt-3 font-sans text-base leading-relaxed">{c.lead}</p>

      <div className="mt-6 rounded-md border border-brand-silver-soft p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <ResultChip result={c.row.result} />
          <EvidenceTierBadge tier={c.row.evidenceTier} />
          <DimensionChip />
        </div>
        <p className="mt-3 font-sans text-sm text-brand-charcoal-soft">
          <span className="font-bold text-brand-charcoal">{c.row.whatCheckedLabel}</span> {c.row.whatChecked}
        </p>
        <p className="mt-2 font-sans text-[15px] leading-relaxed">{c.row.note}</p>
      </div>
      <ChipKey />

      <div className="mt-4 rounded-md bg-brand-vellum p-4">
        <p className={LABEL}>{c.honesty.group}</p>
        <p className="mt-2 font-sans text-[15px] leading-snug">
          <span className="font-bold">{c.honesty.label}</span>
          <span className="mt-1 block sm:ml-2 sm:mt-0 sm:inline">
            <Token tone="muted">{c.honesty.status}</Token>
          </span>
        </p>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">{c.honesty.reason}</p>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">{c.honesty.groupNote}</p>
      </div>

      <div className="mt-4 rounded-md border border-brand-silver-soft p-4">
        <h4 className="font-serif text-lg font-bold leading-snug text-brand-cobalt">{c.manual.label}</h4>
        <p className="mt-2 font-sans text-sm leading-relaxed">{c.manual.instructions}</p>
        <p className="mt-3 border-t border-brand-silver-soft pt-3 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">
          <span className="font-bold text-status-warn-text">{c.manual.whatBadLabel}</span> {c.manual.whatBad}
        </p>
      </div>

      <p className="mt-5 border-l-4 border-brand-carolina pl-4 font-sans text-base font-bold leading-relaxed text-brand-ink">
        {c.rule}
      </p>
    </div>
  );
}

function CreditSection({
  tableOpen,
  setTableOpen,
}: {
  tableOpen: boolean;
  setTableOpen: (open: boolean) => void;
}) {
  const [scenario, setScenario] = useState<CreditScenario>(CREDIT_DEFAULT);
  const [preset, setPreset] = useState<string | null>(CREDIT_PRESETS[0].id);
  const unreachable = preset === "unreachable";
  const result = useMemo(() => runCredit(scenario), [scenario]);
  const inert = useMemo(() => inertCreditControls(scenario), [scenario]);
  const tableId = "hiw-credit-table";
  const set = (key: string, value: string) => {
    setScenario((s) => ({ ...s, [key]: value }));
    setPreset(null);
  };
  const pick = (id: string) => {
    const p = CREDIT_PRESETS.find((x) => x.id === id)!;
    setPreset(id);
    if (p.scenario) setScenario(p.scenario);
  };
  const visible = CREDIT_CONTROLS.filter((c) => !c.rare);
  const rare = CREDIT_CONTROLS.filter((c) => c.rare);
  const credited = result.verdict === "attributed";

  return (
    <Section tone="tint" id="credit-lab" className={SCROLL_MT}>
      <Kicker n={SECTIONS.credit.kicker} text={SECTIONS.credit.eyebrow} />
      <h2 className={H2}>{SECTIONS.credit.title}</h2>
      <p className={INTRO}>{SECTIONS.credit.intro}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-7">
          <PresetRow label={SECTIONS.credit.presets} items={CREDIT_PRESETS} activeId={preset} onPick={pick} />
          <div className={`space-y-6 ${unreachable ? "opacity-50" : ""}`} aria-disabled={unreachable}>
            {visible.map((c) => (
              <SegmentedRadio
                key={c.key}
                control={c}
                value={scenario[c.key] ?? ""}
                onChange={(v) => set(c.key, v)}
                inert={!unreachable && inert.has(c.key)}
                inertLabel={SECTIONS.credit.noEffect}
              />
            ))}
            <details className="rounded-md border border-brand-silver-soft bg-white p-4">
              <summary className="cursor-pointer list-none font-sans text-base font-bold text-brand-ink [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="mr-2 text-brand-cobalt">+</span>
                {CREDIT_RARE_TITLE}
              </summary>
              <div className="mt-5 space-y-6">
                {rare.map((c) => (
                  <SegmentedRadio
                    key={c.key}
                    control={c}
                    value={scenario[c.key] ?? ""}
                    onChange={(v) => set(c.key, v)}
                    inert={!unreachable && inert.has(c.key)}
                    inertLabel={SECTIONS.credit.noEffect}
                  />
                ))}
              </div>
            </details>
          </div>
        </div>

        <div aria-live="polite">
          {unreachable ? (
            <CoverageLimitedCard />
          ) : (
            <div className={CARD}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-pill px-4 py-1.5 font-sans text-sm font-bold uppercase tracking-wide ${
                    credited ? "bg-status-good-soft text-status-good" : "bg-brand-vellum text-brand-charcoal-soft"
                  }`}
                >
                  {result.stamp}
                </span>
              </div>
              <p className={`mt-5 ${LABEL}`}>{SECTIONS.credit.ruleTitle}</p>
              <h3 className="mt-1 font-serif text-2xl font-bold leading-snug text-brand-cobalt">
                {result.row.group}: {result.row.situation.toLowerCase()}
              </h3>
              <p className="mt-2 font-sans text-base leading-relaxed">{result.row.rule}</p>
              <p className="mt-2 font-sans text-sm">
                <Link to={`#rule-${result.ruleId}`} className={INLINE_LINK}>
                  {SECTIONS.credit.jumpToRule}
                </Link>
              </p>

              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {result.effects.map((e) => (
                  <div key={e.question} className="rounded-md bg-brand-vellum p-4">
                    <dt className="font-sans text-sm font-bold text-brand-ink [text-wrap:balance]">{e.question}</dt>
                    <dd className="mt-2">
                      <Token tone={e.tone} wrap>
                        {e.answer}
                      </Token>
                      <p className="mt-2 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">{e.detail}</p>
                    </dd>
                  </div>
                ))}
              </dl>

              <p className={`mt-6 flex flex-wrap items-center gap-2 ${LABEL}`}>
                {SECTIONS.credit.sentenceTitle}
                <Token tone="muted">{SECTIONS.credit.illustrative}</Token>
              </p>
              <div className="mt-2 rounded-md border border-brand-silver-soft p-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <ResultChip result={result.ledger.result} />
                  <EvidenceTierBadge tier={result.ledger.evidenceTier} />
                  <DimensionChip />
                  {result.ledger.candidate && <CandidateChip />}
                  {result.ledger.severity && <Token tone="warn">{result.ledger.severity}</Token>}
                </div>
                <p className="mt-2 font-sans text-[13px] text-brand-charcoal-soft">{result.ledger.caption}</p>
                <p className="mt-3 font-sans text-[15px] leading-relaxed">{result.sentence}</p>
              </div>
              <ChipKey />

              {result.knownGap && (
                <p className="mt-4 rounded-md bg-status-warn-soft p-4 font-sans text-sm leading-relaxed text-brand-charcoal">
                  {result.knownGap}
                </p>
              )}
              {result.collision && (
                <p className="mt-4 rounded-md bg-status-warn-soft p-4 font-sans text-sm leading-relaxed text-brand-charcoal">
                  {result.collision}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-14">
        <h3 id="hiw-credit-table-t" className="font-serif text-2xl font-bold leading-snug text-brand-cobalt">{SECTIONS.credit.tableTitle}</h3>
        <p className="mt-2 max-w-prose font-sans text-base leading-relaxed">{SECTIONS.credit.tableIntro}</p>
        <Fold
          id={tableId}
          labelledBy="hiw-credit-table-t"
          open={tableOpen}
          onToggle={setTableOpen}
          openLabel={SECTIONS.credit.readRules}
          closeLabel={SECTIONS.credit.hideRules}
          className="mt-4 text-brand-cobalt"
        >
          {/* md and up: the table, with Situation and Result at fixed widths so
              the Result column never collapses. Below md: one stacked card per
              rule, so nothing sits off-screen. Same rows, one visible at a time. */}
          <div className="mt-6 hidden overflow-hidden rounded-md border border-brand-silver-soft bg-white md:block">
            <table className="w-full border-collapse text-left font-sans text-sm">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[44%]" />
                <col className="w-[32%]" />
              </colgroup>
              <thead className="border-b-2 border-brand-ink/20">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold text-brand-ink">{TRUTH_TABLE_HEADERS.situation}</th>
                  <th scope="col" className="px-4 py-3 font-bold text-brand-ink">{TRUTH_TABLE_HEADERS.rule}</th>
                  <th scope="col" className="px-4 py-3 font-bold text-brand-ink">{TRUTH_TABLE_HEADERS.result}</th>
                </tr>
              </thead>
              <tbody>
                {TRUTH_TABLE.map((row, i) => {
                  const live = !unreachable && row.id === result.ruleId;
                  const firstOfGroup = i === 0 || TRUTH_TABLE[i - 1].group !== row.group;
                  return (
                    <FragmentRow key={row.id} showGroup={firstOfGroup} group={row.group}>
                      <tr
                        id={`rule-${row.id}`}
                        aria-current={live ? "true" : undefined}
                        className={`border-b border-brand-ink/10 align-top ${SCROLL_MT} ${live ? "bg-brand-cobalt-50" : ""}`}
                      >
                        <th scope="row" className="px-4 py-3 font-medium text-brand-ink">
                          <span className="flex flex-wrap items-center gap-2">
                            {row.situation}
                            {live && <Token tone="cobalt">{TRUTH_TABLE_HEADERS.live}</Token>}
                          </span>
                        </th>
                        <td className="px-4 py-3 leading-relaxed">{row.rule}</td>
                        <td className="px-4 py-3 leading-relaxed">{row.result}</td>
                      </tr>
                    </FragmentRow>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ol className="mt-6 md:hidden" aria-label={SECTIONS.credit.tableTitle}>
            {TRUTH_TABLE.map((row, i) => {
              const live = !unreachable && row.id === result.ruleId;
              const firstOfGroup = i === 0 || TRUTH_TABLE[i - 1].group !== row.group;
              return (
                <li key={row.id} id={`rule-${row.id}-m`} className={`${SCROLL_MT} ${firstOfGroup ? (i === 0 ? "" : "mt-8") : "mt-3"}`}>
                  {firstOfGroup && <p className="mb-3 font-sans text-base font-bold text-brand-ink">{row.group}</p>}
                  <div
                    aria-current={live ? "true" : undefined}
                    className={`rounded-md border p-4 ${live ? "border-brand-cobalt/40 bg-brand-cobalt-50" : "border-brand-silver-soft bg-white"}`}
                  >
                    <p className="flex flex-wrap items-center gap-2 font-sans text-base font-bold text-brand-ink">
                      {row.situation}
                      {live && <Token tone="cobalt">{TRUTH_TABLE_HEADERS.live}</Token>}
                    </p>
                    <p className="mt-2 font-sans text-sm leading-relaxed">{row.rule}</p>
                    <p className="mt-3 font-sans text-sm leading-relaxed">
                      <span className={`mr-2 ${LABEL}`}>{TRUTH_TABLE_HEADERS.result}</span>
                      {row.result}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Fold>
      </div>
    </Section>
  );
}

function FragmentRow({ showGroup, group, children }: { showGroup: boolean; group: string; children: ReactNode }) {
  return (
    <>
      {showGroup && (
        <tr className="bg-brand-vellum">
          <th scope="colgroup" colSpan={3} className="px-4 py-2 font-sans text-xs font-bold tracking-[0.1em] text-brand-charcoal-soft [font-variant-caps:all-small-caps]">
            {group}
          </th>
        </tr>
      )}
      {children}
    </>
  );
}

/* --------------------------------------------------------------- tier lab */

function LadderSvg({ tier, capped }: { tier: number; capped: boolean }) {
  const W = 320;
  const x0 = 24;
  const x1 = 302;
  const top = 28;
  const gap = 48;
  const rungY = (idx: number) => top + gap * idx;
  const H = top + gap * 4 + 64;
  const capIdx = TIER_LADDER.findIndex((r) => r.tier === 2);
  const yCap = rungY(capIdx) - 28;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="hiw-ladder-t hiw-ladder-d" className="block h-auto w-full max-w-[400px] text-brand-charcoal">
      <title id="hiw-ladder-t">{LADDER_TEXT.title}</title>
      <desc id="hiw-ladder-d">{LADDER_TEXT.desc}</desc>
      <line x1={x0} y1={top - 14} x2={x0} y2={rungY(4) + 16} strokeWidth={3} className="stroke-brand-silver" />
      <line x1={x1} y1={top - 14} x2={x1} y2={rungY(4) + 16} strokeWidth={3} className="stroke-brand-silver" />
      {TIER_LADDER.map((r, idx) => {
        const y = rungY(idx);
        const live = r.tier === tier;
        return (
          <g key={r.tier}>
            <line x1={x0} y1={y} x2={x1} y2={y} strokeWidth={live ? 6 : 3} className={live ? "stroke-brand-cobalt" : "stroke-brand-silver"} />
            <circle cx={x0} cy={y} r={13} strokeWidth={2} className={live ? "fill-brand-cobalt stroke-brand-cobalt" : "fill-white stroke-brand-cobalt"} />
            <text x={x0} y={y + 5} fontSize={14} fontWeight={700} textAnchor="middle" className={`${T} ${live ? "fill-white" : "fill-brand-cobalt"}`}>{r.tier}</text>
            <text x={x0 + 20} y={y - 8} fontSize={13} fontWeight={live ? 700 : 500} className={`${T} fill-brand-charcoal`}>
              {LADDER_TEXT.rung(r)}
            </text>
            {live && (
              <text x={x0 + 20} y={y + 18} fontSize={13} fontWeight={700} className={`${T} fill-brand-cobalt`}>
                {`(${LADDER_TEXT.here})`}
              </text>
            )}
          </g>
        );
      })}
      {capped && (
        <g>
          <line x1={x0 + 14} y1={yCap} x2={x1} y2={yCap} strokeWidth={2} strokeDasharray="6 4" className="stroke-status-warn" />
          <text x={x1 - 4} y={yCap - 6} fontSize={13} fontWeight={700} textAnchor="end" className={`${T} fill-status-warn`}>{LADDER_TEXT.cap}</text>
        </g>
      )}
      {/* The foot sits on the rung-label column, two lines so it never runs past the right rail. */}
      {LADDER_TEXT.foot.map((line, i) => (
        <text key={line} x={x0 + 20} y={H - 24 + i * 16} fontSize={13} className={`${T} fill-brand-charcoal-soft`}>{line}</text>
      ))}
    </svg>
  );
}

function TierSection() {
  const [scenario, setScenario] = useState<TierScenario>(TIER_DEFAULT);
  const [preset, setPreset] = useState<string | null>(TIER_PRESETS[1].id);
  const [fedramp, setFedramp] = useState<string | null>(FEDRAMP_SCENARIOS[0].id);
  const [fedOpen, setFedOpen] = useState(false);
  const { inputs, decision } = useMemo(() => runTier(scenario), [scenario]);
  const outcomes = useMemo(() => stepOutcomes(inputs, decision), [inputs, decision]);
  const met = pointsMet(inputs);
  const plain = plainWords(scenario, inputs, decision);
  const capPresent = outcomes.cap !== "Not present";
  const set = (key: string, value: string) => {
    setScenario((s) => ({ ...s, [key]: value, finding: undefined }));
    setPreset(null);
    setFedramp(null);
  };
  const pickPreset = (id: string) => {
    const p = TIER_PRESETS.find((x) => x.id === id)!;
    setScenario(p.scenario);
    setPreset(id);
    setFedramp(p.id === "claradocs" ? FEDRAMP_SCENARIOS[0].id : null);
  };
  const pickFedramp = (id: string) => {
    const f = FEDRAMP_SCENARIOS.find((x) => x.id === id)!;
    setScenario(f.scenario);
    setFedramp(id);
    setPreset(null);
  };
  const activePreset = TIER_PRESETS.find((p) => p.id === preset);
  const activeFedramp = FEDRAMP_SCENARIOS.find((f) => f.id === fedramp);
  const tier = decision.tier as 0 | 1 | 2 | 3 | 4;
  /* The reader's FedRAMP choice never hides itself: closing the box while a
     claim is picked returns to the ClaraDocs sample first. */
  const fedForced = fedramp !== null && fedramp !== FEDRAMP_SCENARIOS[0].id;

  /* The jump pill sits fixed at the bottom center, shown only while the lab
     is on screen and the card's badge row is not, so a reader flipping
     controls on a phone sees the result move and can jump to it. The card
     itself is what announces; the pill is a labeled button. */
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeRowRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const [badgeVisible, setBadgeVisible] = useState(true);
  const [labVisible, setLabVisible] = useState(false);
  useEffect(() => {
    const badge = badgeRowRef.current;
    const lab = document.getElementById("tier-lab");
    if (!badge || !lab || typeof IntersectionObserver === "undefined") return;
    const a = new IntersectionObserver(([e]) => setBadgeVisible(e.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    const b = new IntersectionObserver(([e]) => setLabVisible(e.isIntersecting), { rootMargin: "-80px 0px -25% 0px" });
    a.observe(badge);
    b.observe(lab);
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, []);
  const showJump = labVisible && !badgeVisible;
  const readout = TIER_RESULT_LABELS.readout(tier, decision.checks_met.met, decision.checks_met.total);
  const jumpToResult = () => {
    cardRef.current?.scrollIntoView({ block: "start" });
    resultHeadingRef.current?.focus({ preventScroll: true });
  };

  return (
    <Section tone="cream" id="tier-lab" className={SCROLL_MT}>
      <Kicker n={SECTIONS.tier.kicker} text={SECTIONS.tier.eyebrow} />
      <h2 className={H2}>{SECTIONS.tier.title}</h2>
      <p className={INTRO}>{SECTIONS.tier.intro}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-7">
          <PresetRow label={SECTIONS.tier.presets} items={TIER_PRESETS} activeId={preset} onPick={pickPreset} />
          {activePreset?.sample && (
            <p className="font-sans text-sm">
              <Link to={`/check?sample=${activePreset.sample}`} className={INLINE_LINK}>
                {SECTIONS.tier.openReport}
              </Link>
            </p>
          )}
          {activePreset?.footnote && (
            <p className="rounded-md bg-brand-cobalt-50 p-4 font-sans text-sm leading-relaxed">{activePreset.footnote}</p>
          )}

          <details
            className="group rounded-md border border-brand-silver-soft bg-white p-5"
            open={fedOpen || fedForced}
            onToggle={(e) => {
              const el = e.currentTarget;
              if (!el.open && fedForced) pickPreset(TIER_PRESETS[1].id);
              setFedOpen(el.open);
            }}
          >
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-1 inline-block font-sans text-base font-bold text-brand-cobalt transition-transform group-open:rotate-90">▸</span>
                <span>
                  <span className="block font-serif text-xl font-bold leading-snug text-brand-cobalt">{FEDRAMP_TITLE}</span>
                  <span className="mt-1 block font-sans text-sm text-brand-charcoal-soft">{FEDRAMP_LEAD}</span>
                </span>
              </span>
            </summary>
            <div className="mt-4 pl-7">
              <PresetRow label={FEDRAMP_PICK} items={FEDRAMP_SCENARIOS} activeId={fedramp} onPick={pickFedramp} />
            </div>
            {activeFedramp && (
              <p className="mt-4 pl-7 font-sans text-sm leading-relaxed">{activeFedramp.note}</p>
            )}
          </details>

          <div className="space-y-6">
            {TIER_CONTROLS.map((c) => (
              <SegmentedRadio key={c.key} control={c} value={scenario[c.key] as string} onChange={(v) => set(c.key, v)} />
            ))}
          </div>
        </div>

        <div>
          {showJump && (
            <button
              type="button"
              onClick={jumpToResult}
              aria-label={TIER_RESULT_LABELS.jump(readout)}
              className="fixed bottom-3 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-pill border border-brand-silver bg-white py-1.5 pl-1.5 pr-4 shadow-soft print:hidden"
            >
              <TierBadge tier={tier} iconOnly />
              <span className="min-w-0 truncate font-sans text-sm font-bold text-brand-charcoal">{readout}</span>
            </button>
          )}

          <div ref={cardRef} className={`${CARD} ${SCROLL_MT}`} aria-live="polite" aria-labelledby="hiw-tier-result-h">
            <div ref={badgeRowRef} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <TierBadge tier={tier} size="lg" />
              <h3 id="hiw-tier-result-h" ref={resultHeadingRef} tabIndex={-1} className={`${LABEL} focus:outline-none`}>
                {TIER_RESULT_LABELS.tier(tier)}
              </h3>
              <span className="font-sans text-base font-bold">{TIER_RESULT_LABELS.meets(decision.checks_met.met, decision.checks_met.total)}</span>
              {outcomes.cap === "Applies" && <Token tone="warn">{LADDER_TEXT.cap}</Token>}
            </div>
            <p className={`max-w-xl ${SMALL_KEY}`}>{MEETS_KEY}</p>

            <p className={`mt-6 ${LABEL}`}>{TIER_RESULT_LABELS.points}</p>
            {/* Seven pips in the three groups the rule counts, a label above
                each group; groups side by side from sm up, stacked below.
                Every pip names its own point for screen readers. */}
            <ol className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-6">
              {POINT_GROUPS.map((g) => (
                <li key={g.id} className="flex flex-col gap-2">
                  <span aria-hidden="true" className="max-w-[11rem] font-sans text-[13px] leading-snug text-brand-charcoal-soft [text-wrap:balance]">
                    {g.label}
                  </span>
                  <ol className="flex shrink-0 gap-1.5" aria-label={g.label}>
                    {g.points.map((pt) => {
                      const on = met[pt.id];
                      return (
                        <li
                          key={pt.id}
                          className={`flex h-9 w-9 items-center justify-center rounded-md border text-base font-bold ${
                            on ? "border-brand-cobalt bg-brand-cobalt text-white" : "border-brand-steel bg-white text-brand-steel"
                          }`}
                        >
                          <span aria-hidden="true">{on ? "✓" : "–"}</span>
                          <span className="sr-only">{`${pt.label}: ${on ? TIER_RESULT_LABELS.pointMet : TIER_RESULT_LABELS.pointNotMet}`}</span>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </ol>

            <p className={`mt-6 ${LABEL}`}>{TIER_RESULT_LABELS.steps}</p>
            <ol className="mt-2 divide-y divide-brand-silver-soft">
              {TIER_STEPS.map((step, i) => {
                const o = outcomes.steps[i].outcome;
                const live = o === "Applies";
                return (
                  <li key={step.id} aria-current={live ? "true" : undefined} className={`flex flex-col gap-1.5 py-3 sm:flex-row sm:gap-4 ${live ? "-mx-3 rounded-md border-t-transparent bg-brand-cobalt-50 px-3" : ""}`}>
                    <span className="sm:w-24 sm:shrink-0 sm:pt-0.5">
                      <Token tone={live ? "cobalt" : o === "Passed" ? "good" : "muted"}>{o}</Token>
                    </span>
                    <span>
                      <span className="font-sans text-base font-bold text-brand-ink">{i + 1}. {step.question}</span>
                      <span className="block font-sans text-sm leading-relaxed text-brand-charcoal-soft">{step.rule}</span>
                    </span>
                  </li>
                );
              })}
              <li aria-current={outcomes.cap === "Applies" ? "true" : undefined} className={`flex flex-col gap-1.5 py-3 sm:flex-row sm:gap-4 ${outcomes.cap === "Applies" ? "-mx-3 rounded-md border-t-transparent bg-status-warn-soft/50 px-3" : ""}`}>
                <span className="sm:w-24 sm:shrink-0 sm:pt-0.5">
                  <Token tone={outcomes.cap === "Applies" ? "warn" : "muted"}>{outcomes.cap}</Token>
                </span>
                <span>
                  <span className="font-sans text-base font-bold text-brand-ink">{TIER_CAP_STEP.question}</span>
                  <span className="block font-sans text-sm leading-relaxed text-brand-charcoal-soft">{TIER_CAP_STEP.rule}</span>
                </span>
              </li>
            </ol>

            <div className="mt-6 grid gap-6">
              <div>
                <p className={LABEL}>{TIER_RESULT_LABELS.plain}</p>
                <ul className="mt-2 space-y-2 font-sans text-base leading-relaxed">
                  {plain.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {!capPresent && scenario.adv === "none" && (
                  <p className="mt-3 font-sans text-sm text-brand-charcoal-soft">{CAP_EXPLANATIONS.none}</p>
                )}
              </div>
              <div>
                <LadderSvg tier={decision.tier} capped={capPresent} />
              </div>
            </div>

            <details className="mt-6 rounded-md bg-brand-vellum p-4">
              <summary className="cursor-pointer list-none font-sans text-base font-bold text-brand-ink [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="mr-2 text-brand-cobalt">+</span>
                {TIER_RESULT_LABELS.exact}
              </summary>
              <p className="mt-2 font-sans text-sm text-brand-charcoal-soft">{TIER_RESULT_LABELS.exactNote}</p>
              <ul className="mt-3 space-y-2">
                {decision.rationale.map((r) => (
                  <li key={r} className="font-mono text-[13px] leading-relaxed text-brand-charcoal">{r}</li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ source lab */

function SourceSection({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const [pick, setPick] = useState(SOURCE_EXAMPLES[0].id);
  const [read, setRead] = useState<"yes" | "no">("yes");
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const example = SOURCE_EXAMPLES.find((e) => e.id === pick)!;
  const result = runSource(example, read);
  const move = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = SOURCE_EXAMPLES.length;
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    setPick(SOURCE_EXAMPLES[j].id);
    refs.current[j]?.focus();
  };
  return (
    <Section tone="white" id="source-lab" className={SCROLL_MT}>
      <Kicker n={SECTIONS.sources.kicker} text={SECTIONS.sources.eyebrow} />
      <h2 id="hiw-source-t" className={H2}>{SECTIONS.sources.title}</h2>
      <p className={INTRO}>{SECTIONS.sources.intro}</p>

      <Fold
        id="hiw-source-chooser"
        labelledBy="hiw-source-t"
        open={open}
        onToggle={setOpen}
        openLabel={SECTIONS.sources.tryIt}
        closeLabel={SECTIONS.sources.hideLab}
        className="mt-6 text-brand-cobalt"
      >
        <p className="mt-8 font-sans text-sm text-brand-charcoal-soft">{SECTIONS.sources.invented}</p>
        <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="space-y-7">
            <div>
              <p id={id} className={LABEL}>{SECTIONS.sources.pick}</p>
              <div role="radiogroup" aria-labelledby={id} className="mt-3 flex flex-wrap gap-2">
                {SOURCE_EXAMPLES.map((e, i) => {
                  const checked = e.id === pick;
                  return (
                    <button
                      key={e.id}
                      ref={(el) => {
                        refs.current[i] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      tabIndex={checked ? 0 : -1}
                      onClick={() => setPick(e.id)}
                      onKeyDown={(ev) => move(ev, i)}
                      className={`rounded-pill border px-3.5 py-1.5 font-mono text-[13px] leading-snug transition-colors ${
                        checked
                          ? "border-brand-cobalt bg-brand-cobalt text-white"
                          : "border-brand-steel bg-white text-brand-charcoal hover:border-brand-cobalt"
                      }`}
                    >
                      {e.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <SegmentedRadio control={SOURCE_READ_CONTROL} value={read} onChange={(v) => setRead(v as "yes" | "no")} />
          </div>

          <div className={CARD} aria-live="polite">
            <div className="flex items-start gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-brand-cobalt font-serif text-4xl font-bold text-white" aria-hidden="true">
                {result.cls}
              </span>
              <div>
                <p className={LABEL}>{SECTIONS.sources.classTitle(result.cls)}</p>
                <h3 className="mt-1 font-serif text-2xl font-bold leading-snug text-brand-cobalt">{result.className}</h3>
                <p className="mt-1 font-mono text-[13px] text-brand-charcoal-soft">{example.label}</p>
              </div>
            </div>
            <p className="mt-5 font-sans text-base leading-relaxed">{example.why}</p>
            <p className="mt-4 border-l-4 border-brand-carolina pl-4 font-sans text-base font-bold leading-relaxed text-brand-ink">
              {result.verdict}
            </p>
            <p className={`mt-8 ${LABEL}`}>{SECTIONS.sources.classesTitle}</p>
            <ol className="mt-2 divide-y divide-brand-silver-soft">
              {SOURCE_CLASSES.map((c) => (
                <li key={c.cls} aria-current={c.cls === result.cls ? "true" : undefined} className={`flex gap-4 py-3 last:pb-0 ${c.cls === result.cls ? "-mx-3 rounded-md bg-brand-cobalt-50 px-3" : ""}`}>
                  <span className="w-7 shrink-0 font-serif text-xl font-bold text-brand-cobalt">{c.cls}</span>
                  <span>
                    <span className="font-sans text-base font-bold text-brand-ink">{c.name}</span>
                    <span className="block font-sans text-sm leading-relaxed text-brand-charcoal-soft">{c.plain}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Fold>
    </Section>
  );
}

/* --------------------------------------------------------------- fairness */

function FairnessSection({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  return (
    <Section tone="tint" id="fairness" className={SCROLL_MT}>
      <Kicker n={SECTIONS.fairness.kicker} text={SECTIONS.fairness.eyebrow} />
      <h2 id="hiw-fairness-t" className={H2}>{SECTIONS.fairness.title}</h2>
      <p className={INTRO}>{SECTIONS.fairness.intro}</p>
      <Fold
        id="hiw-fairness-rules"
        labelledBy="hiw-fairness-t"
        open={open}
        onToggle={setOpen}
        openLabel={SECTIONS.fairness.readRules}
        closeLabel={SECTIONS.fairness.hideRules}
        className="mt-6 text-brand-cobalt"
      >
        {/* A numbered two-column list on the tint with carolina hairlines: the
            brand's rule idiom, not a card grid. One label for the list. */}
        <p className={`mt-8 ${LABEL}`}>{SECTIONS.fairness.keeps}</p>
        <ol className="mt-3 grid gap-x-12 border-b border-brand-carolina md:grid-cols-2">
          {FAIRNESS_LINES.map((f, i) => (
            <li key={f.id} className="flex gap-4 border-t border-brand-carolina py-5">
              <span aria-hidden="true" className="pt-0.5 font-mono text-[13px] font-bold tabular-nums text-brand-cobalt">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-sans text-base leading-relaxed">{f.text}</p>
            </li>
          ))}
        </ol>
      </Fold>
    </Section>
  );
}

/* ----------------------------------------------------------- footer strip */

function FooterStrip() {
  return (
    <div className="w-full bg-brand-deepblue text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-8 md:px-8">
        <div className="max-w-2xl">
          <p className="font-serif text-lg font-bold">{FOOTER.version}</p>
          <p className="mt-1 font-sans text-base text-brand-cobalt-100">{FOOTER.claims} {FOOTER.fiction}</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-base font-bold">
          {FOOTER.links.map((l) =>
            "to" in l ? (
              <li key={l.label}>
                <Link to={l.to} className="text-white underline decoration-brand-carolina decoration-2 underline-offset-2">
                  {l.label}
                </Link>
              </li>
            ) : (
              <li key={l.label}>
                <a href={l.href} className="text-white underline decoration-brand-carolina decoration-2 underline-offset-2">
                  {l.label}
                </a>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

/* What a hash asks the page to open before it scrolls there. */
function hashTargets(hash: string) {
  const id = hash.replace(/^#/, "");
  const stageMatch = id.match(/^stage-(.+)$/);
  const stageId = stageMatch && STAGES.some((s) => s.id === stageMatch[1]) ? (stageMatch[1] as StageId) : null;
  return {
    id,
    stage: id === "who-wrote-it" ? ("report" as StageId) : stageId,
    table: id.startsWith("rule-"),
    source: id === "source-lab",
    fairness: id === "fairness",
  };
}

export default function HowItWorks() {
  const location = useLocation();
  const initial = useMemo(() => hashTargets(location.hash), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [selected, setSelected] = useState<StageId | null>(initial.stage);
  const [tableOpen, setTableOpen] = useState(initial.table);
  const [sourceOpen, setSourceOpen] = useState(initial.source);
  const [fairnessOpen, setFairnessOpen] = useState(initial.fairness);
  const pendingScroll = useRef<string | null>(null);

  /* A hash, on arrival or from an in-page link, opens what it points at. */
  useEffect(() => {
    const t = hashTargets(location.hash);
    if (!t.id) return;
    if (t.stage) setSelected(t.stage);
    if (t.table) setTableOpen(true);
    if (t.source) setSourceOpen(true);
    if (t.fairness) setFairnessOpen(true);
    pendingScroll.current = t.id;
  }, [location.hash, location.key]);

  /* Scroll once the target is rendered and visible (a table row has a
     stacked-card twin below md, suffixed -m). */
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    const el = [id, `${id}-m`].map((x) => document.getElementById(x)).find((e) => e && e.offsetParent !== null);
    if (!el) return;
    pendingScroll.current = null;
    requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  });

  /* Print expands every native disclosure; the Fold regions and the
     all-stages list expand through print:block. */
  useEffect(() => {
    const opened: HTMLDetailsElement[] = [];
    const before = () => {
      document.querySelectorAll<HTMLDetailsElement>("details:not([open])").forEach((d) => {
        d.open = true;
        opened.push(d);
      });
    };
    const after = () => {
      opened.splice(0).forEach((d) => {
        d.open = false;
      });
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <>
      <Hero />
      <PipelineSection selected={selected} setSelected={setSelected} />
      <CreditSection tableOpen={tableOpen} setTableOpen={setTableOpen} />
      <TierSection />
      <SourceSection open={sourceOpen} setOpen={setSourceOpen} />
      <FairnessSection open={fairnessOpen} setOpen={setFairnessOpen} />
      <FooterStrip />
    </>
  );
}
