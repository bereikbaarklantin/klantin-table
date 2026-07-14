"use client";

// ---------------------------------------------------------------------------
// Super-admin dashboard — platformbeheer voor de eigenaar.
// Tenants beheren, commissie-inzicht, nieuwe restaurants aanmaken.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import type { AdminStats, Tenant } from "@/lib/types";
import { euro } from "@/lib/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "hapas:admin";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  paused: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  trial: "Proefperiode",
  active: "Actief",
  paused: "Gepauzeerd",
  cancelled: "Opgezegd",
};

// ---------------------------------------------------------------------------
// Auth gate — PIN-based, stored in sessionStorage
// ---------------------------------------------------------------------------

function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState(false);

  function tryLogin() {
    const expected = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "admin2024";
    if (secret === expected) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      onAuth();
    } else {
      setError(true);
      setSecret("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-white">Admin</h1>
          <p className="mt-1 text-sm text-slate-400">
            Voer het beheerderswachtwoord in.
          </p>
        </div>
        <input
          type="password"
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && tryLogin()}
          autoFocus
          placeholder="Wachtwoord"
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-center text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {error && (
          <p className="mt-2 text-center text-sm font-semibold text-red-400">
            Ongeldig wachtwoord.
          </p>
        )}
        <button
          onClick={tryLogin}
          className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          Inloggen
        </button>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-white">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Nieuw restaurant formulier
// ---------------------------------------------------------------------------

interface NewTenantForm {
  name: string;
  slug: string;
  ownerEmail: string;
  tableCount: number;
  googlePlaceId: string;
}

const EMPTY_FORM: NewTenantForm = {
  name: "",
  slug: "",
  ownerEmail: "",
  tableCount: 10,
  googlePlaceId: "",
};

function CreateTenantPanel({
  onCreated,
  adminSecret,
}: {
  onCreated: () => void;
  adminSecret: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewTenantForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateName(name: string) {
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim() || !form.ownerEmail.trim()) {
      setError("Vul alle verplichte velden in.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          ownerEmail: form.ownerEmail.trim(),
          tableCount: form.tableCount,
          googlePlaceId: form.googlePlaceId.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Fout ${res.status}`);
      }

      setSuccess(true);
      setForm(EMPTY_FORM);
      onCreated();
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-lg font-bold text-white">
          + Nieuw restaurant aanmaken
        </span>
        <svg
          className={`h-5 w-5 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-slate-700 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Naam */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Restaurant naam *
              </label>
              <input
                value={form.name}
                onChange={(e) => updateName(e.target.value)}
                placeholder="bijv. Tapas El Sol"
                className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Slug *
              </label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }
                placeholder="tapas-el-sol"
                className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none font-mono text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                E-mail eigenaar *
              </label>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ownerEmail: e.target.value }))
                }
                placeholder="eigenaar@restaurant.nl"
                className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Tafels */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Aantal tafels
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={form.tableCount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tableCount: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Google Place ID */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Google Place ID{" "}
                <span className="text-slate-500">(optioneel)</span>
              </label>
              <input
                value={form.googlePlaceId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, googlePlaceId: e.target.value }))
                }
                placeholder="ChIJ..."
                className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none font-mono text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>
          )}
          {success && (
            <p className="mt-3 text-sm font-semibold text-emerald-400">
              Restaurant aangemaakt!
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? "Aanmaken..." : "Restaurant aanmaken"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setForm(EMPTY_FORM);
                setError(null);
              }}
              className="rounded-xl px-5 py-2.5 font-semibold text-slate-400 transition hover:text-white"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminSecret =
    process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "admin2024";

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const headers = { "x-admin-secret": adminSecret };

      const [statsRes, tenantsRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/tenants", { headers }),
      ]);

      if (!statsRes.ok || !tenantsRes.ok) {
        throw new Error("Kan data niet ophalen.");
      }

      const [statsData, tenantsData] = await Promise.all([
        statsRes.json(),
        tenantsRes.json(),
      ]);

      setStats(statsData);
      setTenants(tenantsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    onLogout();
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-black text-white">
              Bestelsysteem Admin
            </h1>
            <p className="text-sm text-slate-400">
              Super-admin dashboard
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-500 hover:text-red-400"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-300">
            {error}
            <button
              onClick={fetchData}
              className="ml-3 font-semibold underline hover:text-red-200"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="ml-3 text-slate-400">Laden...</span>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Stats row */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Totaal restaurants"
                value={String(stats.totalTenants)}
              />
              <StatCard
                label="Actieve abonnementen"
                value={String(stats.activeTenants)}
              />
              <StatCard
                label="Bestellingen vandaag"
                value={String(stats.totalOrdersToday)}
                sub="Alle tenants"
              />
              <StatCard
                label="Commissie vandaag"
                value={euro(stats.totalCommissionTodayCents)}
                sub="Platformopbrengst"
              />
            </div>

            {/* Per-tenant breakdown */}
            {stats.tenantStats.length > 0 && (
              <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Commissie per restaurant (vandaag)
                </h2>
                <div className="space-y-2">
                  {stats.tenantStats.map((ts) => (
                    <div
                      key={ts.tenantId}
                      className="flex items-center justify-between rounded-xl bg-slate-700/40 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white">
                          {ts.tenantName}
                        </span>
                        <StatusBadge status={ts.subscriptionStatus} />
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-slate-400">
                          {ts.ordersToday} bestelling
                          {ts.ordersToday !== 1 ? "en" : ""}
                        </span>
                        <span className="font-bold text-emerald-400">
                          {euro(ts.commissionTodayCents)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create tenant */}
            <div className="mb-8">
              <CreateTenantPanel
                onCreated={fetchData}
                adminSecret={adminSecret}
              />
            </div>

            {/* Tenant list */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60">
              <div className="border-b border-slate-700 px-6 py-4">
                <h2 className="text-lg font-bold text-white">Restaurants</h2>
                <p className="text-sm text-slate-400">
                  {tenants.length} restaurant{tenants.length !== 1 ? "s" : ""}{" "}
                  geregistreerd
                </p>
              </div>

              {tenants.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-500">
                  Nog geen restaurants aangemaakt.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-6 py-3">Restaurant naam</th>
                        <th className="px-6 py-3">Slug</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3 text-center">Tafels</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Aangemaakt</th>
                        <th className="px-6 py-3">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {tenants.map((t) => (
                        <tr
                          key={t.id}
                          className="transition hover:bg-slate-700/30"
                        >
                          <td className="px-6 py-3 font-semibold text-white">
                            {t.name}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-slate-400">
                            {t.slug}
                          </td>
                          <td className="px-6 py-3 text-slate-300">
                            {t.ownerEmail}
                          </td>
                          <td className="px-6 py-3 text-center text-slate-300">
                            {t.tableCount}
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge status={t.subscriptionStatus} />
                          </td>
                          <td className="px-6 py-3 text-slate-400">
                            {new Date(t.createdAt).toLocaleDateString("nl-NL", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-3">
                            <a
                              href={`/${t.slug}/manager`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 transition hover:text-indigo-300 hover:underline"
                            >
                              Bekijken
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page export — manages auth state
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(sessionStorage.getItem(STORAGE_KEY) === "1");
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authed) {
    return <AdminLogin onAuth={() => setAuthed(true)} />;
  }

  return <AdminDashboard onLogout={() => setAuthed(false)} />;
}
