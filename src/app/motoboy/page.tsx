"use client";

import { useState } from "react";
import {
  loginMotoboy,
  liberarEntrega,
  registrarEntrega,
} from "@/app/actions/motoboy";
import { brl, dataHora } from "@/lib/format";
import type { VendaResumo } from "@/lib/types";

type Motoboy = { id: string; nome: string };

export default function MotoboyPage() {
  const [codigoMotoboy, setCodigoMotoboy] = useState("");
  const [motoboy, setMotoboy] = useState<Motoboy | null>(null);
  const [entregas, setEntregas] = useState<VendaResumo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setErro(null);
    setLoading(true);
    const res = await loginMotoboy(codigoMotoboy);
    setLoading(false);
    if (!res.ok) {
      setErro(res.erro);
      return;
    }
    setMotoboy(res.data.motoboy);
    setEntregas(res.data.entregas);
  }

  function atualizarEntrega(nova: VendaResumo) {
    setEntregas((lista) =>
      lista.map((e) => (e.entregaId === nova.entregaId ? nova : e)),
    );
  }

  // -------- Login -----------------------------------------------------------
  if (!motoboy) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-bold">🛵 Área do Motoboy</h1>
          <p className="mb-4 text-sm text-slate-500">
            Informe seu código de entregador para ver suas entregas.
          </p>
          <input
            className="field font-mono uppercase"
            placeholder="Código do motoboy"
            value={codigoMotoboy}
            onChange={(e) => setCodigoMotoboy(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
          />
          {erro && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
          <button className="btn-primary mt-4 w-full" disabled={loading} onClick={entrar}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  // -------- Lista de entregas do motoboy ------------------------------------
  const pendentes = entregas.filter((e) => e.situacaoEntrega !== "concluida");
  const concluidas = entregas.filter((e) => e.situacaoEntrega === "concluida");

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Entregador</div>
          <h1 className="text-xl font-bold">{motoboy.nome}</h1>
        </div>
        <button
          className="btn-ghost"
          onClick={() => {
            setMotoboy(null);
            setEntregas([]);
            setCodigoMotoboy("");
          }}
        >
          Sair
        </button>
      </div>

      {entregas.length === 0 && (
        <div className="card p-6 text-center text-sm text-slate-500">
          Nenhuma entrega atribuída a você.
        </div>
      )}

      {pendentes.length > 0 && (
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Pendentes ({pendentes.length})
        </h2>
      )}
      <div className="space-y-3">
        {pendentes.map((e) => (
          <CardEntrega
            key={e.entregaId}
            entrega={e}
            codigoMotoboy={codigoMotoboy}
            onAtualizar={atualizarEntrega}
          />
        ))}
      </div>

      {concluidas.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-slate-600">
            Concluídas ({concluidas.length})
          </h2>
          <div className="space-y-3">
            {concluidas.map((e) => (
              <CardEntrega
                key={e.entregaId}
                entrega={e}
                codigoMotoboy={codigoMotoboy}
                onAtualizar={atualizarEntrega}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================================================
//  Card de uma entrega
// ===========================================================================
function CardEntrega({
  entrega,
  codigoMotoboy,
  onAtualizar,
}: {
  entrega: VendaResumo;
  codigoMotoboy: string;
  onAtualizar: (e: VendaResumo) => void;
}) {
  const [liberado, setLiberado] = useState(false);
  const [codigoCliente, setCodigoCliente] = useState("");
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const concluida = entrega.situacaoEntrega === "concluida";
  const pendentesItens = entrega.itens.filter((i) => !i.entregue);

  async function liberar() {
    setErro(null);
    setLoading(true);
    const res = await liberarEntrega({ codigoMotoboy, codigoCliente });
    setLoading(false);
    if (!res.ok) {
      setErro(res.erro);
      return;
    }
    onAtualizar(res.data);
    setLiberado(true);
  }

  function toggle(id: string) {
    setSelecionados((s) => ({ ...s, [id]: !s[id] }));
  }
  function marcarTodos() {
    const novo: Record<string, boolean> = {};
    pendentesItens.forEach((i) => (novo[i.itemEntregaId] = true));
    setSelecionados(novo);
  }

  async function registrar() {
    const ids = Object.entries(selecionados)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) {
      setErro("Selecione ao menos um item (ou use 'Marcar todos').");
      return;
    }
    setErro(null);
    setLoading(true);
    const res = await registrarEntrega({
      codigoMotoboy,
      entregaId: entrega.entregaId,
      itensEntreguesIds: ids,
      observacao,
    });
    setLoading(false);
    if (!res.ok) {
      setErro(res.erro);
      return;
    }
    onAtualizar(res.data);
    setSelecionados({});
    setObservacao("");
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="font-bold">{entrega.cliente}</div>
          <div className="text-xs text-slate-500">
            {dataHora(entrega.criadaEm)} · {brl(entrega.total)}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            concluida
              ? "bg-green-100 text-green-700"
              : entrega.situacaoEntrega === "parcial"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {entrega.situacaoEntrega}
        </span>
      </div>

      {/* Liberação: exige código do cliente */}
      {!liberado && !concluida && (
        <div className="mt-2">
          <p className="mb-2 text-xs text-slate-500">
            Informe o código do cliente para liberar a entrega dos itens.
          </p>
          <div className="flex gap-2">
            <input
              className="field font-mono uppercase"
              placeholder="Código do cliente"
              value={codigoCliente}
              onChange={(e) => setCodigoCliente(e.target.value.toUpperCase())}
            />
            <button className="btn-primary" disabled={loading} onClick={liberar}>
              Liberar
            </button>
          </div>
          {erro && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>
      )}

      {/* Itens (após liberar, ou se já concluída para visualização) */}
      {(liberado || concluida) && (
        <div className="mt-2">
          <ul className="divide-y divide-slate-100">
            {entrega.itens.map((it) => {
              const checked = it.entregue || !!selecionados[it.itemEntregaId];
              return (
                <li
                  key={it.itemEntregaId}
                  className="flex items-center gap-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-brand"
                    checked={checked}
                    disabled={it.entregue || concluida}
                    onChange={() => toggle(it.itemEntregaId)}
                  />
                  <span className={`flex-1 ${it.entregue ? "text-slate-400 line-through" : ""}`}>
                    {it.quantidade}× {it.nomeProduto}
                  </span>
                  {it.entregue && (
                    <span className="text-xs font-medium text-green-600">entregue</span>
                  )}
                </li>
              );
            })}
          </ul>

          {!concluida && (
            <div className="mt-3 space-y-2">
              <button className="btn-ghost w-full" onClick={marcarTodos}>
                Marcar todos os pendentes (entrega total)
              </button>
              <textarea
                className="field"
                rows={2}
                placeholder="Observações (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
              {erro && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {erro}
                </p>
              )}
              <button className="btn-primary w-full" disabled={loading} onClick={registrar}>
                {loading ? "Registrando…" : "Registrar entrega"}
              </button>
              <p className="text-center text-xs text-slate-400">
                Itens não marcados continuam pendentes para nova tentativa.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
