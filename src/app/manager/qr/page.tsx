"use client";

// ---------------------------------------------------------------------------
// QR-code generator — printbare QR-codes per tafel.
// Genereert een raster van kaartjes met QR-code, tafelnummer en
// restaurantnaam. Print-optimized: verbergt UI-elementen bij afdrukken.
// ---------------------------------------------------------------------------

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import PinGate from "@/components/PinGate";
import { Button, Card } from "@/components/ui";

const HAPAS_GOLD = "#C4A052";
const HAPAS_DARK = "#1A1A1A";

function QRCard({
  tableNumber,
  url,
  restaurantName,
}: {
  tableNumber: number;
  url: string;
  restaurantName: string;
}) {
  return (
    <div className="qr-card flex flex-col items-center justify-center rounded-2xl border-2 border-hapas-500/30 bg-white p-4 shadow-lg">
      <p
        className="mb-1 text-xs font-bold uppercase tracking-widest"
        style={{ color: HAPAS_DARK }}
      >
        {restaurantName}
      </p>
      <QRCodeSVG
        value={url}
        size={160}
        level="H"
        bgColor="#FFFFFF"
        fgColor={HAPAS_DARK}
        includeMargin={false}
      />
      <p
        className="mt-2 text-2xl font-black"
        style={{ color: HAPAS_DARK }}
      >
        Tafel {tableNumber}
      </p>
      <p
        className="mt-0.5 text-[10px] font-medium break-all text-center"
        style={{ color: "#888" }}
      >
        Scan om te bestellen
      </p>
    </div>
  );
}

function QRGenerator() {
  const [slug, setSlug] = useState("HAPAS-NW");
  const [tableCount, setTableCount] = useState(15);
  const [restaurantName, setRestaurantName] = useState("Hapas Noordwijk");
  const [baseUrl, setBaseUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : "https://klantin-table.vercel.app"
  );
  const [generated, setGenerated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  function getTableUrl(n: number) {
    return `${baseUrl}/t/${slug}-T${n}`;
  }

  function handlePrint() {
    window.print();
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4">
      <header className="mb-6 print:hidden">
        <div className="flex items-center gap-3 mb-1">
          <a
            href="/manager"
            className="text-cream-500 hover:text-hapas-400 transition text-sm"
          >
            ← Manager
          </a>
        </div>
        <h1 className="text-xl font-display font-bold text-cream-200">
          📱 QR-codes genereren
        </h1>
        <p className="text-sm text-cream-500 mt-1">
          Genereer printbare QR-codes voor elke tafel. Gasten scannen de code
          om direct te bestellen.
        </p>
      </header>

      {/* Config form */}
      <Card>
        <div className="flex flex-col gap-4 print:hidden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-cream-400">
                Restaurantnaam
              </label>
              <input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 focus:border-hapas-500/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-cream-400">
                Slug (code in QR-URL)
              </label>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
                }
                className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 font-mono focus:border-hapas-500/50 focus:outline-none transition"
                placeholder="HAPAS-NW"
              />
              <p className="mt-0.5 text-xs text-cream-500/60">
                Voorbeeld URL: {getTableUrl(1)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-cream-400">
                Aantal tafels
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={tableCount}
                onChange={(e) =>
                  setTableCount(
                    Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                  )
                }
                className="mt-1 w-32 rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 focus:border-hapas-500/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-cream-400">
                Base URL
              </label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value.replace(/\/$/, ""))}
                className="mt-1 w-full rounded-xl border border-dark-600/50 bg-dark-700 p-2.5 text-sm text-cream-200 font-mono focus:border-hapas-500/50 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => setGenerated(true)}>
              QR-codes genereren ({tableCount} tafels)
            </Button>
            {generated && (
              <Button variant="secondary" onClick={handlePrint}>
                🖨️ Afdrukken
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* QR code grid */}
      {generated && (
        <div ref={printRef} className="mt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-6">
            {tables.map((n) => (
              <QRCard
                key={n}
                tableNumber={n}
                url={getTableUrl(n)}
                restaurantName={restaurantName}
              />
            ))}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .qr-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 2px solid ${HAPAS_GOLD} !important;
            margin-bottom: 12px;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </main>
  );
}

export default function QRPage() {
  return (
    <PinGate role="managerdashboard">
      <QRGenerator />
    </PinGate>
  );
}
