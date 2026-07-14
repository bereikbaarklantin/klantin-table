"use client";

// ---------------------------------------------------------------------------
// Homepage / Demo-navigatie — overzicht van alle schermen + QR-links.
// In productie wordt dit een simpele redirect of splash; voor de pilot
// fungeert het als navigatiehub zodat alle schermen snel bereikbaar zijn.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { Badge, Card } from "@/components/ui";

const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);

const SCREENS = [
  {
    href: "/kitchen",
    emoji: "👨‍🍳",
    title: "Keuken (KDS)",
    desc: "Keukenscherm — nieuwe bestellingen accepteren, bereiden, gereedmelden.",
    color: "bg-amber-50 border-amber-200",
  },
  {
    href: "/service",
    emoji: "🤵",
    title: "Bediening",
    desc: "Drankbestellingen, gerechten gereed, tafelverzoeken, tafels sluiten.",
    color: "bg-sky-50 border-sky-200",
  },
  {
    href: "/manager",
    emoji: "📊",
    title: "Manager",
    desc: "KPI's, omzet, instellingen, reviewfeedback, menubeschikbaarheid.",
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    href: "/admin",
    emoji: "⚙️",
    title: "Admin (SaaS)",
    desc: "Platformbeheer — restaurants toevoegen, commissie-inzicht, abonnementen.",
    color: "bg-violet-50 border-violet-200",
  },
];

export default function HomePage() {
  const slug =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_TENANT_ID
        ? "TENANT"
        : "DEMO"
      : "DEMO";

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      {/* Header */}
      <header className="text-center">
        <div className="text-5xl">🥘</div>
        <h1 className="mt-2 text-3xl font-black text-hapas-800">
          Bestelsysteem SaaS
        </h1>
        <p className="mt-1 text-stone-500 font-semibold">
          Digitaal bestelsysteem voor restaurants
        </p>
        <Badge tone="hapas">
          {slug === "DEMO" ? "demo-modus" : "productie"}
        </Badge>
      </header>

      {/* Info */}
      <Card className="mt-6 bg-hapas-50/60">
        <p className="text-sm text-hapas-900">
          <strong>Hoe werkt de demo?</strong> Open een tafelnummer hieronder
          op je telefoon (of in een nieuw tabblad) om de gast-ervaring te
          testen. Open de keuken-, bedienings- en managerschermen in aparte
          tabbladen om het volledige systeem te zien. Alle schermen werken
          realtime samen via lokale opslag — geen backend nodig.
        </p>
        <p className="mt-2 text-xs text-hapas-700">
          Pincode personeel: <code className="font-mono font-bold">1234</code>{" "}
          (aanpasbaar in het managerscherm)
        </p>
      </Card>

      {/* Personeelsschermen */}
      <h2 className="mt-8 text-lg font-black text-stone-700">
        Personeelsschermen
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCREENS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`block rounded-2xl border p-4 transition hover:shadow-md active:scale-[0.99] ${s.color}`}
          >
            <p className="text-2xl">{s.emoji}</p>
            <p className="mt-1 font-bold">{s.title}</p>
            <p className="mt-0.5 text-xs text-stone-600">{s.desc}</p>
          </Link>
        ))}
      </div>

      {/* Gastschermen — tafels */}
      <h2 className="mt-8 text-lg font-black text-stone-700">
        Gastschermen (QR per tafel)
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Elke tafel heeft een unieke code. Tik op een tafelnummer om de
        gast-app te openen — precies zoals een gast dat doet via de QR-code.
      </p>
      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {TABLES.map((n) => (
          <Link
            key={n}
            href={`/t/DEMO-T${n}`}
            className="flex aspect-square items-center justify-center rounded-xl border border-hapas-200 bg-white font-bold text-hapas-700 shadow-sm transition hover:bg-hapas-100 hover:border-hapas-400 active:scale-95"
          >
            {n}
          </Link>
        ))}
      </div>

      {/* QR-formaat info */}
      <Card className="mt-6">
        <p className="text-sm text-stone-600">
          <strong>QR-code formaat:</strong>{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">
            https://jouw-domein.nl/t/SLUG-T12
          </code>
        </p>
        <p className="mt-1 text-xs text-stone-500">
          SLUG = restaurant-slug · T12 = tafelnummer. Genereer QR-codes met
          bijv. qr-code-generator.com.
        </p>
      </Card>

      {/* Techstack */}
      <footer className="mt-10 border-t border-stone-200 pt-4 text-center text-xs text-stone-400">
        <p>
          Next.js · React · Tailwind CSS · Supabase · Vercel
        </p>
        <p className="mt-1">Bestelsysteem SaaS v1.0</p>
      </footer>
    </main>
  );
}
