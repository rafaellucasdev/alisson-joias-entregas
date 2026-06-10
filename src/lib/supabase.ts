import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service_role key.
 * USADO APENAS NO SERVIDOR (server actions). Ignora RLS, por isso a chave
 * jamais pode chegar ao navegador — toda validação acontece no backend.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes. Configure o .env.local.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // O Next.js cacheia `fetch` por padrão no App Router. Como o supabase-js
    // usa fetch, leituras após escritas voltariam stale. Forçamos no-store
    // para garantir dados sempre frescos (essencial nos fluxos de entrega).
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}
