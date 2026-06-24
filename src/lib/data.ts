import { supabase } from "@/lib/supabase/client";
import {
  STATUS_LABEL,
  type Modulo,
  type Nivel,
  type Status,
  type Tarefa,
  type TarefaEvento,
  type Tipo,
} from "@/lib/types";

export async function getModulo(slug: string): Promise<Modulo | null> {
  const { data } = await supabase
    .from("modulos")
    .select("id, nome, slug, ordem")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Modulo) ?? null;
}

export async function listarTarefas(moduloId: string): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from("tarefas")
    .select("*")
    .eq("modulo_id", moduloId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Tarefa[]) ?? [];
}

export async function listarEventos(tarefaId: string): Promise<TarefaEvento[]> {
  const { data, error } = await supabase
    .from("tarefa_eventos")
    .select("*")
    .eq("tarefa_id", tarefaId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as TarefaEvento[]) ?? [];
}

async function registrarEvento(e: {
  tarefa_id: string;
  tipo: TarefaEvento["tipo"];
  autor_id: string | null;
  descricao?: string;
  payload?: Record<string, unknown>;
}) {
  await supabase.from("tarefa_eventos").insert({
    tarefa_id: e.tarefa_id,
    tipo: e.tipo,
    autor_id: e.autor_id,
    descricao: e.descricao ?? null,
    payload: e.payload ?? null,
  });
}

export async function moverTarefa(tarefa: Tarefa, novo: Status, autorId: string) {
  if (tarefa.status === novo) return;
  const patch: Partial<Tarefa> = { status: novo };
  if (novo === "doing" && !tarefa.data_inicio) {
    patch.data_inicio = new Date().toISOString();
  }
  if (novo === "done") patch.data_fim = new Date().toISOString();

  const { error } = await supabase.from("tarefas").update(patch).eq("id", tarefa.id);
  if (error) throw new Error(error.message);

  await registrarEvento({
    tarefa_id: tarefa.id,
    tipo: novo === "blocked" ? "bloqueio" : "status",
    autor_id: autorId,
    descricao: `${STATUS_LABEL[tarefa.status]} → ${STATUS_LABEL[novo]}`,
  });
}

export async function atualizarPrioridade(
  tarefa: Tarefa,
  prioridade: Nivel,
  urgencia: Nivel | null,
  autorId: string,
) {
  const { error } = await supabase
    .from("tarefas")
    .update({ prioridade, urgencia, prioridade_ia: false })
    .eq("id", tarefa.id);
  if (error) throw new Error(error.message);

  await registrarEvento({
    tarefa_id: tarefa.id,
    tipo: "atribuicao",
    autor_id: autorId,
    descricao: `Prioridade: ${prioridade}${urgencia ? ` · urgência: ${urgencia}` : ""}`,
  });
}

export async function comentar(tarefaId: string, texto: string, autorId: string) {
  await registrarEvento({
    tarefa_id: tarefaId,
    tipo: "comentario",
    autor_id: autorId,
    descricao: texto,
  });
}

export type NovaTarefa = {
  titulo: string;
  descricao?: string;
  tipo?: Tipo;
  categoria?: string;
  prioridade?: Nivel;
};

export async function criarTarefa(
  moduloId: string,
  t: NovaTarefa,
  autorId: string,
): Promise<Tarefa> {
  const { data, error } = await supabase
    .from("tarefas")
    .insert({
      modulo_id: moduloId,
      titulo: t.titulo,
      descricao: t.descricao ?? null,
      tipo: t.tipo ?? null,
      categoria: t.categoria ?? null,
      prioridade: t.prioridade ?? "media",
      status: "todo",
      criado_por: autorId,
      origem: "humano",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await registrarEvento({
    tarefa_id: (data as Tarefa).id,
    tipo: "criacao",
    autor_id: autorId,
    descricao: "Tarefa criada",
  });
  return data as Tarefa;
}
