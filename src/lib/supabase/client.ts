import { createClient } from "@supabase/supabase-js";

// Cliente do NAVEGADOR (anon key — pública por design).
// Toda a segurança vem das policies RLS: viewer lê; admin/dev escreve.
// A sessão do usuário logado é anexada automaticamente em cada request,
// inclusive nas subscriptions de Realtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local",
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
