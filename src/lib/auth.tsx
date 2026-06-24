"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Usuario } from "@/lib/types";

type AuthState = {
  session: Session | null;
  usuario: Usuario | null;
  carregando: boolean;
  podeEditar: boolean;
  sair: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let ativo = true;
    if (!session) {
      setUsuario(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    supabase
      .from("usuarios")
      .select("id, nome, email, papel")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo) return;
        setUsuario((data as Usuario) ?? null);
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [session]);

  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "dev";
  const sair = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, usuario, carregando, podeEditar, sair }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return c;
}
