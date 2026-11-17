"use client";

import { useEffect, useRef, useState } from "react";

// Replacement for window.confirm / window.prompt, so every question the app asks
// looks like the rest of the app and can be answered with the keyboard
// (Esc = cancel, Enter = OK). Mount <AskHost /> once per screen; without a host
// the browser's own dialogs are used, so nothing ever silently resolves.
type Opts = { title?: string; okLabel?: string; cancelLabel?: string; danger?: boolean; placeholder?: string; defaultValue?: string };
export type Choice = { label: string; value: string; kind?: "primary" };
type Req =
  | ({ kind: "confirm"; message: string; resolve: (v: boolean) => void } & Opts)
  | ({ kind: "prompt"; message: string; resolve: (v: string | null) => void } & Opts)
  | ({ kind: "choice"; message: string; choices: Choice[]; resolve: (v: string | null) => void } & Opts);

let push: ((r: Req) => void) | null = null;

export function askConfirm(message: string, opts: Opts = {}): Promise<boolean> {
  if (!push) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => push!({ kind: "confirm", message, resolve, ...opts }));
}

/** Resolves to the typed text, or null when cancelled. Empty text counts as cancelled. */
export function askPrompt(message: string, opts: Opts = {}): Promise<string | null> {
  if (!push) return Promise.resolve(window.prompt(message, opts.defaultValue ?? ""));
  return new Promise((resolve) => push!({ kind: "prompt", message, resolve, ...opts }));
}

/** Several answers instead of yes/no. Resolves to the chosen value, or null when cancelled (Esc, backdrop, Batal). */
export function askChoice(message: string, choices: Choice[], opts: Opts = {}): Promise<string | null> {
  const last = choices[choices.length - 1];
  if (!push) return Promise.resolve(window.confirm(`${message}\n\nOK = ${last.label}`) ? last.value : null);
  return new Promise((resolve) => push!({ kind: "choice", message, choices, resolve, ...opts }));
}

export function AskHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  const [text, setText] = useState("");
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const current = queue[0];

  useEffect(() => {
    push = (r) => setQueue((q) => [...q, r]);
    return () => {
      push = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    setText(current.defaultValue ?? "");
    const previous = document.activeElement as HTMLElement | null;
    // A destructive question starts on "Batal" so a stray Enter can't confirm it.
    const target = current.kind === "prompt" ? inputRef.current : current.danger ? cancelRef.current : okRef.current;
    target?.focus();
    return () => previous?.focus?.();
  }, [current]);

  if (!current) return null;

  const finish = (ok: boolean) => {
    if (current.kind === "confirm") current.resolve(ok);
    else if (current.kind === "choice") current.resolve(null);
    else current.resolve(ok && text.trim() ? text.trim() : null);
    setQueue((q) => q.slice(1));
  };
  const pick = (value: string) => {
    if (current.kind === "choice") current.resolve(value);
    setQueue((q) => q.slice(1));
  };

  return (
    <div className="askBackdrop" onMouseDown={(e) => e.target === e.currentTarget && finish(false)}>
      <div
        className="askDialog"
        role={current.danger ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="askTitle"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            finish(false);
          } else if (e.key === "Enter" && current.kind === "prompt" && !e.shiftKey && (e.target as HTMLElement).tagName === "TEXTAREA") {
            e.preventDefault();
            if (text.trim()) finish(true);
          }
        }}
      >
        <h3 id="askTitle">{current.title ?? (current.kind === "prompt" ? "Isi keterangan" : "Konfirmasi")}</h3>
        <p>{current.message}</p>
        {current.kind === "prompt" && (
          <textarea
            ref={inputRef}
            rows={3}
            value={text}
            placeholder={current.placeholder ?? "Tulis alasan di sini"}
            onChange={(e) => setText(e.target.value)}
          />
        )}
        <div className="askActions">
          <button type="button" ref={cancelRef} className="askCancel" onClick={() => finish(false)}>
            {current.cancelLabel ?? "Batal"}
          </button>
          {current.kind === "choice" ? (
            current.choices.map((c) =>
              c.kind === "primary" ? (
                <button key={c.value} type="button" ref={okRef} className="askOk" onClick={() => pick(c.value)}>
                  {c.label}
                </button>
              ) : (
                <button key={c.value} type="button" className="askCancel" onClick={() => pick(c.value)}>
                  {c.label}
                </button>
              ),
            )
          ) : (
            <button
              type="button"
              ref={okRef}
              className={`askOk${current.danger ? " danger" : ""}`}
              disabled={current.kind === "prompt" && !text.trim()}
              onClick={() => finish(true)}
            >
              {current.okLabel ?? "Ya, lanjutkan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
