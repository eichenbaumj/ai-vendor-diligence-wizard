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
*/
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { PillButton, Section, TierBadge } from "@/components/brand";
import {
  EvidenceTierBadge,
  ResultChip,
} from "@/components/report/VerificationLedger";
import {
  CAP_EXPLANATIONS,
  COVERAGE_LIMITED_CARD,
  CREDIT_CONTROLS,
  CREDIT_DEFAULT,
  CREDIT_PRESETS,
  CREDIT_RARE_TITLE,
  FAIRNESS_LINES,
  FEDRAMP_LEAD,
  FEDRAMP_SCENARIOS,
  FEDRAMP_TITLE,
  FOOTER,
  HERO,
  LADDER_TEXT,
  LANE_LEGEND,
  PART_LEADS,
  PART_SCREEN,
  POINT_GROUPS,
  REGISTRY_LANES,
  REPORT_PARTS,
  SECTIONS,
  SOURCE_CLASSES,
  SOURCE_EXAMPLES,
  SOURCE_READ_CONTROL,
  SOURCE_STATIC_CARDS,
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
  TRUTH_TABLE,
  TRUTH_TABLE_HEADERS,
  WALL_GATES,
  WHO_CHIP,
  capExplanation,
  inertCreditControls,
  plainWords,
  pointsMet,
  runCredit,
  runSource,
  runTier,
  stepOutcomes,
  type Control,
  type CreditScenario,
  type Lane,
  type Stage,
  type TierScenario,
} from "@/lib/how-it-works-model";

const REPO = "https://github.com/eichenbaumj/ai-vendor-diligence-wizard/blob/main/";

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
    <div className={inert ? "opacity-80" : ""}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span id={id} className="font-sans text-base font-bold text-brand-ink">
          {control.label}
        </span>
        {inert && inertLabel && (
          <span className="font-sans text-sm text-brand-charcoal-soft">({inertLabel})</span>
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
                checked
                  ? "border-brand-cobalt bg-brand-cobalt text-white"
                  : "border-brand-silver bg-white text-brand-charcoal hover:border-brand-cobalt"
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
              className={`rounded-pill border-[1.5px] px-4 py-1.5 font-sans text-sm font-bold leading-snug transition-colors ${
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

function Token({ tone, children }: { tone: "good" | "warn" | "muted" | "cobalt"; children: ReactNode }) {
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
      className={`inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ hero */

/* The dot pattern fades toward the title and the fold instead of ending at
   a box edge: two gradients intersected with the pattern mask. */
const PATTERN_MASK = "url(/brand-pattern-01-mixed.svg), linear-gradient(to bottom, #000 45%, transparent 100%), linear-gradient(to right, transparent 0%, #000 30%)";

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
            <div className="rounded-md border border-white/20 p-5">
              <h3 className="font-sans text-sm font-bold tracking-[0.14em] text-brand-carolina [font-variant-caps:all-small-caps]">
                {HERO.wall.neverTitle}
              </h3>
              <ul className="mt-3 grid gap-x-4 gap-y-2 font-sans text-base font-medium sm:grid-cols-2">
                {HERO.wall.never.map((n, i) => (
                  <li key={n} className={`flex items-baseline gap-2 ${i === HERO.wall.never.length - 1 ? "sm:col-span-2" : ""}`}>
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
const NODE_FILL: Record<"ai" | "code", { idle: string; on: string; stroke: string }> = {
  ai: { idle: "fill-white", on: "fill-brand-carolina-100", stroke: "stroke-brand-carolina" },
  code: { idle: "fill-white", on: "fill-brand-cobalt-100", stroke: "stroke-brand-cobalt" },
};

function nodeProps(stage: Stage, selected: boolean, onSelect: (id: Stage["id"]) => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": selected,
    className: "cursor-pointer outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cobalt",
    onClick: () => onSelect(stage.id),
    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(stage.id);
      }
    },
  };
}

function PipelineWide({ selected, onSelect }: { selected: Stage["id"]; onSelect: (id: Stage["id"]) => void }) {
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
    gates.has(STAGES[i].id) ? GAP_G : STAGES[i + 1]?.id === "verdict" ? GAP + BOX_IN : GAP;
  const xs: number[] = [];
  for (let i = 0; i < STAGES.length; i++) xs.push(i === 0 ? PAD : xs[i - 1] + NW + gapAfter(i - 1));
  const W = xs[STAGES.length - 1] + NW + PAD;
  const gateX = (fromIdx: number) => xs[fromIdx] + NW + GAP_G / 2;
  const laneY = (lane: Lane) => (lane === "ai" ? AI_Y + NH / 2 : CODE_Y + NH / 2);
  const idx = (id: Stage["id"]) => STAGES.findIndex((s) => s.id === id);
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
              <rect x={x} y={y} width={NW} height={NH} rx={8} strokeWidth={sel ? 3 : 1.5} className={`${sel ? f.on : f.idle} ${f.stroke}`} />
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
            <text x={x + NW / 2} y={top + 20} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-deepblue`}>AI</text>
            <text x={x + NW / 2} y={top + h - 10} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-cobalt`}>Code</text>
            <rect x={x + 4} y={DIV - 27} width={NW - 8} height={54} rx={7} className={sel ? "fill-brand-vellum" : "fill-white"} strokeWidth={1} />
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

function PipelineNarrow({ selected, onSelect }: { selected: Stage["id"]; onSelect: (id: Stage["id"]) => void }) {
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
  const H = Y0 + (STAGES.length - 1) * PITCH + NH + 8;
  const ys = STAGES.map((_, i) => Y0 + i * PITCH);
  const cx = (lane: Lane) => (lane === "ai" ? AI_X + CW / 2 : CODE_X + CW / 2);
  const gates = new Map(WALL_GATES.map((g) => [g.from, g]));
  const idx = (id: Stage["id"]) => STAGES.findIndex((s) => s.id === id);
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
      <text x={AI_X + CW / 2} y={18} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-charcoal`} style={{ fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" }}>An AI model</text>
      <text x={CODE_X + CW / 2} y={18} fontSize={13} fontWeight={700} textAnchor="middle" className={`${T} fill-brand-charcoal`} style={{ fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" }}>Plain code</text>

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
            <text x={DIV - 12} y={ys[i] + 18} fontSize={13} fontWeight={700} textAnchor="end" className={`${T} fill-brand-cobalt`}>{TIER_SET_HERE[0]}</text>
            <text x={DIV - 12} y={ys[i] + 35} fontSize={13} fontWeight={700} textAnchor="end" className={`${T} fill-brand-cobalt`}>{TIER_SET_HERE[1]}</text>
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
              <rect x={x} y={y} width={CW} height={NH} rx={8} strokeWidth={sel ? 3 : 1.5} className={`${sel ? f.on : f.idle} ${f.stroke}`} />
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
            <text x={AI_X + 12} y={y + 27} fontSize={13} fontWeight={700} className={`${T} fill-brand-deepblue`}>AI</text>
            <text x={AI_X + w - 12} y={y + 27} fontSize={13} fontWeight={700} textAnchor="end" className={`${T} fill-brand-cobalt`}>Code</text>
            <rect x={DIV - 72} y={y + 6} width={144} height={NH - 12} rx={7} className={sel ? "fill-brand-vellum" : "fill-white"} />
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

/* ------------------------------------------------------------ stage card */

function anchorHref(anchor: string): string | null {
  const m = anchor.match(/^([^\s:]+)(?::(\d+)(?:-(\d+))?)?/);
  if (!m) return null;
  const [, path, from, to] = m;
  const lines = from ? `#L${from}${to ? `-L${to}` : ""}` : "";
  return `${REPO}${path}${lines}`;
}

function StageCard({ stage, standalone }: { stage: Stage; standalone?: boolean }) {
  const gate = WALL_GATES.find((g) => g.id === stage.gate);
  return (
    <article className={CARD} aria-labelledby={`stage-${stage.id}-h`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WhoChip lane={stage.lane} />
        <span className="font-mono text-[13px] tabular-nums text-brand-charcoal-soft">
          {SECTIONS.pipeline.stepOf(stage.n)}
        </span>
      </div>
      <h3 id={`stage-${stage.id}-h`} className={`mt-4 font-serif font-bold leading-snug text-brand-cobalt ${standalone ? "text-2xl" : "text-2xl md:text-3xl"}`}>
        {stage.title}
      </h3>
      <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed md:text-lg">{stage.plain}</p>

      <dl className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <dt className={LABEL}>{STAGE_FIELD_LABELS.inputs}</dt>
          <dd className="mt-2 font-sans text-base leading-relaxed">{stage.inputs}</dd>
        </div>
        <div>
          <dt className={LABEL}>{STAGE_FIELD_LABELS.outputs}</dt>
          <dd className="mt-2 font-sans text-base leading-relaxed">{stage.outputs}</dd>
          {stage.id === "registry" && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={STAGE_FIELD_LABELS.sources}>
              {Object.entries(REGISTRY_LANES).map(([id, label]) => (
                <li key={id} className="rounded-pill bg-brand-cobalt-50 px-3 py-1 font-sans text-[13px] font-medium text-brand-cobalt">
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </dl>

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

      <p className="mt-6 font-sans text-base">
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
    </article>
  );
}

function PipelineSection() {
  const [selected, setSelected] = useState<Stage["id"]>(STAGES[0].id);
  const [showAll, setShowAll] = useState(false);
  const i = STAGES.findIndex((s) => s.id === selected);
  const stage = STAGES[i];
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    /* Keep the reader oriented: when a node is pressed the panel below
       announces the new stage without stealing focus from the diagram. */
    panelRef.current?.setAttribute("data-stage", selected);
  }, [selected]);

  return (
    <Section tone="cream" id="pipeline">
      <Kicker n={SECTIONS.pipeline.kicker} text={SECTIONS.pipeline.eyebrow} />
      <h2 className={H2}>{SECTIONS.pipeline.title}</h2>
      <p className={INTRO}>{SECTIONS.pipeline.intro}</p>
      <p className="mt-2 max-w-2xl font-sans text-base text-brand-charcoal-soft min-[1140px]:hidden">
        {SECTIONS.pipeline.narrowIntro}
      </p>

      {/* The wide diagram needs about 1090px of card interior to sit at
          13px without scrolling: section padding 64 + card padding 32 puts
          that at a 1140 viewport with the card bled 24px; at xl the bleed
          grows to the section gutter so the card edge meets the column. */}
      <div className="mt-10 rounded-md border border-brand-silver-soft bg-white p-1.5 shadow-soft sm:p-3 md:p-4 min-[1140px]:-mx-6 xl:-mx-8">
        <div className="hidden overflow-x-auto min-[1140px]:block print:hidden">
          <PipelineWide selected={selected} onSelect={setSelected} />
        </div>
        <div className="flex justify-center min-[1140px]:hidden print:flex">
          <PipelineNarrow selected={selected} onSelect={setSelected} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-sm" aria-label="Legend">
          {(["ai", "code", "both", "you"] as Lane[]).map((lane) => (
            <li key={lane} className="flex items-center gap-2">
              <LaneSwatch lane={lane} />
              {LANE_LEGEND[lane]}
            </li>
          ))}
        </ul>
        <dl className="grid gap-2 font-sans text-sm sm:grid-cols-2">
          {WALL_GATES.map((g) => (
            <div key={g.id} className="flex items-baseline gap-2">
              <dt className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-deepblue text-[11px] font-bold text-white">
                {g.id}
              </dt>
              <dd>{g.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div ref={panelRef} className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-brand-cobalt print:hidden">
          <div className="flex flex-wrap gap-3">
            <PillButton
              variant="ghost"
              onClick={() => setSelected(STAGES[Math.max(0, i - 1)].id)}
              disabled={i === 0 || showAll}
            >
              {SECTIONS.pipeline.previous}
            </PillButton>
            <PillButton
              variant="ghost"
              onClick={() => setSelected(STAGES[Math.min(STAGES.length - 1, i + 1)].id)}
              disabled={i === STAGES.length - 1 || showAll}
            >
              {SECTIONS.pipeline.next}
            </PillButton>
          </div>
          <PillButton variant="ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? SECTIONS.pipeline.showOne : SECTIONS.pipeline.showAll}
          </PillButton>
        </div>

        <div className={`mt-6 ${showAll ? "hidden" : ""} print:hidden`} aria-live="polite">
          <StageCard stage={stage} />
        </div>
        <ol className={`mt-6 space-y-6 ${showAll ? "" : "hidden"} print:block`}>
          {STAGES.map((s) => (
            <li key={s.id}>
              <StageCard stage={s} standalone />
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------- report parts */

function ReportPartsSection() {
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
    <Section tone="white" id="who-wrote-it">
      <Kicker n={SECTIONS.parts.kicker} text={SECTIONS.parts.eyebrow} />
      <h2 className={H2}>{SECTIONS.parts.title}</h2>
      <p className={INTRO}>{SECTIONS.parts.intro}</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
          <span id={id} className="sr-only">{SECTIONS.parts.title}</span>
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
                className={`rounded-pill border px-3.5 py-1.5 font-sans text-sm font-medium leading-snug transition-colors ${
                  checked
                    ? "border-brand-cobalt bg-brand-cobalt text-white"
                    : "border-brand-silver bg-white text-brand-charcoal hover:border-brand-cobalt"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className={`${CARD} bg-brand-vellum`} aria-live="polite">
          <WhoChip lane={lane} />
          <h3 className="mt-4 font-serif text-2xl font-bold leading-snug text-brand-cobalt">{current.label}</h3>
          <p className="mt-3 font-sans text-lg font-bold text-brand-ink">{PART_LEADS[current.who]}</p>
          {current.who !== "code" && (
            <p className="mt-1 font-sans text-sm text-brand-charcoal-soft">{PART_SCREEN}</p>
          )}
          <p className="mt-4 font-sans text-base leading-relaxed">{current.rule}</p>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- credit lab */

function CandidateChip() {
  return (
    <span className="inline-flex items-center rounded-pill bg-brand-vellum px-2.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide text-brand-charcoal-soft">
      Candidate record
    </span>
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
          <span className="font-mono text-xs font-bold text-brand-charcoal-soft">D1</span>
        </div>
        <p className="mt-3 font-sans text-sm text-brand-charcoal-soft">
          <span className="font-bold text-brand-charcoal">What we checked:</span> {c.row.whatChecked}
        </p>
        <p className="mt-2 font-sans text-[15px] leading-relaxed">{c.row.note}</p>
      </div>

      <div className="mt-4 rounded-md bg-brand-vellum p-4">
        <p className={LABEL}>{c.honesty.group}</p>
        <p className="mt-2 font-sans text-[15px] leading-snug">
          <span className="font-bold">{c.honesty.label}</span>{" "}
          <span className="text-xs font-bold uppercase tracking-wide text-brand-charcoal-soft">· {c.honesty.status}</span>
        </p>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">{c.honesty.reason}</p>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">{c.honesty.groupNote}</p>
      </div>

      <div className="mt-4 rounded-md border border-brand-silver-soft p-4">
        <h4 className="font-serif text-lg font-bold leading-snug text-brand-ink">{c.manual.label}</h4>
        <p className="mt-2 font-sans text-sm leading-relaxed">{c.manual.instructions}</p>
        <p className="mt-3 border-t border-brand-silver-soft pt-3 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">
          <span className="font-bold text-status-warn-text">What bad looks like:</span> {c.manual.whatBad}
        </p>
      </div>

      <p className="mt-5 border-l-4 border-brand-carolina pl-4 font-sans text-base font-bold leading-relaxed text-brand-ink">
        {c.rule}
      </p>
    </div>
  );
}

function CreditSection() {
  const [scenario, setScenario] = useState<CreditScenario>(CREDIT_DEFAULT);
  const [preset, setPreset] = useState<string | null>(CREDIT_PRESETS[0].id);
  const unreachable = preset === "unreachable";
  const result = useMemo(() => runCredit(scenario), [scenario]);
  const inert = useMemo(() => inertCreditControls(scenario), [scenario]);
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
    <Section tone="tint" id="credit-lab">
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

              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {result.effects.map((e) => (
                  <div key={e.question} className="rounded-md bg-brand-vellum p-4">
                    <dt className="font-sans text-sm font-bold text-brand-ink">{e.question}</dt>
                    <dd className="mt-2">
                      <Token tone={e.tone}>{e.answer}</Token>
                      <p className="mt-2 font-sans text-[13px] leading-relaxed text-brand-charcoal-soft">{e.detail}</p>
                    </dd>
                  </div>
                ))}
              </dl>

              <p className={`mt-6 ${LABEL}`}>{SECTIONS.credit.sentenceTitle}</p>
              <div className="mt-2 rounded-md border border-brand-silver-soft p-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <ResultChip result={result.ledger.result} />
                  <EvidenceTierBadge tier={result.ledger.evidenceTier} />
                  <span className="font-mono text-xs font-bold text-brand-charcoal-soft">D1</span>
                  {result.ledger.candidate && <CandidateChip />}
                  {result.ledger.severity && <Token tone="warn">{result.ledger.severity}</Token>}
                </div>
                <p className="mt-2 font-sans text-[13px] text-brand-charcoal-soft">{result.ledger.caption}</p>
                <p className="mt-3 font-sans text-[15px] leading-relaxed">{result.sentence}</p>
              </div>

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
        <h3 className="font-serif text-2xl font-bold leading-snug text-brand-cobalt">{SECTIONS.credit.tableTitle}</h3>
        <p className="mt-2 max-w-prose font-sans text-base leading-relaxed">{SECTIONS.credit.tableIntro}</p>
        {/* md and up: the table, with Situation and Result at fixed widths so
            the Result column never collapses. Below md: one stacked card per
            rule, so nothing sits off-screen. Same rows, one visible at a time. */}
        <div className="mt-6 hidden overflow-hidden rounded-md border border-brand-silver-soft bg-white md:block">
          <table className="w-full border-collapse text-left font-sans text-sm">
            <colgroup>
              <col className="w-[26%]" />
              <col />
              <col className="w-[24%]" />
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
                      className={`border-b border-brand-ink/10 align-top ${live ? "bg-brand-cobalt-50" : ""}`}
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
              <li key={row.id} className={firstOfGroup ? (i === 0 ? "" : "mt-8") : "mt-3"}>
                {firstOfGroup && <p className={`mb-3 ${LABEL}`}>{row.group}</p>}
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
  const gap = 56;
  const rungY = (idx: number) => top + gap * idx;
  const H = top + gap * 4 + 56;
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
              {`Tier ${r.tier}: ${r.short}`}
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
          <line x1={x0 - 8} y1={yCap} x2={x1 + 8} y2={yCap} strokeWidth={2} strokeDasharray="6 4" className="stroke-status-warn" />
          <text x={x1 + 4} y={yCap - 6} fontSize={13} fontWeight={700} textAnchor="end" className={`${T} fill-status-warn`}>{LADDER_TEXT.cap}</text>
        </g>
      )}
      {/* The foot sits on the rung-label column, two lines so it never runs past the right rail. */}
      {LADDER_TEXT.foot.map((line, i) => (
        <text key={line} x={x0 + 20} y={H - 22 + i * 16} fontSize={13} className={`${T} fill-brand-charcoal-soft`}>{line}</text>
      ))}
    </svg>
  );
}

function TierSection() {
  const [scenario, setScenario] = useState<TierScenario>(TIER_DEFAULT);
  const [preset, setPreset] = useState<string | null>(TIER_PRESETS[1].id);
  const [fedramp, setFedramp] = useState<string | null>(FEDRAMP_SCENARIOS[0].id);
  const { inputs, decision } = useMemo(() => runTier(scenario), [scenario]);
  const outcomes = useMemo(() => stepOutcomes(inputs, decision), [inputs, decision]);
  const met = pointsMet(inputs);
  const plain = plainWords(scenario, inputs, decision);
  const capText = capExplanation(inputs.adv_findings);
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

  return (
    <Section tone="cream" id="tier-lab">
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

          <div className="rounded-md border border-brand-silver-soft bg-white p-5">
            <h3 className="font-serif text-xl font-bold leading-snug text-brand-cobalt">{FEDRAMP_TITLE}</h3>
            <p className="mt-1 font-sans text-sm text-brand-charcoal-soft">{FEDRAMP_LEAD}</p>
            <div className="mt-4">
              <PresetRow label="Pick the claim" items={FEDRAMP_SCENARIOS} activeId={fedramp} onPick={pickFedramp} />
            </div>
            {activeFedramp && (
              <p className="mt-4 font-sans text-sm leading-relaxed">{activeFedramp.note}</p>
            )}
          </div>

          <div className="space-y-6">
            {TIER_CONTROLS.map((c) => (
              <SegmentedRadio key={c.key} control={c} value={scenario[c.key] as string} onChange={(v) => set(c.key, v)} />
            ))}
          </div>
        </div>

        <div>
          {/* Two fixed rows for every tier: label and count on the first,
              badge and cap on the second. The longest badge plus the cap
              token fits the strip at lg, so the shape never changes. */}
          <div
            className="z-10 hidden gap-y-2 rounded-md border border-brand-silver-soft bg-white/95 px-4 py-3 shadow-soft backdrop-blur-sm lg:sticky lg:top-[4.5rem] lg:grid"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className={LABEL}>{TIER_RESULT_LABELS.strip}</p>
              <span className="font-sans text-sm font-bold">{TIER_RESULT_LABELS.meets(decision.checks_met.met, decision.checks_met.total)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TierBadge tier={tier} />
              {outcomes.cap === "Applies" && <Token tone="warn">{LADDER_TEXT.cap}</Token>}
            </div>
          </div>

          <div className={`${CARD} lg:mt-6`} aria-live="polite">
            <TierBadge tier={tier} size="lg" />
            <p className={`mt-4 ${LABEL}`}>{TIER_RESULT_LABELS.tier(tier)}</p>
            <p className="mt-1 font-sans text-base font-bold">{TIER_RESULT_LABELS.meets(decision.checks_met.met, decision.checks_met.total)}</p>

            <p className={`mt-6 ${LABEL}`}>{TIER_RESULT_LABELS.points}</p>
            {/* Seven pips in the three groups the rule counts: groups side by
                side with a label under each from sm up, one group per row
                below. Every pip names its own point for screen readers. */}
            <ol className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-6">
              {POINT_GROUPS.map((g) => (
                <li key={g.id} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                  <ol className="flex shrink-0 gap-1.5" aria-label={g.label}>
                    {g.points.map((pt) => {
                      const on = met[pt.id];
                      return (
                        <li
                          key={pt.id}
                          className={`flex h-9 w-9 items-center justify-center rounded-md border text-base font-bold ${
                            on ? "border-brand-cobalt bg-brand-cobalt text-white" : "border-brand-silver bg-white text-brand-steel"
                          }`}
                        >
                          <span aria-hidden="true">{on ? "✓" : "–"}</span>
                          <span className="sr-only">{`${pt.label}: ${on ? "met" : "not met"}`}</span>
                        </li>
                      );
                    })}
                  </ol>
                  <span aria-hidden="true" className="max-w-[9rem] font-sans text-[13px] leading-snug text-brand-charcoal-soft">
                    {g.label}
                  </span>
                </li>
              ))}
            </ol>

            <p className={`mt-6 ${LABEL}`}>{TIER_RESULT_LABELS.steps}</p>
            <ol className="mt-2 divide-y divide-brand-silver-soft">
              {TIER_STEPS.map((step, i) => {
                const o = outcomes.steps[i].outcome;
                const live = o === "Applies";
                return (
                  <li key={step.id} aria-current={live ? "true" : undefined} className={`flex flex-col gap-1.5 py-3 sm:flex-row sm:gap-4 ${live ? "-mx-3 rounded-md bg-brand-cobalt-50 px-3" : ""}`}>
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
              <li aria-current={outcomes.cap === "Applies" ? "true" : undefined} className={`flex flex-col gap-1.5 py-3 sm:flex-row sm:gap-4 ${outcomes.cap === "Applies" ? "-mx-3 rounded-md bg-status-warn-soft/50 px-3" : ""}`}>
                <span className="sm:w-24 sm:shrink-0 sm:pt-0.5">
                  <Token tone={outcomes.cap === "Applies" ? "warn" : "muted"}>{outcomes.cap}</Token>
                </span>
                <span>
                  <span className="font-sans text-base font-bold text-brand-ink">{TIER_CAP_STEP.question}</span>
                  <span className="block font-sans text-sm leading-relaxed text-brand-charcoal-soft">{TIER_CAP_STEP.rule}</span>
                </span>
              </li>
            </ol>

            <div className="mt-6">
              <div>
                <p className={LABEL}>{TIER_RESULT_LABELS.plain}</p>
                <ul className="mt-2 space-y-2 font-sans text-base leading-relaxed">
                  {plain.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {capPresent && <p className="mt-3 font-sans text-sm text-brand-charcoal-soft">{capText}</p>}
                {!capPresent && scenario.adv === "none" && (
                  <p className="mt-3 font-sans text-sm text-brand-charcoal-soft">{CAP_EXPLANATIONS.none}</p>
                )}
              </div>
              <div className="mt-6">
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

function SourceSection() {
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
    <Section tone="white" id="source-lab">
      <Kicker n={SECTIONS.sources.kicker} text={SECTIONS.sources.eyebrow} />
      <h2 className={H2}>{SECTIONS.sources.title}</h2>
      <p className={INTRO}>{SECTIONS.sources.intro}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
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
                        : "border-brand-silver bg-white text-brand-charcoal hover:border-brand-cobalt"
                    }`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>
          <SegmentedRadio control={SOURCE_READ_CONTROL} value={read} onChange={(v) => setRead(v as "yes" | "no")} />
          <div className="grid gap-3 sm:grid-cols-2">
            {SOURCE_STATIC_CARDS.map((c) => (
              <div key={c.title} className="rounded-md border border-brand-silver-soft bg-brand-vellum p-4">
                <p className="font-sans text-sm font-bold text-brand-ink">{c.title}</p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-brand-charcoal-soft">{c.text}</p>
              </div>
            ))}
          </div>
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
              <li key={c.cls} aria-current={c.cls === result.cls ? "true" : undefined} className={`flex gap-4 py-3 ${c.cls === result.cls ? "-mx-3 rounded-md bg-brand-cobalt-50 px-3" : ""}`}>
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
    </Section>
  );
}

/* --------------------------------------------------------------- fairness */

function FairnessSection() {
  return (
    <Section tone="tint" id="fairness">
      <Kicker n={SECTIONS.fairness.kicker} text={SECTIONS.fairness.eyebrow} />
      <h2 className={H2}>{SECTIONS.fairness.title}</h2>
      <p className={INTRO}>{SECTIONS.fairness.intro}</p>
      {/* A numbered two-column list on the tint with carolina hairlines: the
          brand's rule idiom, not a card grid. One label for the list. */}
      <p className={`mt-10 ${LABEL}`}>{SECTIONS.fairness.keeps}</p>
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

export default function HowItWorks() {
  return (
    <>
      <Hero />
      <PipelineSection />
      <ReportPartsSection />
      <CreditSection />
      <TierSection />
      <SourceSection />
      <FairnessSection />
      <FooterStrip />
    </>
  );
}
