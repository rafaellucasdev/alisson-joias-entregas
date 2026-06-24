import type { Nivel, Status, Tipo } from "@/lib/types";

export const corStatus: Record<Status, string> = {
  todo: "bg-creme-100 text-esmeralda-700",
  doing: "bg-dourado/15 text-dourado-dark",
  done: "bg-esmeralda-50 text-esmeralda-700",
  blocked: "bg-red-50 text-red-700",
  cancelled: "bg-creme-100 text-creme-400 line-through",
};

export const corNivel: Record<Nivel, string> = {
  baixa: "bg-creme-100 text-stone-500",
  media: "bg-esmeralda-50 text-esmeralda-700",
  alta: "bg-dourado/15 text-dourado-dark",
  critica: "bg-red-50 text-red-700",
};

export const corTipo: Record<Tipo, string> = {
  bug: "bg-red-50 text-red-600",
  melhoria: "bg-esmeralda-50 text-esmeralda-700",
  seguranca: "bg-dourado/15 text-dourado-dark",
  performance: "bg-violet-50 text-violet-600",
  refatoracao: "bg-creme-100 text-stone-600",
  infra: "bg-stone-100 text-stone-600",
  limpeza: "bg-teal-50 text-teal-600",
};

export function formatarData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
