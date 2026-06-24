"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setCarregando(false);
    if (error) setErro("E-mail ou senha inválidos.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={entrar} className="card w-full max-w-sm p-6">
        <div className="mb-5 text-center">
          <div className="text-3xl">💎</div>
          <h1 className="mt-1 text-lg font-bold text-slate-900">
            AJ Progress Tracker
          </h1>
          <p className="text-xs text-slate-500">Progresso do ERP Alisson Joias</p>
        </div>

        {erro && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {erro}
          </p>
        )}

        <label className="label">E-mail</label>
        <input
          className="field mb-3"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label className="label">Senha</label>
        <input
          className="field mb-4"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="current-password"
        />

        <button className="btn-primary w-full" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

/**
 * Porteiro de autenticação (client):
 * - carregando -> placeholder
 * - sem sessão -> formulário de login
 * - logado mas sem perfil em `usuarios` -> sem acesso
 * - logado e com perfil -> shell (Sidebar + conteúdo)
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, usuario, carregando, sair } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Carregando…
      </div>
    );
  }

  if (!session) return <LoginForm />;

  if (!usuario) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="max-w-xs text-sm text-slate-600">
          Sua conta entrou, mas ainda não tem acesso liberado. Fale com um
          administrador para liberar seu perfil.
        </p>
        <button className="btn-ghost" onClick={sair}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 lg:py-8">{children}</main>
      </div>
    </>
  );
}
