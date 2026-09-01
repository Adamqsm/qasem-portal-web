"use client";

import { useCallback, useRef, useState } from "react";
import TurnstileWidget, { type TurnstileHandle } from "@/components/TurnstileWidget";
import { getUtmParams } from "@/lib/utm";

/**
 * One form, two kinds. All validation that matters happens server-side in
 * /api/contact; this component keeps honest client hints (required, max
 * lengths, email type) and full a11y state: visible labels, per-field errors
 * wired through aria-describedby, role="alert" for failures, and a focused
 * role="status" panel on success.
 */

type Kind = "general" | "careers";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string; field?: string };

const COPY: Record<
  Kind,
  { submit: string; success: string; messageLabel: string; messageHint?: string }
> = {
  general: {
    submit: "Send inquiry",
    success:
      "Received. Your message has been delivered. If a reply is needed, it will come to the email address you provided.",
    messageLabel: "Message",
  },
  careers: {
    submit: "Send introduction",
    success:
      "Received. Your introduction has been delivered. If there is a fit, now or later, you will hear from us at the email address you provided.",
    messageLabel: "Introduction",
    messageHint:
      "What you do, what you are looking for, and where you would fit.",
  },
};

const ERROR_MESSAGES: Record<string, string> = {
  turnstile:
    "The verification check did not pass. Please complete it again and resend.",
  "rate-limited":
    "Too many messages have been sent from this connection. Please wait ten minutes and try again.",
  unavailable:
    "The form is temporarily unavailable. Please try again in a few minutes.",
  server: "Something went wrong and the message was not sent. Please try again.",
  network:
    "The message could not be sent. Check your connection and try again.",
};

const FIELD_MESSAGES: Record<string, string> = {
  name: "Enter your name (2 to 120 characters).",
  email: "Enter a valid email address.",
  link: "If you include a link, it must start with http:// or https://.",
  message: "Enter a message (10 to 5000 characters).",
};

export default function ContactForm({ kind }: { kind: Kind }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [token, setToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const copy = COPY[kind];
  const id = (field: string) => `${kind}-${field}`;

  const onToken = useCallback((t: string | null) => setToken(t), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "submitting") return;

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      kind,
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
      ...(kind === "careers" ? { link: String(data.get("link") ?? "") } : {}),
      turnstileToken: token ?? "",
      utm: getUtmParams() ?? undefined,
    };

    setStatus({ state: "submitting" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus({ state: "success" });
        // Move focus to the confirmation so the outcome is announced.
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        field?: string;
      } | null;
      // Tokens are single-use: any rejected submit needs a fresh check.
      turnstileRef.current?.reset();
      setToken(null);
      if (res.status === 422 && body?.field) {
        setStatus({
          state: "error",
          field: body.field,
          message:
            FIELD_MESSAGES[body.field] ??
            "One of the fields could not be accepted. Please review and resend.",
        });
        requestAnimationFrame(() => {
          form.querySelector<HTMLElement>(`[name="${body.field}"]`)?.focus();
        });
        return;
      }
      const key = body?.error ?? "server";
      setStatus({
        state: "error",
        message: ERROR_MESSAGES[key] ?? ERROR_MESSAGES.server,
      });
    } catch {
      turnstileRef.current?.reset();
      setToken(null);
      setStatus({ state: "error", message: ERROR_MESSAGES.network });
    }
  }

  if (status.state === "success") {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="border-2 border-ink p-[5px] outline-none"
      >
        <div className="border border-ink p-7">
          <p className="eyebrow">Message sent</p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink">
            {copy.success}
          </p>
        </div>
      </div>
    );
  }

  const fieldError = status.state === "error" ? status.field : undefined;
  const formError =
    status.state === "error" && !status.field ? status.message : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate={false}>
      {formError && (
        <div
          role="alert"
          className="mb-6 border-l-2 border-error py-1 pl-4 text-[0.9375rem] font-medium leading-relaxed text-error"
        >
          {formError}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={id("name")} className="field-label">
            Name
          </label>
          <input
            id={id("name")}
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className="field-input"
            aria-invalid={fieldError === "name" || undefined}
            aria-describedby={fieldError === "name" ? id("name-error") : undefined}
          />
          {fieldError === "name" && (
            <p id={id("name-error")} className="field-error">
              {FIELD_MESSAGES.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={id("email")} className="field-label">
            Email
          </label>
          <input
            id={id("email")}
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="field-input"
            aria-invalid={fieldError === "email" || undefined}
            aria-describedby={fieldError === "email" ? id("email-error") : undefined}
          />
          {fieldError === "email" && (
            <p id={id("email-error")} className="field-error">
              {FIELD_MESSAGES.email}
            </p>
          )}
        </div>
      </div>

      {kind === "careers" && (
        <div className="mt-6">
          <label htmlFor={id("link")} className="field-label">
            Link <span className="normal-case tracking-normal text-faint">(optional)</span>
          </label>
          <input
            id={id("link")}
            name="link"
            type="url"
            maxLength={300}
            autoComplete="url"
            placeholder="https://"
            className="field-input"
            aria-invalid={fieldError === "link" || undefined}
            aria-describedby={
              fieldError === "link" ? id("link-error") : id("link-hint")
            }
          />
          {fieldError === "link" ? (
            <p id={id("link-error")} className="field-error">
              {FIELD_MESSAGES.link}
            </p>
          ) : (
            <p id={id("link-hint")} className="field-hint">
              LinkedIn profile or portfolio, if you would like it considered.
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        <label htmlFor={id("message")} className="field-label">
          {copy.messageLabel}
        </label>
        <textarea
          id={id("message")}
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="field-input resize-y"
          aria-invalid={fieldError === "message" || undefined}
          aria-describedby={
            fieldError === "message"
              ? id("message-error")
              : copy.messageHint
                ? id("message-hint")
                : undefined
          }
        />
        {fieldError === "message" ? (
          <p id={id("message-error")} className="field-error">
            {FIELD_MESSAGES.message}
          </p>
        ) : (
          copy.messageHint && (
            <p id={id("message-hint")} className="field-hint">
              {copy.messageHint}
            </p>
          )
        )}
      </div>

      <div className="mt-6">
        <TurnstileWidget ref={turnstileRef} onToken={onToken} />
      </div>

      <div className="mt-8">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status.state === "submitting"}
        >
          {status.state === "submitting" ? "Sending…" : copy.submit}
        </button>
      </div>
    </form>
  );
}
