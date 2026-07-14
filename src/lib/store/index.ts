// ---------------------------------------------------------------------------
// Adapter-selectie. UI importeert uitsluitend `store` uit dit bestand.
// - NEXT_PUBLIC_DATA_MODE=supabase + env-keys aanwezig -> Supabase
// - anders -> demo-modus (localStorage + BroadcastChannel)
//
// Multi-tenant: NEXT_PUBLIC_TENANT_ID bepaalt welke restaurant-data geladen
// wordt. In productie wordt dit per subdomain/slug ingesteld.
// ---------------------------------------------------------------------------

import { DataAPI } from "./api";
import { mockAdapter } from "./mock";
import { SupabaseAdapter } from "./supabase";

function createStore(): DataAPI {
  const mode = process.env.NEXT_PUBLIC_DATA_MODE;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  if (mode === "supabase" && url && key && tenantId) {
    return new SupabaseAdapter(url, key, tenantId);
  }
  return mockAdapter;
}

export const store: DataAPI = createStore();
export type { DataAPI } from "./api";
