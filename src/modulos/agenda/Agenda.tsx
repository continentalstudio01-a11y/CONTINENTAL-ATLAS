import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Abas, Botao, BotaoIcone, CabecalhoTela, Campo, Card, Marcador, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { salvar, excluir } from '../../lib/repo';
import { data, diaDaSemana, diaDe, diaNoMes, hoje, horaDe, mesDe, paraISO, somarDias, somarMeses, tituloMes } from '../../lib/formato';
import type { Cliente, Evento, TipoEvento } from '../../lib/tipos';

type Visao = 'mes' | 'semana' | 'lista';
export const TIPOS_EVENTO: { id: TipoEvento; rotulo: string }[] = [
  { id: 'reuniao', rotulo: 'Reunião' }, { id: 'prazo', rotulo: 'Prazo' }, { id: 'vencimento', rotulo: 'Vencimento' },
  { id: 'relatorio', rotulo: 'Relatório' }, { id: 'pessoal', rotulo: 'Pessoal' }, { id: 'conteudo', rotulo: 'Conteúdo' }
];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SEMANA_LONGA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export interface Ocorrencia { ev: Evento; dia: string }

// Expande eventos recorrentes (semanal e mensal) dentro do intervalo pedido.
export function ocorrencias(eventos: Evento[], de: string, ate: string): Ocorrencia[] {
  const saida: Ocorrencia[] = [];
  for (const ev of eventos) {
    const base = diaDe(ev.inicio);
    if (ev.recorrencia === 'nenhuma') { if (base >= de && base <= ate) saida.push({ ev, dia: base }); continue; }
    if (ev.recorrencia === 'semanal') {
      let d = base;
      if (d < de) d = somarDias(d, Math.ceil((Date.parse(de) - Date.parse(d)) / 86400000 / 7) * 7);
      for (; d <= ate; d = somarDias(d, 7)) if (d >= base && d >= de) saida.push({ ev, dia: d });
      continue;
    }
    const diaBase = Number(base.slice(8, 10));
    for (let m = mesDe(de); m <= mesDe(ate); m = somarMeses(m, 1)) {
      const d = diaNoMes(m, diaBase);
      if (d >= base && d >= de && d <= ate) saida.push({ ev, dia: d });
    }
  }
  return saida.sort((a, b) => (a.dia + (a.ev.dia_inteiro ? '0' : horaDe(a.ev.inicio))).localeCompare(b.dia + (b.ev.dia_inteiro ? '0' : horaDe(b.ev.inicio))));
}

export function Agenda() {
  const [params, setParams] = useSearchParams();
  const eventos = useLista<Evento>('eventos') ?? [];
  const clientes = useLista<Cliente>('clientes') ?? [];
  const [visao, setVisao] = useState<Visao>(() => (window.innerWidth < 760 ? 'lista' : 'mes'));
  const [mes, setMes] = useState(mesDe(hoje()));
  const [semana, setSemana] = useState(() => somarDias(hoje(), -diaDaSemana(hoje())));
  const [form, setForm] = useState<Partial<Evento> & { _dia?: string } | null>(null);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('novo')) { setForm({ _dia: hoje() }); params.delete('novo'); setParams(params, { replace: true }); }
  }, [params]);

  const inicioGrade = somarDias(`${mes}-01`, -diaDaSemana(`${mes}-01`));
  const fimGrade = somarDias(inicioGrade, 41);
  const intervalo = visao === 'mes' ? [inicioGrade, fimGrade] : visao === 'semana' ? [semana, somarDias(semana, 6)] : [hoje(), somarDias(hoje(), 60)];
  const ocs = useMemo(() => ocorrencias(eventos, intervalo[0], intervalo[1]), [eventos, intervalo[0], intervalo[1]]);
  const doDia = (d: string) => ocs.filter((o) => o.dia === d);
  const nomeCli = new Map(clientes.map((c) => [c.id, c.nome]));

  const titulo = visao === 'mes' ? tituloMes(mes) : visao === 'semana' ? `Semana de ${data(semana).slice(0, 5)} a ${data(somarDias(semana, 6)).slice(0, 5)}` : 'Próximos 60 Dias';
  const mover = (n: number) => (visao === 'mes' ? setMes(somarMeses(mes, n)) : setSemana(somarDias(semana, 7 * n)));
  const irHoje = () => { setMes(mesDe(hoje())); setSemana(somarDias(hoje(), -diaDaSemana(hoje()))); };

  const ListaDias = ({ dias }: { dias: string[] }) => (
    <div className="coluna" style={{ gap: 4 }}>
      {dias.map((d) => {
        const lista = doDia(d);
        if (visao === 'lista' && !lista.length) return null;
        return (
          <div key={d} style={{ padding: '10px 0', borderBottom: '1px solid var(--linha)' }}>
            <div className="linha entre">
              <span className="subtitulo" style={{ color: d === hoje() ? 'var(--destaque)' : undefined }}>{SEMANA_LONGA[diaDaSemana(d)]}, {data(d).slice(0, 5)}</span>
              {visao === 'semana' && <Botao variante="fantasma" onClick={() => setForm({ _dia: d })}>Adicionar</Botao>}
            </div>
            {lista.map((o) => <LinhaEvento key={o.ev.id + o.dia} o={o} cliente={o.ev.cliente_id ? nomeCli.get(o.ev.cliente_id) : undefined} aoAbrir={() => setForm(o.ev)} />)}
          </div>
        );
      })}
    </div>
  );

  const [modalGoogle, setModalGoogle] = useState(false);
  const avisar = useAvisar();

  const exportarICS = () => {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Continental MKT//Continental Atlas//PT\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n';
    eventos.forEach(ev => {
      const dtStart = ev.inicio.replace(/[-:]/g, '').slice(0, 15) + 'Z';
      const dtEnd = (ev.fim || ev.inicio).replace(/[-:]/g, '').slice(0, 15) + 'Z';
      ics += `BEGIN:VEVENT\nUID:${ev.id}@continentalatlas\nDTSTAMP:${dtStart}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:${ev.titulo}\nDESCRIPTION:${ev.descricao || ''}\nLOCATION:${ev.local_link || ''}\nSTATUS:CONFIRMED\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agenda_continental_atlas_${hoje()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    avisar('Agenda exportada! Abra o arquivo para adicionar ao Google Agenda.');
  };

  return (
    <>
      <CabecalhoTela titulo="Agenda" icone={<CalendarDays size={28} strokeWidth={1.6} />}
        acoes={<>
          <Botao onClick={() => setModalGoogle(true)}>Google Agenda</Botao>
          <Botao onClick={() => window.open('/agendar', '_blank')}>Link de Agendamento</Botao>
          <Abas<Visao> abas={[{ id: 'mes', rotulo: 'Mês' }, { id: 'semana', rotulo: 'Semana' }, { id: 'lista', rotulo: 'Lista' }]} ativa={visao} aoMudar={setVisao} />
          <Botao variante="primario" onClick={() => setForm({ _dia: hoje() })}>Novo evento</Botao>
        </>} />
      <Card>
        <div className="linha entre" style={{ marginBottom: 16 }}>
          <h2 className="titulo-card">{titulo}</h2>
          {visao !== 'lista' && (
            <div className="linha" style={{ gap: 4 }}>
              <BotaoIcone rotulo="Anterior" onClick={() => mover(-1)}><ChevronLeft size={20} /></BotaoIcone>
              <Botao variante="fantasma" onClick={irHoje}>Hoje</Botao>
              <BotaoIcone rotulo="Próximo" onClick={() => mover(1)}><ChevronRight size={20} /></BotaoIcone>
            </div>
          )}
        </div>
        {visao === 'mes' && (
          <>
            <div className="cal-cab">{SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="cal-grade">
              {Array.from({ length: 42 }, (_, i) => somarDias(inicioGrade, i)).map((d) => {
                const lista = doDia(d);
                return (
                  <button key={d} className={`cal-dia ${mesDe(d) !== mes ? 'fora' : ''} ${d === hoje() ? 'hoje' : ''}`} onClick={() => setDiaAberto(d)}>
                    <span className="n">{Number(d.slice(8))}</span>
                    {lista.slice(0, 3).map((o) => <span key={o.ev.id + d} className={`cal-ev cor-${o.ev.tipo}`}>{o.ev.dia_inteiro ? '' : `${horaDe(o.ev.inicio)} `}{o.ev.titulo}</span>)}
                    {lista.length > 3 && <span className="pequeno secundario">+{lista.length - 3}</span>}
                  </button>
                );
              })}
            </div>
            <div className="linha pequeno secundario" style={{ marginTop: 14, gap: 14 }}>
              {TIPOS_EVENTO.map((t) => <span key={t.id} className="linha" style={{ gap: 6 }}><i className={`ponto cor-${t.id}`} />{t.rotulo}</span>)}
            </div>
          </>
        )}
        {visao === 'semana' && <ListaDias dias={Array.from({ length: 7 }, (_, i) => somarDias(semana, i))} />}
        {visao === 'lista' && (ocs.length ? <ListaDias dias={Array.from(new Set(ocs.map((o) => o.dia)))} /> : <Vazio texto="Nada marcado para os próximos 60 dias." acao={<Botao onClick={() => setForm({ _dia: hoje() })}>Novo evento</Botao>} />)}
      </Card>

      <Modal titulo={diaAberto ? `${SEMANA_LONGA[diaDaSemana(diaAberto)]}, ${data(diaAberto)}` : ''} aberto={!!diaAberto} aoFechar={() => setDiaAberto(null)}
        rodape={<Botao variante="primario" onClick={() => { setForm({ _dia: diaAberto! }); setDiaAberto(null); }}>Novo evento neste dia</Botao>}>
        {diaAberto && (doDia(diaAberto).length
          ? <div className="lista">{doDia(diaAberto).map((o) => <LinhaEvento key={o.ev.id} o={o} cliente={o.ev.cliente_id ? nomeCli.get(o.ev.cliente_id) : undefined} aoAbrir={() => { setForm(o.ev); setDiaAberto(null); }} />)}</div>
          : <p className="secundario">Nada marcado neste dia.</p>)}
      </Modal>

      {/* Modal Google Agenda */}
      <Modal titulo="Google Agenda & Sincronização" aberto={modalGoogle} aoFechar={() => setModalGoogle(false)}
        rodape={<Botao onClick={() => setModalGoogle(false)}>Fechar</Botao>}>
        <div className="coluna" style={{ gap: 16 }}>
          <div className="vidro-painel" style={{ padding: '16px', borderRadius: 16 }}>
            <p className="titulo" style={{ fontSize: 16, marginBottom: 4 }}>1. Exportação Direta (.ics)</p>
            <p className="pequeno secundario" style={{ marginBottom: 12 }}>
              Baixe todos os seus compromissos, reuniões e vencimentos do Atlas em arquivo universal .ics. Ao abrir no celular ou no computador, eles entram direto no seu Google Agenda ou Apple Calendar.
            </p>
            <Botao variante="primario" onClick={exportarICS}>Baixar Arquivo .ics da Agenda</Botao>
          </div>

          <div className="vidro-painel" style={{ padding: '16px', borderRadius: 16 }}>
            <p className="titulo" style={{ fontSize: 16, marginBottom: 4 }}>2. Link Público de Agendamento</p>
            <p className="pequeno secundario" style={{ marginBottom: 12 }}>
              Envie para clientes ou leads marcarem reuniões diretamente com você nos seus horários livres:
            </p>
            <div className="linha" style={{ gap: 8 }}>
              <input className="entrada pequeno" readOnly value={`${window.location.origin}/agendar`} style={{ flex: 1, fontFamily: 'monospace' }} />
              <Botao onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/agendar`); avisar('Link copiado!'); }}>Copiar</Botao>
              <Botao onClick={() => window.open('/agendar', '_blank')}>Abrir</Botao>
            </div>
          </div>

          <div className="vidro-painel" style={{ padding: '16px', borderRadius: 16 }}>
            <p className="titulo" style={{ fontSize: 16, marginBottom: 4 }}>3. Sincronização Automática com a Google Calendar API</p>
            <p className="pequeno secundario">
              Para sincronização automática bidirecional em tempo real de madrugada sem precisar baixar arquivos, ative a <strong>Google Calendar API</strong> no seu projeto do <strong>Google Cloud Console</strong> e insira o Client ID em <em>Configurações</em>.
            </p>
          </div>
        </div>
      </Modal>

      <FormEvento inicial={form} aoFechar={() => setForm(null)} clientes={clientes} />
    </>
  );
}

export function LinhaEvento({ o, cliente, aoAbrir }: { o: Ocorrencia; cliente?: string; aoAbrir?: () => void }) {
  return (
    <button className="item" onClick={aoAbrir}>
      <span className={`ponto cor-${o.ev.tipo}`} />
      <span className="num secundario pequeno" style={{ width: 58, flex: 'none' }}>{o.ev.dia_inteiro ? 'Dia todo' : horaDe(o.ev.inicio)}</span>
      <div className="cresce">
        <div className="titulo">{o.ev.titulo}</div>
        {(cliente || o.ev.local_link) && <div className="pequeno secundario">{[cliente, o.ev.local_link].filter(Boolean).join(', ')}</div>}
      </div>
    </button>
  );
}

const LEMBRETES = [{ v: -1, r: 'Sem lembrete' }, { v: 15, r: '15 minutos antes' }, { v: 60, r: '1 hora antes' }, { v: 1440, r: '1 dia antes' }];

export function FormEvento({ inicial, aoFechar, clientes }: { inicial: (Partial<Evento> & { _dia?: string }) | null; aoFechar: () => void; clientes: Cliente[] }) {
  const avisar = useAvisar();
  const [e, setE] = useState<Partial<Evento>>({});
  const [dia, setDia] = useState(hoje());
  const [hIni, setHIni] = useState('09:00');
  const [hFim, setHFim] = useState('10:00');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!inicial) return;
    setErro(null);
    if (inicial.id) {
      setE(inicial);
      setDia(diaDe(inicial.inicio!));
      setHIni(horaDe(inicial.inicio!));
      setHFim(inicial.fim ? horaDe(inicial.fim) : horaDe(inicial.inicio!));
    } else {
      setE({ titulo: '', tipo: 'reuniao', dia_inteiro: false, local_link: '', descricao: '', cliente_id: null, recorrencia: 'nenhuma', lembretes: [60] });
      setDia(inicial._dia ?? hoje());
      setHIni('09:00'); setHFim('10:00');
    }
  }, [inicial]);

  if (!inicial) return null;
  const auto = !!e.automatico;
  const set = <K extends keyof Evento>(k: K, v: Evento[K]) => setE((p) => ({ ...p, [k]: v }));

  const gravar = async () => {
    if (!e.titulo?.trim()) { setErro('Dê um título ao evento.'); return; }
    if (!e.dia_inteiro && hFim < hIni) { setErro('O horário de fim precisa ser depois do início.'); return; }
    await salvar<Evento>('eventos', {
      lead_id: null, automatico: false, origem_tabela: null, origem_id: null, google_event_id: null,
      ...e, titulo: e.titulo.trim(), inicio: paraISO(dia, e.dia_inteiro ? '09:00' : hIni),
      ...(e.dia_inteiro ? { fim: null } : { fim: paraISO(dia, hFim) }), sync_pendente: true
    } as Partial<Evento>);
    avisar(e.id ? 'Evento atualizado' : 'Evento criado');
    aoFechar();
  };
  const apagar = async () => {
    if (!e.id || !window.confirm('Excluir este evento?')) return;
    await excluir('eventos', e.id);
    avisar('Evento excluído');
    aoFechar();
  };

  return (
    <Modal titulo={e.id ? 'Editar Evento' : 'Novo Evento'} aberto={!!inicial} aoFechar={aoFechar}
      rodape={<>
        {e.id && !auto && <Botao variante="perigo" onClick={apagar}>Excluir</Botao>}
        <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" onClick={gravar}>{e.id ? 'Salvar alterações' : 'Criar evento'}</Botao>
      </>}>
      {auto && <p className="faixa" style={{ marginBottom: 14 }}>Evento criado automaticamente pelo Atlas. Ele se atualiza sozinho quando a origem muda; aqui você só ajusta o lembrete.</p>}
      <div className="grade-form">
        <Campo rotulo="Título" inteiro erro={erro}><input className="entrada" value={e.titulo ?? ''} onChange={(x) => set('titulo', x.target.value)} disabled={auto} autoFocus={!e.id} /></Campo>
        <Campo rotulo="Tipo">
          <select className="entrada" value={e.tipo} onChange={(x) => set('tipo', x.target.value as TipoEvento)} disabled={auto}>
            {TIPOS_EVENTO.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Data"><input className="entrada" type="date" value={dia} onChange={(x) => setDia(x.target.value)} disabled={auto} /></Campo>
        <div className="inteiro"><Marcador rotulo="Dia inteiro" marcado={!!e.dia_inteiro} aoMudar={(v) => !auto && set('dia_inteiro', v)} /></div>
        {!e.dia_inteiro && <>
          <Campo rotulo="Início"><input className="entrada" type="time" value={hIni} onChange={(x) => setHIni(x.target.value)} disabled={auto} /></Campo>
          <Campo rotulo="Fim"><input className="entrada" type="time" value={hFim} onChange={(x) => setHFim(x.target.value)} disabled={auto} /></Campo>
        </>}
        <Campo rotulo="Cliente">
          <select className="entrada" value={e.cliente_id ?? ''} onChange={(x) => set('cliente_id', x.target.value || null)} disabled={auto}>
            <option value="">Nenhum</option>
            {clientes.filter((c) => c.status !== 'encerrado' || c.id === e.cliente_id).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Repetir">
          <select className="entrada" value={e.recorrencia} onChange={(x) => set('recorrencia', x.target.value as Evento['recorrencia'])} disabled={auto}>
            <option value="nenhuma">Não repetir</option><option value="semanal">Toda semana</option><option value="mensal">Todo mês</option>
          </select>
        </Campo>
        <Campo rotulo="Local ou link da reunião" inteiro><input className="entrada" value={e.local_link ?? ''} onChange={(x) => set('local_link', x.target.value)} disabled={auto} /></Campo>
        <Campo rotulo="Lembrete">
          <select className="entrada" value={e.lembretes?.[0] ?? -1} onChange={(x) => set('lembretes', Number(x.target.value) < 0 ? [] : [Number(x.target.value)])}>
            {LEMBRETES.map((l) => <option key={l.v} value={l.v}>{l.r}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Observações" inteiro><textarea className="entrada" value={e.descricao ?? ''} onChange={(x) => set('descricao', x.target.value)} disabled={auto} /></Campo>
      </div>
    </Modal>
  );
}
