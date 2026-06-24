// Tipos compartilhados (espelham o schema do Supabase do tracker).

export type Papel = "admin" | "dev" | "viewer";
export type Status = "todo" | "doing" | "done" | "blocked" | "cancelled";
export type Tipo =
  | "bug"
  | "melhoria"
  | "seguranca"
  | "performance"
  | "refatoracao"
  | "infra"
  | "limpeza";
export type Nivel = "baixa" | "media" | "alta" | "critica";
export type EventoTipo =
  | "criacao"
  | "status"
  | "atribuicao"
  | "comentario"
  | "nota_ia"
  | "microtarefa"
  | "bloqueio";

export type Modulo = {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
};

export type Tarefa = {
  id: string;
  modulo_id: string;
  codigo: string | null;
  titulo: string;
  descricao: string | null;
  impacto: string | null;
  tipo: Tipo | null;
  categoria: string | null;
  status: Status;
  prioridade: Nivel;
  urgencia: Nivel | null;
  prioridade_ia: boolean;
  analise_ia: string | null;
  analisado_em: string | null;
  branch: string | null;
  criterio_teste: string | null;
  responsavel_id: string | null;
  criado_por: string | null;
  origem: string;
  ordem: number;
  data_inicio: string | null;
  data_fim: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type TarefaEvento = {
  id: string;
  tarefa_id: string;
  tipo: EventoTipo;
  autor_id: string | null;
  autor_label: string | null;
  descricao: string | null;
  payload: Record<string, unknown> | null;
  criado_em: string;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; erro: string };

export const STATUS_LABEL: Record<Status, string> = {
  todo: "A fazer",
  doing: "Fazendo",
  done: "Feito",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};

export const NIVEL_LABEL: Record<Nivel, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const TIPO_LABEL: Record<Tipo, string> = {
  bug: "Bug",
  melhoria: "Melhoria",
  seguranca: "Segurança",
  performance: "Performance",
  refatoracao: "Refatoração",
  infra: "Infra",
  limpeza: "Limpeza",
};
