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

export type ApiSurface = "evaluate" | "chat" | "get-evaluation" | "dispute";

const EVALUATE_MAP: Record<string, FriendlyError> = {
  method: {
    headline: "The check could not start.",
    hint: "Reload the page and try again.",
  },
  "not configured": {
    headline: "The service is not fully set up yet.",
    hint: "Please try again later.",
  },
  "input_kind must be paste, name, pdf, or url": {
    headline: "That input type is not recognized.",
    hint: "Reload the page and try again.",
  },
  "upload a PDF smaller than 6 MB": {
    headline: "That PDF is too large.",
    hint: "Upload a PDF smaller than 6 MB, or paste the pitch text.",
  },
  "that file does not look like a PDF": {
    headline: "That file does not look like a PDF.",
    hint: "Choose a .pdf file, or paste the pitch text.",
  },
  "that file does not look like a readable PDF": {
    headline: "We could not read that PDF.",
    hint: "Try a different copy, or paste the pitch text.",
  },
  "this PDF has no selectable text, paste the pitch text instead": {
    headline: "This PDF has no selectable text.",
    hint: "It may be a scanned image. Paste the pitch text instead.",
  },
  "this PDF is longer than 25 pages, paste the pitch text instead": {
    headline: "That PDF is longer than 25 pages.",
    hint: "Share the pitch itself, or paste the key pages as text.",
  },
  "submit a full https web address": {
    headline: "That address does not look right.",
    hint: "Submit a full https web address, like https://vendor.example.com.",
  },
  "that address is not one we can fetch": {
    headline: "That address is not one we can fetch.",
    hint: "Use the vendor's public website address.",
  },
  "that page could not be fetched": {
    headline: "That page could not be fetched.",
    hint: "Check the address, or paste the page text instead.",
  },
  "that address did not return a readable web page": {
    headline: "That address did not return a readable web page.",
    hint: "Point it at the vendor's marketing page, or paste the text instead.",
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
  locked: {
    headline: "This preview is password protected.",
    hint: "Reload the page and enter the preview password, then try again.",
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

const DISPUTE_MAP: Record<string, FriendlyError> = {
  "vendor, work email, the disputed item, and your statement are required": {
    headline: "The dispute is missing something.",
    hint: "Fill in your company, a work email, the item you dispute, and your statement.",
  },
  "verification failed": {
    headline: "We could not confirm your browser.",
    hint: "A new security check just started. Wait a moment, then send again.",
  },
  rate_limited: {
    headline: "You have reached the dispute limit for today.",
    hint: "Please try again tomorrow, or email disputes@group17a.com.",
  },
  storage: {
    headline: "We could not save your dispute.",
    hint: "Please try again in a moment, or email disputes@group17a.com.",
  },
  "not configured": {
    headline: "The dispute channel is not fully set up yet.",
    hint: "Please email disputes@group17a.com.",
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
  if (status === 429) {
    return surface === "dispute" ? DISPUTE_MAP.rate_limited : EVALUATE_MAP.rate_limited;
  }
  if (status >= 500) {
    return {
      headline: "Something went wrong on our side.",
      hint: "Please try again in a moment.",
    };
  }
  if (surface === "chat") return CHAT_MAP.session;
  if (surface === "dispute") {
    return { headline: "The dispute could not be sent.", hint: "Please try again." };
  }
  return { headline: "The check could not start.", hint: "Please try again." };
}

export function mapApiError(input: {
  status: number;
  code?: string | null;
  retryHint?: string | null;
  surface: ApiSurface;
}): FriendlyError {
  const { status, surface } = input;
  const code = input.code?.trim() || null;
  const table =
    surface === "chat" ? CHAT_MAP : surface === "dispute" ? DISPUTE_MAP : EVALUATE_MAP;

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
