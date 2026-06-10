"use client";

import { useState } from "react";
import {
  buscarPorCodigo,
  buscarPorCpfComAutorizacao,
  confirmarRetirada,
} from "@/app/actions/retirada";
import { brl } from "@/lib/format";
import type { VendaResumo } from "@/lib/types";

type Modo = "codigo" | "semCodigo";

export default function RetiradaPage() {
  const [modo, setModo] = useState<Modo>("codigo");
  const [codigo, setCodigo] = useState("");
  const [cpf, setCpf] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [responsavel, setResponsavel] = useState("");

  const [resumo, setResumo] = useState<VendaResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setResumo(null);
    setErro(null);
    setOkMsg(null);
    setCodigo("");
    setCpf("");
    setAutorizadoPor("");
    setMotivo("");
    setResponsavel("");
  }

  async function localizarPorCodigo() {
    setErro(null);
    setOkMsg(null);
    setLoading(true);
    const res = await buscarPorCodigo(codigo);
    setLoading(false);
    if (!res.ok) {
      setResumo(null);
      setErro(res.erro);
      return;
    }
    setResumo(res.data);
  }

  async function localizarPorCpf() {
    setErro(null);
    setOkMsg(null);
    setLoading(true);
    const res = await buscarPorCpfComAutorizacao({ cpf, autorizadoPor, motivo });
    setLoading(false);
    if (!res.ok) {
      setResumo(null);
      setErro(res.erro);
      return;
    }
    setResumo(res.data);
    setOkMsg("Liberação autorizada e registrada. Prossiga com a confirmação.");
  }

  async function confirmar() {
    if (!resumo) return;
    setErro(null);
    setLoading(true);
    const res = await confirmarRetirada({
      codigo: resumo.codigoRetirada,
      responsavel,
    });
    setLoading(false);
    if (!res.ok) {
      setErro(res.erro);
      return;
    }
    setOkMsg("✅ Retirada confirmada e registrada com sucesso!");
    setResumo({ ...resumo, situacaoEntrega: "concluida" });
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">Retirada na Loja</h1>
      <p className="mb-4 text-sm text-slate-500">
        Localize a venda pelo código e confirme a entrega dos itens.
      </p>

      {/* Alternância de modo */}
      <div className="mb-4 flex gap-2">
        <button
          className={`btn ${modo === "codigo" ? "bg-brand text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          onClick={() => {
            setModo("codigo");
            reset();
          }}
        >
          Tenho o código
        </button>
        <button
          className={`btn ${modo === "semCodigo" ? "bg-brand text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          onClick={() => {
            setModo("semCodigo");
            reset();
          }}
        >
          Não tenho o código
        </button>
      </div>

      {/* Formulário de busca */}
      <div className="card mb-4 p-4">
        {modo === "codigo" ? (
          <div className="flex gap-2">
            <input
              className="field font-mono uppercase"
              placeholder="Código de retirada"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
            <button className="btn-primary" disabled={loading} onClick={localizarPorCodigo}>
              Localizar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ⚠️ Liberação sem código exige autorização de um gerente. Nome e
              motivo ficam registrados em log de auditoria.
            </div>
            <input
              className="field"
              placeholder="CPF do cliente"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
            <input
              className="field"
              placeholder="Gerente que autoriza (nome/identificação)"
              value={autorizadoPor}
              onChange={(e) => setAutorizadoPor(e.target.value)}
            />
            <input
              className="field"
              placeholder="Motivo da liberação sem código"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <button className="btn-primary w-full" disabled={loading} onClick={localizarPorCpf}>
              {loading ? "Verificando…" : "Autorizar e localizar"}
            </button>
          </div>
        )}
      </div>

      {erro && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}
      {okMsg && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{okMsg}</p>
      )}

      {/* Resumo da venda */}
      {resumo && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-bold">{resumo.cliente}</div>
              <div className="text-sm text-slate-500">
                Código <span className="font-mono">{resumo.codigoRetirada}</span> · Total{" "}
                {brl(resumo.total)}
              </div>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                resumo.situacaoEntrega === "concluida"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {resumo.situacaoEntrega}
            </span>
          </div>

          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {resumo.itens.map((it) => (
              <li key={it.itemEntregaId} className="flex justify-between py-1.5">
                <span>
                  {it.quantidade}× {it.nomeProduto}
                </span>
                <span className="text-slate-500">{brl(it.precoUnitario * it.quantidade)}</span>
              </li>
            ))}
          </ul>

          {resumo.situacaoEntrega !== "concluida" && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <input
                className="field"
                placeholder="Responsável pela entrega (atendente)"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
              <button className="btn-primary w-full" disabled={loading} onClick={confirmar}>
                {loading ? "Confirmando…" : "Confirmar retirada"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
