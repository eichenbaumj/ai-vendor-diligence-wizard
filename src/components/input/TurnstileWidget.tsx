/*
  Cloudflare Turnstile widget (non-interactive mode: a brief automatic check,
  no puzzles). Loads the script once, renders the widget, and hands tokens to
  the parent. Tokens are single-use and are consumed by server verification
  even when the request later fails, so the parent gets a reset handle: call
  reset() after any failed submit to drop the burned token and start a fresh
  check; the widget then delivers a new token through onToken.

  Renders nothing when no site key is configured (mock mode / bare local dev).
*/
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/config";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          appearance?: string;
          size?: string;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("turnstile script failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export interface TurnstileHandle {
  reset: () => void;
}

export const TurnstileWidget = forwardRef<
  TurnstileHandle,
  { onToken?: (token: string | null) => void }
>(function TurnstileWidget({ onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        /* Drop the stale token first, unconditionally: even when the script
           is blocked and there is no widget, the parent must not resend a
           consumed token. */
        onTokenRef.current?.(null);
        if (widgetIdRef.current && window.turnstile?.reset) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => onTokenRef.current?.(token),
          "expired-callback": () => onTokenRef.current?.(null),
          "error-callback": () => onTokenRef.current?.(null),
        });
      })
      .catch(() => {
        /* Script blocked (locked-down network): submit proceeds without a
           token and the server's response explains if verification is
           required. */
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} className="mt-4 min-h-[65px] no-print" />;
});

/* Back-compat alias for existing imports. */
export { TurnstileWidget as TurnstilePlaceholder };
