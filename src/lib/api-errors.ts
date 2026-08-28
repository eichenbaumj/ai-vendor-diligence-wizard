/*
  Maps backend error bodies to human copy. The functions return a mix of
  machine codes ("rate_limited", "capacity", "storage") and full sentences
  (the validation messages); the map translates every known value, sentence-
  shaped unknowns pass through, and short unknown tokens fall back to a
  status-tier generic so a raw code can never render as a headline.
*/

export interface FriendlyError {
  headline: string;
  hint: string | null;
}

export type ApiSurface = "evaluate" | "chat" | "get-evaluation";

const EVALUATE_MAP: Record<string, FriendlyError> = {
  method: {
    headline: "The check could not start.",
    hint: "Reload the page and try again.",
  },
  "not configured": {
    headline: "The service is not fully set up yet.",
    hint: "Please try again later.",
  },
  "input_kind must be paste or name in this release": {
    headline: "That input type is not ready yet.",
    hint: "Paste the pitch text, or use the vendor name tab.",
  },
  "paste between 40 and 40,000 characters": {
    headline: "That paste is too short or too long.",
    hint: "Paste between 40 and 40,000 characters.",
  },
  "vendor name between 2 and 160 characters": {
    headline: "That name is too short or too long.",
    hint: "Use 2 to 160 characters.",
  },
  "client_token required": {
    headline: "Your browser blocked part of the check.",
    hint: "Turn off strict privacy blocking for this site, then try again.",
  },
  "verification failed, reload and retry": {
    headline: "We could not confirm your browser.",
    hint: "A new security check just started. Wait a moment, then try again.",
  },
  rate_limited: {
    headline: "You have reached the limit for now.",
    hint: "Please wait and try again later.",
  },
  capacity: {
    headline: "The service is at capacity right now.",
    hint: "Please try again in a few minutes.",
  },
  storage: {
    headline: "We could not save your check.",
    hint: "Please try again in a moment. Your pitch was not lost.",
  },
};

const CHAT_MAP: Record<string, FriendlyError> = {
  session_limit: {
    headline: "This report has used all its questions.",
    hint: "Run a fresh check to ask more.",
  },
  upstream: {
    headline: "The answer did not come through.",
    hint: "Please ask again in a moment.",
  },
  "chat is limited to the person who ran the check": {
    headline: "Chat is only open to the person who ran this check.",
    hint: null,
  },
  session: {
    headline: "Your question could not be sent.",
    hint: "Please try again.",
  },
  "bad request": {
    headline: "Your question could not be sent.",
    hint: "Please try again.",
  },
};

/* Codes whose retry_hint / detail is written for users and should surface.
   Chat "upstream" detail carries raw provider text and must never render. */
const HINT_PASSTHROUGH = new Set(["rate_limited", "session_limit"]);

function looksLikeSentence(code: string): boolean {
  return code.trim().split(/\s+/).length >= 4;
}

function statusFallback(status: number, surface: ApiSurface): FriendlyError {
  if (surface === "get-evaluation") {
    return {
      headline: "Could not load this check.",
      hint: "Reload the page to try again.",
    };
  }
  if (status === 429) return EVALUATE_MAP.rate_limited;
  if (status >= 500) {
    return {
      headline: "Something went wrong on our side.",
      hint: "Please try again in a moment.",
    };
  }
  return surface === "chat"
    ? CHAT_MAP.session
    : { headline: "The check could not start.", hint: "Please try again." };
}

export function mapApiError(input: {
  status: number;
  code?: string | null;
  retryHint?: string | null;
  surface: ApiSurface;
}): FriendlyError {
  const { status, surface } = input;
  const code = input.code?.trim() || null;
  const table = surface === "chat" ? CHAT_MAP : EVALUATE_MAP;

  let base: FriendlyError | null = null;
  if (code && surface !== "get-evaluation" && table[code]) {
    base = table[code];
  } else if (code && looksLikeSentence(code)) {
    /* An unknown but sentence-shaped message is real copy from the backend:
       show it, normalized to headline form. */
    const headline = code.charAt(0).toUpperCase() + code.slice(1);
    base = {
      headline: headline.endsWith(".") ? headline : `${headline}.`,
      hint: null,
    };
  }
  if (!base) base = statusFallback(status, surface);

  const hint =
    code && HINT_PASSTHROUGH.has(code) && input.retryHint
      ? input.retryHint
      : base.hint;
  return { headline: base.headline, hint };
}
