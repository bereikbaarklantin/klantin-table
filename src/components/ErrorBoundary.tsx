"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="mx-auto max-w-sm rounded-2xl border border-red-500/20 bg-dark-800 p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="font-display text-lg font-bold text-cream-200">
              Er ging iets mis
            </h2>
            <p className="mt-2 text-sm text-cream-500">
              {this.state.error?.message || "Onverwachte fout opgetreden."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-4 rounded-xl bg-hapas-500 px-5 py-2.5 text-sm font-bold text-dark-900 shadow-gold-sm transition hover:bg-hapas-400 active:scale-95"
            >
              Pagina herladen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Offline-detectie banner */
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    setOffline(!navigator.onLine);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-red-600/95 px-4 py-2 text-center text-sm font-bold text-white backdrop-blur-sm">
      📡 Geen internetverbinding — gegevens worden niet bijgewerkt
    </div>
  );
}
