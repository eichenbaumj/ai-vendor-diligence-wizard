/*
  Invisible Turnstile placeholder. Renders nothing when no site key is
  configured (the default in mock mode and local development).

  TODO(pilot): load the real Turnstile widget script
  (https://challenges.cloudflare.com/turnstile/v0/api.js) when
  TURNSTILE_SITE_KEY is set, render the invisible widget, and pass the token
  through onToken so Check.tsx can include it in the evaluate request.
*/
import { TURNSTILE_SITE_KEY } from "@/lib/config";

export function TurnstilePlaceholder({
  onToken,
}: {
  onToken?: (token: string) => void;
}) {
  void onToken; // wired up when the real widget lands
  if (!TURNSTILE_SITE_KEY) return null;
  return <div id="turnstile-container" aria-hidden="true" />;
}
