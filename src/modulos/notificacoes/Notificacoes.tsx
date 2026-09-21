import { useState, useMemo } from "react";
import { Bell, CheckCheck, Trash2, Calendar, Receipt } from "lucide-react";
import { Botao, BotaoIcone, CabecalhoTela, Card, Chip, Vazio } from "../../componentes/ui";
import { Link } from "react-router-dom";
import { data, hoje } from "../../lib/formato";
import { useLista } from "../../lib/hooks";
import type { Cliente, Cobranca, Evento, Tarefa } from "../../lib/tipos";

interface Notificacao {
  id: string;
  tipo: "cobranca" | "tarefa" | "evento" | "lead" | "sistema" | "dominio" | "aniversario";
  titulo: string;
  corpo: string;
  link: string;
  lida: boolean;
  criada_em: string;
}

const STORAGE_KEY = "atlas_notificacoes";
function carregarNotifs(): Notificacao[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function salvarNotifs(l: Notificacao[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); }

const COR_TIPO: Record<Notificacao["tipo"], "erro" | "atencao" | "ok" | "destaque" | undefined> = {
  cobranca: "erro", tarefa: "atencao", evento: "destaque",
  lead: "ok", sistema: undefined, dominio: "atencao", aniversario: "ok",
};

export function Notificacoes() {
  const [notifs, setNotifs] = useState<Notificacao[]>(carregarNotifs);
  const [filtro, setFiltro] = useState<"todas" | "nao_lidas">("todas");
  const clientes = useLista<Cliente>("clientes") ?? [];
  const cobrancas = useLista<Cobranca>("cobrancas") ?? [];
  const tarefas = useLista<Tarefa>("tarefas") ?? [];
  const eventos = useLista<Evento>("eventos") ?? [];

  useMemo(() => {
    const existentes = new Set(notifs.map(n => n.id));
    const novas: Notificacao[] = [];
    const agora = new Date().toISOString();
    cobrancas.filter(c => c.status === "atrasada" && !c.excluido).forEach(c => {
      const id = `cobranca-atrasada-${c.id}`;
      if (!existentes.has(id)) {
        const cli = clientes.find(x => x.id === c.cliente_id);
        novas.push({ id, tipo: "cobranca", titulo: `Cobranca atrasada - ${cli?.nome ?? c.descricao}`, corpo: `Venceu em ${data(c.vencimento)}`, link: "/cobrancas", lida: false, criada_em: agora });
      }
    });
    tarefas.filter(t => t.status === "aberta" && t.prazo && t.prazo < hoje() && !t.excluido).forEach(t => {
      const id = `tarefa-vencida-${t.id}`;
      if (!existentes.has(id)) novas.push({ id, tipo: "tarefa", titulo: `Tarefa vencida: ${t.titulo}`, corpo: `Prazo era ${data(t.prazo!)}`, link: "/tarefas", lida: false, criada_em: agora });
    });
    eventos.filter(e => e.inicio.slice(0, 10) === hoje() && !e.excluido).forEach(e => {
      const id = `evento-hoje-${e.id}-${hoje()}`;
      if (!existentes.has(id)) novas.push({ id, tipo: "evento", titulo: `Hoje: ${e.titulo}`, corpo: e.dia_inteiro ? "Dia inteiro" : e.inicio.slice(11, 16), link: "/agenda", lida: false, criada_em: agora });
    });
    const mesDiaHoje = hoje().slice(5);
    clientes.filter(c => c.status === "ativo" && c.aniversario && !c.excluido).forEach(c => {
      const md = c.aniversario!.length >= 5 ? c.aniversario!.slice(-5) : "";
      if (md === mesDiaHoje) {
        const id = `aniversario-${c.id}-${hoje().slice(0, 7)}`;
        const tel = (c.whatsapp || c.telefone).replace(/\D/g, "");
        const link = tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(`Parabens, ${c.nome.split(" ")[0]}! A Continental MKT deseja um otimo aniversario!`)}` : `/clientes/${c.id}`;
        if (!existentes.has(id)) novas.push({ id, tipo: "aniversario", titulo: `Aniversario de ${c.nome}`, corpo: "Toque para enviar mensagem", link, lida: false, criada_em: agora });
      }
    });
    if (novas.length > 0) { const u = [...novas, ...notifs]; salvarNotifs(u); setNotifs(u); }
  }, [clientes.length, cobrancas.length, tarefas.length, eventos.length]);

  const lista = useMemo(() => {
    let l = [...notifs].sort((a, b) => b.criada_em.localeCompare(a.criada_em));
    if (filtro === "nao_lidas") l = l.filter(n => !n.lida);
    return l;
  }, [notifs, filtro]);

  const qtdNaoLidas = notifs.filter(n => !n.lida).length;
  const marcarLida = (id: string) => { const u = notifs.map(n => n.id === id ? { ...n, lida: true } : n); setNotifs(u); salvarNotifs(u); };
  const marcarTodasLidas = () => { const u = notifs.map(n => ({ ...n, lida: true })); setNotifs(u); salvarNotifs(u); };
  const excluir = (id: string) => { const u = notifs.filter(n => n.id !== id); setNotifs(u); salvarNotifs(u); };
  const limparLidas = () => { const u = notifs.filter(n => !n.lida); setNotifs(u); salvarNotifs(u); };

  return (
    <>
      <CabecalhoTela titulo="Central de Notificacoes" icone={<Bell size={28} strokeWidth={1.6} />}
        subtitulo={qtdNaoLidas > 0 ? `${qtdNaoLidas} nao lida${qtdNaoLidas !== 1 ? "s" : ""}` : "Tudo em dia!"}
        acoes={<div className="linha" style={{ gap: 8 }}>
          {qtdNaoLidas > 0 && <Botao onClick={marcarTodasLidas}><CheckCheck size={15} /> Todas lidas</Botao>}
          <Botao onClick={limparLidas} variante="fantasma"><Trash2 size={15} /> Limpar lidas</Botao>
        </div>}
      />
      <div className="abas vidro-pilula" style={{ marginBottom: 16, width: "fit-content" }}>
        <button type="button" className={`aba ${filtro === "todas" ? "ativa" : ""}`} onClick={() => setFiltro("todas")}>Todas ({notifs.length})</button>
        <button type="button" className={`aba ${filtro === "nao_lidas" ? "ativa" : ""}`} onClick={() => setFiltro("nao_lidas")}>Nao lidas ({qtdNaoLidas})</button>
      </div>
      {lista.length === 0 ? <Vazio texto="Nenhuma notificacao." /> : (
        <Card><div className="lista">{lista.map(n => {
          const isExterno = n.link.startsWith("http");
          const row = (
            <div className="item" style={{ cursor: "pointer", opacity: n.lida ? 0.6 : 1 }}>
              <div style={{ flex: "none" }}><Chip cor={COR_TIPO[n.tipo]}>{n.tipo === "cobranca" ? <Receipt size={14}/> : n.tipo === "evento" ? <Calendar size={14}/> : n.tipo === "tarefa" ? <CheckCheck size={14}/> : n.tipo === "aniversario" ? "🎂" : <Bell size={14}/>}</Chip></div>
              <div className="cresce">
                <div className="titulo" style={{ fontWeight: n.lida ? 400 : 600 }}>{n.titulo}</div>
                <div className="pequeno secundario">{n.corpo}</div>
                <div className="pequeno secundario" style={{ fontSize: 11 }}>{data(n.criada_em.slice(0, 10))}</div>
              </div>
              <div className="linha" style={{ gap: 4, flex: "none" }}>
                {!n.lida && <BotaoIcone rotulo="Lida" onClick={e => { e.preventDefault(); e.stopPropagation(); marcarLida(n.id); }}><CheckCheck size={13}/></BotaoIcone>}
                <BotaoIcone rotulo="Excluir" onClick={e => { e.preventDefault(); e.stopPropagation(); excluir(n.id); }}><Trash2 size={13}/></BotaoIcone>
              </div>
            </div>
          );
          return isExterno
            ? <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }} onClick={() => marcarLida(n.id)}>{row}</a>
            : <Link key={n.id} to={n.link} style={{ textDecoration: "none" }} onClick={() => marcarLida(n.id)}>{row}</Link>;
        })}</div></Card>
      )}
    </>
  );
}
