"use client";

import { ReactNode } from "react";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  full,
  size = "md",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  disabled?: boolean;
  full?: boolean;
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
}) {
  const base =
    "rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3.5 text-base",
  };
  const variants = {
    primary: "bg-hapas-600 text-white hover:bg-hapas-700 shadow-sm",
    secondary:
      "bg-white text-stone-800 border border-stone-200 hover:border-hapas-400 shadow-sm",
    ghost: "text-hapas-700 hover:bg-hapas-100",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm border border-stone-100 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "stone",
}: {
  children: ReactNode;
  tone?: "stone" | "amber" | "red" | "green" | "blue" | "hapas";
}) {
  const tones = {
    stone: "bg-stone-100 text-stone-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-sky-100 text-sky-700",
    hapas: "bg-hapas-100 text-hapas-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        {children}
      </h2>
      {right}
    </div>
  );
}

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
        className="h-8 w-8 rounded-full border border-stone-300 bg-white text-lg font-bold text-stone-700 active:scale-95"
        aria-label="minder"
      >
        −
      </button>
      <span className="w-6 text-center font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-8 w-8 rounded-full border border-hapas-500 bg-hapas-500 text-lg font-bold text-white active:scale-95"
        aria-label="meer"
      >
        +
      </button>
    </div>
  );
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/50 py-10 text-center">
      <div className="text-3xl">{emoji}</div>
      <p className="text-sm text-stone-500">{text}</p>
    </div>
  );
}
