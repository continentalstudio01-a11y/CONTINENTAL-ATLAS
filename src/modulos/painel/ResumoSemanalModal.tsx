import { useMemo } from 'react';
import { Calendar, Receipt, CheckSquare, TrendingUp, Copy, Check } from 'lucide-react';
import { Modal, Botao, Card, Chip, useAvisar } from '../../componentes/ui';
import { data, hoje, moeda, somarDias } from '../../lib/formato';
import type { Cobranca, Tarefa, Evento, Meta, Cliente } from '../../lib/tipos';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  cobrancas: Cobranca[];
  tarefas: Tarefa[];
  eventos: Evento[];
  clientes: Cliente[];
  meta?: Meta;
  faturamentoMes: number;
}

export function ResumoSemanalModal({
  aberto,
  aoFechar,
  cobrancas,
  tarefas,
  eventos,
  clientes,
  meta,
  faturamentoMes
}: Props) {
  const avisar = useAvisar();
  const hojeStr = hoje();
  const fimSemana = somarDias(hojeStr, 7);

  // Cobranças da semana (previstas)
  const cobsSemana = useMemo(() => {
    return cobrancas.filter(c => c.status === 'aberta' && c.vencimento >= hojeStr && c.vencimento <= fimSemana);
  }, [cobrancas, hojeStr, fimSemana]);

  const totalCobsSemana = cobsSemana.reduce((s, c) => s + c.valor, 0);

  // Cobranças atrasadas
  const atrasadas = useMemo(() => {
    return cobrancas.filter(c => c.status === 'atrasada');
  }, [cobrancas]);

  const totalAtrasadas = atrasadas.reduce((s, c) => s + c.valor, 0);

  // Tarefas da semana
  const tarefasSemana = useMemo(() => {
    return tarefas.filter(t => t.status === 'aberta' && (!t.prazo || t.prazo <= fimSemana));
  }, [tarefas, fimSemana]);

  // Eventos da semana
  const eventosSemana = useMemo(() => {
    return eventos.filter(e => {
      const d = e.inicio.slice(0, 10);
      return d >= hojeStr && d <= fimSemana && !e.excluido;
    });
  }, [eventos, hojeStr, fimSemana]);

  const gerarTextoWhatsApp = () => {
    let t = `*📋 RESUMO DA SEMANA — CONTINENTAL MKT*\n`;
    t += `_Período: ${data(hojeStr)} a ${data(fimSemana)}_\n\n`;

    t += `*💰 FINANCEIRO:*\n`;
    t += `• Previsto a receber esta semana: ${moeda(totalCobsSemana)} (${cobsSemana.length} cobranças)\n`;
    if (totalAtrasadas > 0) {
      t += `• ⚠️ Inadimplentes/Atrasadas: ${moeda(totalAtrasadas)} (${atrasadas.length} cobranças)\n`;
    }
    if (meta) {
      t += `• Faturamento no mês: ${moeda(faturamentoMes)} de ${moeda(meta.faturamento_alvo)}\n`;
    }

    t += `\n*📅 REUNIÕES E COMPROMISSOS (${eventosSemana.length}):*\n`;
    if (eventosSemana.length === 0) {
      t += `• Nenhum compromisso agendado.\n`;
    } else {
      eventosSemana.forEach(e => {
        const hora = e.dia_inteiro ? 'Dia inteiro' : e.inicio.slice(11, 16);
        t += `• ${data(e.inicio.slice(0, 10))} às ${hora} — ${e.titulo}\n`;
      });
    }

    t += `\n*✅ TAREFAS PRIORITÁRIAS (${tarefasSemana.length}):*\n`;
    if (tarefasSemana.length === 0) {
      t += `• Todas as tarefas em dia!\n`;
    } else {
      tarefasSemana.slice(0, 8).forEach(tar => {
        t += `• [ ] ${tar.titulo}${tar.prazo ? ` (prazo: ${data(tar.prazo)})` : ''}\n`;
      });
      if (tarefasSemana.length > 8) {
        t += `• ...e mais ${tarefasSemana.length - 8} tarefas cadastradas.\n`;
      }
    }

    t += `\n_Gerado pelo Continental Atlas em ${data(hojeStr)}_`;
    return t;
  };

  const copiarTexto = () => {
    const txt = gerarTextoWhatsApp();
    navigator.clipboard.writeText(txt);
    avisar('Resumo da semana copiado para a área de transferência!');
  };

  const abrirWhatsApp = () => {
    const txt = encodeURIComponent(gerarTextoWhatsApp());
    window.open(`https://wa.me/?text=${txt}`, '_blank');
  };

  return (
    <Modal
      titulo="📋 Resumo Executivo da Semana"
      aberto={aberto}
      aoFechar={aoFechar}
      rodape={
        <div className="linha" style={{ gap: 8 }}>
          <Botao onClick={copiarTexto} variante="secundario">
            <Copy size={15} /> Copiar Texto
          </Botao>
          <Botao onClick={abrirWhatsApp} variante="primario">
            Compartilhar no WhatsApp
          </Botao>
        </div>
      }
    >
      <div className="coluna" style={{ gap: 14 }}>
        <p className="pequeno secundario">
          Visão panorâmica para planejar os próximos 7 dias ({data(hojeStr)} até {data(fimSemana)}).
        </p>

        {/* Métricas da semana */}
        <div className="grade grade-3 igual">
          <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
            <div className="linha entre">
              <span className="pequeno secundario">Receitas da Semana</span>
              <Receipt size={16} className="destaque" />
            </div>
            <p className="num positivo" style={{ fontSize: 22, fontWeight: 300, marginTop: 4 }}>
              {moeda(totalCobsSemana)}
            </p>
            <span className="pequeno secundario">{cobsSemana.length} cobranças</span>
          </div>

          <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
            <div className="linha entre">
              <span className="pequeno secundario">Tarefas Pendentes</span>
              <CheckSquare size={16} className="atencao" />
            </div>
            <p className="num" style={{ fontSize: 22, fontWeight: 300, marginTop: 4 }}>
              {tarefasSemana.length}
            </p>
            <span className="pequeno secundario">Prioridade alta/média</span>
          </div>

          <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
            <div className="linha entre">
              <span className="pequeno secundario">Agenda / Reuniões</span>
              <Calendar size={16} className="destaque" />
            </div>
            <p className="num" style={{ fontSize: 22, fontWeight: 300, marginTop: 4 }}>
              {eventosSemana.length}
            </p>
            <span className="pequeno secundario">Nos próximos 7 dias</span>
          </div>
        </div>

        {/* Alerta de Inadimplência se houver */}
        {atrasadas.length > 0 && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: '#b4231815', border: '1px solid #b4231830' }}>
            <div className="linha entre">
              <span style={{ color: '#B42318', fontWeight: 600, fontSize: 13 }}>
                ⚠️ Atenção: {atrasadas.length} cobrança(s) atrasada(s) totalizando {moeda(totalAtrasadas)}
              </span>
              <Chip cor="erro">Inadimplência</Chip>
            </div>
          </div>
        )}

        {/* Lista de Reuniões */}
        <div>
          <span className="titulo-card" style={{ fontSize: 14 }}>Reuniões da Semana</span>
          <div className="lista" style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
            {eventosSemana.length === 0 ? (
              <p className="pequeno secundario">Nenhum compromisso marcado para esta semana.</p>
            ) : (
              eventosSemana.map(ev => (
                <div key={ev.id} className="item" style={{ cursor: 'default' }}>
                  <span className="pequeno num" style={{ width: 45 }}>{data(ev.inicio.slice(0, 10)).slice(0, 5)}</span>
                  <div className="cresce">
                    <span className="titulo">{ev.titulo}</span>
                    <span className="pequeno secundario">
                      {ev.dia_inteiro ? 'Dia inteiro' : ev.inicio.slice(11, 16)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lista de Tarefas */}
        <div>
          <span className="titulo-card" style={{ fontSize: 14 }}>Tarefas a Entregar</span>
          <div className="lista" style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
            {tarefasSemana.length === 0 ? (
              <p className="pequeno secundario">Todas as tarefas em dia!</p>
            ) : (
              tarefasSemana.slice(0, 6).map(t => (
                <div key={t.id} className="item" style={{ cursor: 'default' }}>
                  <div className="cresce">
                    <span className="titulo">{t.titulo}</span>
                    {t.prazo && <span className="pequeno secundario">Prazo: {data(t.prazo)}</span>}
                  </div>
                  <Chip cor={t.prioridade === 'alta' ? 'erro' : undefined}>{t.prioridade}</Chip>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
