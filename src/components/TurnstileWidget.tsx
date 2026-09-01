"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

/**
 * Cloudflare Turnstile, explicit render. The site key is public; in dev,
 * when no key is configured, Cloudflare's documented always-pass test key
 * keeps the widget visible and the flow testable. In production with no key
 * the server fails closed anyway (503), and the form surfaces that state.
 *
 * The widget re-renders when the site theme toggles so it never sits as a
 * light box on the dark page (Turnstile's own "auto" follows the OS, not
 * our class toggle).
 */

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TEST_ALWAYS_PASS_SITE_KEY = "1x00000000000000000000AA";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme: "light" | "dark";
    }
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = { reset: () => void };

function loadScript(onReady: () => void): () => void {
  if (window.turnstile) {
    onReady();
    return () => {};
  }
  let script = document.querySelector<HTMLScriptElement>(
    `script[src="${SCRIPT_SRC}"]`
  );
  const listener = () => onReady();
  if (!script) {
    script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);
  }
  script.addEventListener("load", listener);
  return () => script?.removeEventListener("load", listener);
}

const TurnstileWidget = forwardRef<
  TurnstileHandle,
  { onToken: (token: string | null) => void }
>(function TurnstileWidget({ onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile?.reset(widgetIdRef.current);
        } catch {}
      }
    },
  }));

  useEffect(() => {
    const siteKey =
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
      (process.env.NODE_ENV === "production" ? "" : TEST_ALWAYS_PASS_SITE_KEY);
    if (!siteKey) return; // production, unconfigured: server 503s; nothing to render

    let disposed = false;

    const renderWidget = () => {
      const el = containerRef.current;
      const api = window.turnstile;
      if (disposed || !el || !api) return;
      if (widgetIdRef.current !== null) {
        try {
          api.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
      el.innerHTML = "";
      const theme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      widgetIdRef.current = api.render(el, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
        theme,
      });
    };

    const unloadScript = loadScript(renderWidget);

    // Follow the site theme toggle.
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === "class")) renderWidget();
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => {
      disposed = true;
      observer.disconnect();
      unloadScript();
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile?.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
    // onToken is stable in our usage (useCallback in the form).
  }, [onToken]);

  return <div ref={containerRef} />;
});

export default TurnstileWidget;
