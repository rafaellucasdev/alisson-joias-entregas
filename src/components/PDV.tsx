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
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("retirada");
  const [motoboyId, setMotoboyId] = useState("");
  const [endereco, setEndereco] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [copiado, setCopiado] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? produtos.filter((p) => p.nome.toLowerCase().includes(q)) : produtos;
  }, [busca, produtos]);

  const total = useMemo(
    () => produtos.reduce((acc, p) => acc + (carrinho[p.id] ?? 0) * p.preco, 0),
    [carrinho, produtos],
  );
  const qtdItens = useMemo(
    () => Object.values(carrinho).reduce((a, b) => a + b, 0),
    [carrinho],
  );

  const add = (id: string) => setCarrinho((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const remove = (id: string) =>
    setCarrinho((c) => {
      const n = (c[id] ?? 0) - 1;
      const novo = { ...c };
      if (n <= 0) delete novo[id];
      else novo[id] = n;
      return novo;
    });

  async function finalizar() {
    setErro(null);
    if (qtdItens === 0) return setErro("Adicione ao menos um produto ao carrinho.");
    setLoading(true);
    const res = await finalizarVenda({
      cliente: { nome, whatsapp, cpf },
      itens: Object.entries(carrinho).map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
      tipoEntrega,
      motoboyId: tipoEntrega === "motoboy" ? motoboyId : null,
      endereco: tipoEntrega === "motoboy" ? endereco : null,
    });
    setLoading(false);
    if (!res.ok) return setErro(res.erro);
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
    setBusca("");
    setNome("");
    setWhatsapp("");
    setCpf("");
    setTipoEntrega("retirada");
    setMotoboyId("");
    setEndereco("");
    setConfirmacao(null);
    setErro(null);
    setCopiado(false);
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* ignore */
    }
  }

  // ----------------------------- Confirmação ------------------------------
  if (confirmacao) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card overflow-hidden">
          <div className="bg-slate-900 px-6 py-8 text-center text-white">
            <div className="mb-2 text-5xl">✅</div>
            <h1 className="text-xl font-bold">Venda finalizada!</h1>
            <p className="mt-1 text-sm text-slate-300">
              {brl(confirmacao.total)} ·{" "}
              {confirmacao.tipoEntrega === "retirada" ? "Retirada na loja" : "Entrega por motoboy"}
            </p>
          </div>

          <div className="p-6">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Código de retirada
              </div>
              <div className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-slate-900">
                {confirmacao.codigo}
              </div>
              <button
                onClick={() => copiar(confirmacao.codigo)}
                className="mt-2 text-sm font-semibold text-brand hover:underline"
              >
                {copiado ? "✓ Copiado!" : "Copiar código"}
              </button>
            </div>

            <div
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${
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
                href={confirmacao.tipoEntrega === "retirada" ? "/retirada" : "/motoboy"}
                className="btn-ghost"
              >
                Ir para {confirmacao.tipoEntrega === "retirada" ? "Retirada na Loja" : "Área do Motoboy"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------- PDV -----------------------------------
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ponto de Venda</h1>
        <p className="text-sm text-slate-500">Selecione as joias, identifique o cliente e finalize.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ------------------------- Produtos ------------------------- */}
        <section>
          <div className="relative mb-4">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" strokeLinecap="round" />
            </svg>
            <input
              className="field pl-11"
              placeholder="Buscar joia…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((p) => {
              const qtd = carrinho[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  className={`card flex flex-col justify-between p-4 transition hover:shadow-md ${
                    qtd ? "ring-2 ring-brand/40" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">💍</span>
                      {qtd > 0 && (
                        <span className="badge bg-brand/15 text-brand-dark">{qtd} no carrinho</span>
                      )}
                    </div>
                    <div className="mt-2 font-semibold leading-snug">{p.nome}</div>
                    <div className="mt-1 text-lg font-bold text-brand-dark">{brl(p.preco)}</div>
                  </div>

                  <div className="mt-3">
                    {qtd === 0 ? (
                      <button onClick={() => add(p.id)} className="btn-ghost w-full">
                        + Adicionar
                      </button>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-1">
                        <button onClick={() => remove(p.id)} className="h-8 w-8 rounded-md bg-slate-100 text-lg leading-none hover:bg-slate-200">−</button>
                        <span className="font-semibold">{qtd}</span>
                        <button onClick={() => add(p.id)} className="h-8 w-8 rounded-md bg-brand text-lg leading-none text-white hover:bg-brand-dark">+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtrados.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma joia encontrada para “{busca}”.</p>
            )}
          </div>
        </section>

        {/* --------------------- Carrinho / Checkout --------------------- */}
        <aside className="card h-fit p-5 lg:sticky lg:top-6">
          <h2 className="flex items-center justify-between text-lg font-bold">
            Carrinho
            <span className="badge bg-slate-100 text-slate-600">{qtdItens} {qtdItens === 1 ? "item" : "itens"}</span>
          </h2>

          {qtdItens === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nenhum item adicionado.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {produtos.filter((p) => carrinho[p.id]).map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate">{carrinho[p.id]}× {p.nome}</span>
                  <span className="shrink-0 text-slate-500">{brl(carrinho[p.id] * p.preco)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="my-4 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold">
            <span>Total</span>
            <span className="text-brand-dark">{brl(total)}</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="label">Cliente</span>
              <div className="space-y-2">
                <input className="field" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                <input className="field" placeholder="WhatsApp (ex: 11999990000)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                <input className="field" placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
            </div>

            <div>
              <span className="label">Tipo de entrega</span>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "retirada", t: "🏬 Retirar na loja" },
                  { v: "motoboy", t: "🛵 Motoboy" },
                ] as { v: TipoEntrega; t: string }[]).map(({ v, t }) => (
                  <button
                    key={v}
                    onClick={() => setTipoEntrega(v)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      tipoEntrega === v
                        ? "border-brand bg-brand/10 text-brand-dark"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tipoEntrega === "motoboy" && (
              <div className="space-y-2">
                <select className="field" value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)}>
                  <option value="">Selecione o motoboy…</option>
                  {motoboys.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                <textarea
                  className="field"
                  rows={2}
                  placeholder="Endereço de entrega (rua, nº, bairro, complemento)"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
            )}
          </div>

          {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          <button className="btn-accent mt-4 w-full py-3 text-base" disabled={loading} onClick={finalizar}>
            {loading ? "Finalizando…" : `Finalizar venda · ${brl(total)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
