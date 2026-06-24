"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getModulo, listarTarefas } from "@/lib/data";
import type { Modulo, Tarefa } from "@/lib/types";

/**
 * Carrega o módulo + suas tarefas e mantém em tempo real (Supabase Realtime).
 * Qualquer INSERT/UPDATE/DELETE em `tarefas` recarrega a lista para todos.
 */
export function useTarefas(slug = "financeiro") {
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const m = modulo ?? (await getModulo(slug));
    if (!m) return;
    setTarefas(await listarTarefas(m.id));
  }, [modulo, slug]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const m = await getModulo(slug);
      if (!ativo) return;
      setModulo(m);
      if (m) setTarefas(await listarTarefas(m.id));
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!modulo) return;
    const ch = supabase
      .channel(`rt-tarefas-${modulo.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tarefas" },
        async () => {
          setTarefas(await listarTarefas(modulo.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [modulo]);

  return { modulo, tarefas, carregando, recarregar };
}
