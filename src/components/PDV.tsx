"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { finalizarVenda } from "@/app/actions/pdv";
import { brl } from "@/lib/format";
import type { Produto, TipoEntrega } from "@/lib/types";

type Motoboy = { id: string; nome: string };

type Confirmacao = {
  codigo: string;
  tipoEntrega: TipoEntrega;
  total: number;
  whatsappEnviado: boolean;
  whatsappMotivo?: string;
};

export function PDV({
  produtos,
  motoboys,
}: {
  produtos: Produto[];
  motoboys: Motoboy[];
}) {
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("retirada");
  const [motoboyId, setMotoboyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const total = useMemo(
    () =>
      produtos.reduce(
        (acc, p) => acc + (carrinho[p.id] ?? 0) * p.preco,
        0,
      ),
    [carrinho, produtos],
  );
  const qtdItens = useMemo(
    () => Object.values(carrinho).reduce((a, b) => a + b, 0),
    [carrinho],
  );

  function add(id: string) {
    setCarrinho((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function remove(id: string) {
    setCarrinho((c) => {
      const n = (c[id] ?? 0) - 1;
      const novo = { ...c };
      if (n <= 0) delete novo[id];
      else novo[id] = n;
      return novo;
    });
  }

  async function finalizar() {
    setErro(null);
    if (qtdItens === 0) {
      setErro("Adicione ao menos um produto ao carrinho.");
      return;
    }
    setLoading(true);
    const res = await finalizarVenda({
      cliente: { nome, whatsapp, cpf },
      itens: Object.entries(carrinho).map(([produtoId, quantidade]) => ({
        produtoId,
        quantidade,
      })),
      tipoEntrega,
      motoboyId: tipoEntrega === "motoboy" ? motoboyId : null,
    });
    setLoading(false);

    if (!res.ok) {
      setErro(res.erro);
      return;
    }
    setConfirmacao({
      codigo: res.data.codigo,
      tipoEntrega: res.data.tipoEntrega,
      total: res.data.total,
      whatsappEnviado: res.data.whatsappEnviado,
      whatsappMotivo: res.data.whatsappMotivo,
    });
  }

  function novaVenda() {
    setCarrinho({});
    setNome("");
    setWhatsapp("");
    setCpf("");
    setTipoEntrega("retirada");
    setMotoboyId("");
    setConfirmacao(null);
    setErro(null);
  }

  // -------- Tela de confirmação --------------------------------------------
  if (confirmacao) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-6 text-center">
          <div className="mb-2 text-5xl">✅</div>
          <h1 className="text-xl font-bold">Venda finalizada!</h1>
          <p className="mt-1 text-sm text-slate-500">
            Total: <strong>{brl(confirmacao.total)}</strong> ·{" "}
            {confirmacao.tipoEntrega === "retirada"
              ? "Retirada na loja"
              : "Entrega por motoboy"}
          </p>

          <div className="my-5 rounded-xl bg-slate-900 px-4 py-5 text-white">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Código de retirada
            </div>
            <div className="mt-1 font-mono text-3xl font-bold tracking-[0.2em]">
              {confirmacao.codigo}
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              confirmacao.whatsappEnviado
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {confirmacao.whatsappEnviado
              ? "📲 Código enviado por WhatsApp ao cliente."
              : `⚠️ WhatsApp não enviado (${confirmacao.whatsappMotivo}). O código acima continua válido.`}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button className="btn-primary" onClick={novaVenda}>
              Nova venda
            </button>
            <Link
              href={
                confirmacao.tipoEntrega === "retirada" ? "/retirada" : "/motoboy"
              }
              className="btn-ghost"
            >
              Ir para a tela de {confirmacao.tipoEntrega === "retirada" ? "retirada" : "motoboy"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------- PDV --------------------------------------------------------------
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Produtos */}
      <section>
        <h1 className="mb-3 text-xl font-bold">Produtos</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {produtos.map((p) => (
            <div key={p.id} className="card flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{p.nome}</div>
                <div className="text-sm text-slate-500">{brl(p.preco)}</div>
              </div>
              <div className="flex items-center gap-2">
                {carrinho[p.id] ? (
                  <>
                    <button
                      onClick={() => remove(p.id)}
                      className="h-8 w-8 rounded-lg border border-slate-300 text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-semibold">
                      {carrinho[p.id]}
                    </span>
                  </>
                ) : null}
                <button
                  onClick={() => add(p.id)}
                  className="h-8 w-8 rounded-lg bg-brand text-lg leading-none text-white"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Carrinho + cliente */}
      <aside className="card h-fit p-4 lg:sticky lg:top-4">
        <h2 className="mb-3 text-lg font-bold">Carrinho</h2>
        {qtdItens === 0 ? (
          <p className="text-sm text-slate-500">Nenhum item adicionado.</p>
        ) : (
          <ul className="mb-3 space-y-1 text-sm">
            {produtos
              .filter((p) => carrinho[p.id])
              .map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {carrinho[p.id]}× {p.nome}
                  </span>
                  <span>{brl(carrinho[p.id] * p.preco)}</span>
                </li>
              ))}
          </ul>
        )}
        <div className="mb-4 flex justify-between border-t border-slate-200 pt-2 font-bold">
          <span>Total</span>
          <span>{brl(total)}</span>
        </div>

        <h3 className="mb-2 text-sm font-semibold text-slate-700">Cliente</h3>
        <div className="space-y-2">
          <input
            className="field"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="field"
            placeholder="WhatsApp (ex: 11999990000)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <input
            className="field"
            placeholder="CPF"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
          />
        </div>

        <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-700">
          Tipo de entrega
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(["retirada", "motoboy"] as TipoEntrega[]).map((t) => (
            <button
              key={t}
              onClick={() => setTipoEntrega(t)}
              className={`btn ${
                tipoEntrega === t
                  ? "bg-brand text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {t === "retirada" ? "🏬 Loja" : "🛵 Motoboy"}
            </button>
          ))}
        </div>

        {tipoEntrega === "motoboy" && (
          <select
            className="field mt-2"
            value={motoboyId}
            onChange={(e) => setMotoboyId(e.target.value)}
          >
            <option value="">Selecione o motoboy…</option>
            {motoboys.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        )}

        {erro && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <button
          className="btn-primary mt-4 w-full"
          disabled={loading}
          onClick={finalizar}
        >
          {loading ? "Finalizando…" : "Finalizar venda"}
        </button>
      </aside>
    </div>
  );
}
