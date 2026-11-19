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
  | ({ kind: "choice"; message: string; choices: Choice[]; resolve: (v: string | null) => void } & Opts)
  | ({ kind: "amount"; message: string; zeroLabel: string; resolve: (v: number | null) => void } & Opts);

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

/** Asks for a whole-number amount. Resolves to the number (0 = the "no amount" button) or null when cancelled. */
export function askAmount(message: string, opts: Opts & { zeroLabel?: string } = {}): Promise<number | null> {
  if (!push) {
    const v = window.prompt(message, "");
    return Promise.resolve(v === null || !/^\d+$/.test(v.trim()) ? null : Number(v.trim()));
  }
  return new Promise((resolve) => push!({ kind: "amount", message, zeroLabel: opts.zeroLabel ?? "Rp0", resolve, ...opts }));
}

export function AskHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  const [text, setText] = useState("");
  const [reveal, setReveal] = useState(false);
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
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
    setReveal(false);
    const previous = document.activeElement as HTMLElement | null;
    // A destructive question starts on "Batal" so a stray Enter can't confirm it.
    const target = current.kind === "prompt" ? inputRef.current : current.kind === "amount" ? amountRef.current : current.danger ? cancelRef.current : okRef.current;
    target?.focus();
    return () => previous?.focus?.();
  }, [current]);

  if (!current) return null;

  const finish = (ok: boolean) => {
    if (current.kind === "confirm") current.resolve(ok);
    else if (current.kind === "choice") current.resolve(null);
    else if (current.kind === "amount") current.resolve(ok && /^\d+$/.test(text.trim()) ? Number(text.trim()) : null);
    else current.resolve(ok && text.trim() ? text.trim() : null);
    setQueue((q) => q.slice(1));
  };
  const pick = (value: string) => {
    if (current.kind === "choice") current.resolve(value);
    setQueue((q) => q.slice(1));
  };
  const amountOk = current.kind === "amount" && /^\d+$/.test(text.trim());
  const pickZero = () => {
    if (current.kind === "amount") current.resolve(0);
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
          } else if (e.key === "Enter" && current.kind === "amount" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
            if (amountOk) finish(true);
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
        {current.kind === "amount" && (
          <div className="askAmount">
            <input
              ref={amountRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Jumlah dalam rupiah"
              placeholder="Contoh: 250000"
              className={reveal ? "" : "askMasked"}
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))}
            />
            <button type="button" className="askEye" onClick={() => setReveal((v) => !v)}>
              {reveal ? "Sembunyikan angka" : "Tampilkan angka"}
            </button>
          </div>
        )}
        <div className="askActions">
          <button type="button" ref={cancelRef} className="askCancel" onClick={() => finish(false)}>
            {current.cancelLabel ?? "Batal"}
          </button>
          {current.kind === "amount" && (
            <button type="button" className="askCancel" onClick={pickZero}>
              {current.zeroLabel}
            </button>
          )}
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
              disabled={(current.kind === "prompt" && !text.trim()) || (current.kind === "amount" && !amountOk)}
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
