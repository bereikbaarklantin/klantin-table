"use client";

import React from "react";
import { ReactNode, useEffect, useCallback, useState, useRef, createContext, useContext } from "react";

/* ═══════════════════════════════════════════════════
   MODAL — Centered overlay with backdrop blur
   ═══════════════════════════════════════════════════ */

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative w-full ${sizes[size]} rounded-2xl bg-dark-800 border border-dark-600/50 shadow-xl animate-scale-in`}>
        {title && (
          <div className="flex items-center justify-between border-b border-dark-600/50 px-5 py-4">
            <h3 className="font-display text-lg text-cream-200">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-cream-500 hover:bg-dark-700 hover:text-cream-200 transition"
              aria-label="Sluiten"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CONFIRM MODAL — Replaces window.confirm()
   ═══════════════════════════════════════════════════ */

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Bevestigen",
  cancelLabel = "Annuleren",
  variant = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}) {
  const variants = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    default: "bg-hapas-500 hover:bg-hapas-600",
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-cream-500 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-cream-400 hover:bg-dark-700 transition"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition active:scale-[0.97] ${variants[variant]}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════
   INPUT MODAL — Replaces window.prompt()
   ═══════════════════════════════════════════════════ */

export function InputModal({
  open,
  onClose,
  onSubmit,
  title,
  label,
  defaultValue = "",
  type = "text",
  submitLabel = "Opslaan",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label: string;
  defaultValue?: string;
  type?: "text" | "number";
  submitLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultValue]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <label className="block text-sm text-cream-500 mb-2">{label}</label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && value) { onSubmit(value); onClose(); } }}
        className="w-full rounded-xl bg-dark-900 border border-dark-600 px-4 py-2.5 text-cream-200 placeholder:text-cream-500/50 focus:border-hapas-500 focus:ring-1 focus:ring-hapas-500 outline-none transition"
      />
      <div className="flex gap-3 justify-end mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-cream-400 hover:bg-dark-700 transition"
        >
          Annuleren
        </button>
        <button
          onClick={() => { if (value) { onSubmit(value); onClose(); } }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-dark-900 bg-hapas-500 hover:bg-hapas-400 transition active:scale-[0.97]"
        >
          {submitLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════
   TOAST — Non-blocking notification system
   ═══════════════════════════════════════════════════ */

type ToastType = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; message: string; type: ToastType };

const ToastContext = createContext<{
  addToast: (message: string, type?: ToastType) => void;
}>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastMessage key={t.id} toast={t} onDismiss={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "!",
    info: "i",
  };
  const colors: Record<ToastType, string> = {
    success: "border-emerald-500/40 bg-emerald-500/10",
    error: "border-red-500/40 bg-red-500/10",
    warning: "border-amber-500/40 bg-amber-500/10",
    info: "border-blue-500/40 bg-blue-500/10",
  };
  const iconColors: Record<ToastType, string> = {
    success: "text-emerald-400",
    error: "text-red-400",
    warning: "text-amber-400",
    info: "text-blue-400",
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg glass animate-slide-down max-w-sm ${colors[toast.type]}`}
      role="alert"
    >
      <span className={`text-sm font-bold ${iconColors[toast.type]}`}>{icons[toast.type]}</span>
      <span className="text-sm text-cream-200 flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="text-cream-500 hover:text-cream-200 transition text-xs"
        aria-label="Sluiten"
      >
        ✕
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   BOTTOM SHEET — Swipe-up panel for mobile
   ═══════════════════════════════════════════════════ */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-dark-800 border-t border-dark-600/50 animate-slide-up max-h-[85vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-dark-500" />
        </div>
        {title && (
          <div className="px-5 py-3 border-b border-dark-600/50">
            <h3 className="font-display text-lg text-cream-200">{title}</h3>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4 thin-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SKELETON — Loading placeholder with gold shimmer
   ═══════════════════════════════════════════════════ */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-xl ${className}`} aria-hidden="true" />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-dark-800 p-4 space-y-3">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-dark-800 p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   NUMBER PICKER — Replaces window.prompt() for numbers
   ═══════════════════════════════════════════════════ */

export function NumberPicker({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-sm text-cream-500">{label}</span>}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-12 w-12 rounded-full border border-dark-500 bg-dark-700 text-xl font-bold text-cream-300 hover:border-hapas-500 hover:text-hapas-400 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Minder"
        >
          −
        </button>
        <span className="w-14 text-center text-3xl font-display font-bold text-hapas-500 tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-12 w-12 rounded-full bg-hapas-500 text-xl font-bold text-dark-900 hover:bg-hapas-400 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Meer"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STAR RATING — SVG-based, supports half stars
   ═══════════════════════════════════════════════════ */

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 40,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  max?: number;
  size?: number;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Beoordeling">
      {Array.from({ length: max }).map((_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value >= i + 0.5;
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(i + 1)}
            className={`transition-transform ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"}`}
            aria-label={`${i + 1} ${i + 1 === 1 ? "ster" : "sterren"}`}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id={`half-${i}`}>
                  <stop offset="50%" stopColor="#C4A052" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? "#C4A052" : half ? `url(#half-${i})` : "transparent"}
                stroke={filled || half ? "#C4A052" : "#4A4540"}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SEARCH BAR
   ═══════════════════════════════════════════════════ */

export function SearchBar({
  value,
  onChange,
  placeholder = "Zoeken...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500"
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-dark-800 border border-dark-600 pl-10 pr-10 py-2.5 text-sm text-cream-200 placeholder:text-cream-500/50 focus:border-hapas-500 focus:ring-1 focus:ring-hapas-500/30 outline-none transition"
      />
      {value && (
        <button
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-cream-200 transition"
          aria-label="Wissen"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ORDER TRACKER — Visual step indicator
   ═══════════════════════════════════════════════════ */

export function OrderTracker({
  steps,
  currentStep,
}: {
  steps: { label: string; icon?: string }[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center justify-between gap-1">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done
                    ? "bg-hapas-500 text-dark-900"
                    : active
                    ? "bg-hapas-500/20 border-2 border-hapas-500 text-hapas-400"
                    : "bg-dark-700 text-cream-500"
                }`}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 7l3.5 3.5L12 3" />
                  </svg>
                ) : (
                  step.icon || i + 1
                )}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${
                done || active ? "text-hapas-400" : "text-cream-500/60"
              }`}>
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full transition-colors ${
                done ? "bg-hapas-500" : "bg-dark-600"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FILTER CHIPS — Horizontal scrollable filter tags
   ═══════════════════════════════════════════════════ */

export function FilterChips({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string; icon?: string }[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
            selected === opt.value
              ? "bg-hapas-500 text-dark-900"
              : "bg-dark-800 text-cream-400 border border-dark-600 hover:border-hapas-500/40"
          }`}
        >
          {opt.icon && <span>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LOADING SPINNER
   ═══════════════════════════════════════════════════ */

export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin-slow ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 019.95 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   PREMIUM DIVIDER
   ═══════════════════════════════════════════════════ */

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`divider-gold my-4 ${className}`} />;
}

// ---------------------------------------------------------------------------
// ConnectionDot — realtime verbindingsstatus indicator
// ---------------------------------------------------------------------------
export function ConnectionDot() {
  // Dynamically import to avoid SSR issues
  const [status, setStatus] = React.useState<string>("connecting");

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/store").then(({ store }) => {
      const adapter = store as any;
      if (typeof adapter.onStatusChange === "function") {
        unsub = adapter.onStatusChange((s: string) => setStatus(s));
      } else {
        setStatus(store.mode === "demo" ? "polling" : "connecting");
      }
    });
    return () => unsub?.();
  }, []);

  const color =
    status === "connected"
      ? "bg-emerald-400"
      : status === "connecting"
      ? "bg-amber-400 animate-pulse"
      : status === "polling"
      ? "bg-sky-400"
      : "bg-red-400 animate-pulse";

  const label =
    status === "connected"
      ? "Realtime"
      : status === "connecting"
      ? "Verbinden…"
      : status === "polling"
      ? "Demo"
      : "Offline";

  return (
    <div className="flex items-center gap-1.5" title={`Status: ${label}`}>
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[10px] font-semibold text-cream-500/60 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
