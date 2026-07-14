"use client";

import { ReactNode } from "react";
import { Spinner } from "./premium-ui";

/* ═══════════════════════════════════════════════════
   BUTTON — Premium dark theme with gold accents
   ═══════════════════════════════════════════════════ */

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  full,
  size = "md",
  type = "button",
  loading = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  disabled?: boolean;
  full?: boolean;
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  loading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };
  const variants = {
    primary: "bg-hapas-500 text-dark-900 hover:bg-hapas-400 shadow-gold-sm hover:shadow-gold-md",
    secondary:
      "bg-dark-800 text-cream-200 border border-dark-600 hover:border-hapas-500/50 hover:text-hapas-400",
    ghost: "text-hapas-500 hover:bg-hapas-500/10",
    danger: "bg-red-600/90 text-white hover:bg-red-600 shadow-sm",
    success: "bg-emerald-600/90 text-white hover:bg-emerald-600 shadow-sm",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""}`}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   CARD — Dark elevated surface
   ═══════════════════════════════════════════════════ */

export function Card({
  children,
  className = "",
  hover = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  const hoverClass = hover
    ? "cursor-pointer hover:border-hapas-500/30 hover:shadow-card-hover transition-all"
    : "";
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl bg-dark-800 p-4 shadow-card border border-dark-600/30 ${hoverClass} ${className}`}
    >
      {children}
    </Component>
  );
}

/* ═══════════════════════════════════════════════════
   BADGE — Status indicator
   ═══════════════════════════════════════════════════ */

export function Badge({
  children,
  tone = "stone",
}: {
  children: ReactNode;
  tone?: "stone" | "amber" | "red" | "green" | "blue" | "gold";
}) {
  const tones = {
    stone: "bg-dark-600/50 text-cream-400",
    amber: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    red: "bg-red-500/15 text-red-400 border border-red-500/20",
    green: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    blue: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    gold: "bg-hapas-500/15 text-hapas-400 border border-hapas-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION TITLE
   ═══════════════════════════════════════════════════ */

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-xs font-bold uppercase tracking-widest text-hapas-500">
        {children}
      </h2>
      {right}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STEPPER — Quantity control
   ═══════════════════════════════════════════════════ */

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-8 w-8 rounded-full border border-dark-500 bg-dark-700 text-lg font-bold text-cream-300 active:scale-95 hover:border-hapas-500/50 transition disabled:opacity-30"
        aria-label="minder"
      >
        −
      </button>
      <span className="w-6 text-center font-bold tabular-nums text-cream-200">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-8 w-8 rounded-full bg-hapas-500 text-lg font-bold text-dark-900 active:scale-95 hover:bg-hapas-400 transition disabled:opacity-30"
        aria-label="meer"
      >
        +
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════ */

export function EmptyState({
  emoji,
  text,
  action,
}: {
  emoji: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-dark-600 bg-dark-800/50 py-12 text-center">
      <div className="text-4xl opacity-60">{emoji}</div>
      <p className="text-sm text-cream-500 max-w-xs">{text}</p>
      {action}
    </div>
  );
}
