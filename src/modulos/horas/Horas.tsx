import { useState, useMemo, useEffect } from 'react';
import { Clock, Play, Square, Plus, Trash2, Calendar, User, DollarSign } from 'lucide-react';
import { Botao, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useConfig, useLista } from '../../lib/hooks';
import { data, hoje, moeda } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente } from '../../lib/tipos';

export interface RegistroHora {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  descricao: string;
  data: string; // YYYY-MM-DD
  minutos: number;
  tipo: 'cronometro' | 'manual';
  criado_em: string;
}

const STORAGE_KEY = 'atlas_horas';
const STORAGE_CRONO = 'atlas_cronometro_inicio';
const STORAGE_CRONO_DESC = 'atlas_cronometro_desc';
const STORAGE_CRONO_CLI = 'atlas_cronometro_cli';

function carregar(): RegistroHora[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function salvarStorage(l: RegistroHora[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); }

function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Horas() {
  const [registros, setRegistros] = useState<RegistroHora[]>(carregar);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const cfg = useConfig();
  const avisar = useAvisar();

  const valorHora = cfg?.valor_hora || 50;

  // Estado do Cronômetro Global
  const [cronoAtivo, setCronoAtivo] = useState(() => !!localStorage.getItem(STORAGE_CRONO));
  const [tempoSegundos, setTempoSegundos] = useState(() => {
    const ini = localStorage.getItem(STORAGE_CRONO);
    if (!ini) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(ini).getTime()) / 1000));
  });
  const [cronoDesc, setCronoDesc] = useState(() => localStorage.getItem(STORAGE_CRONO_DESC) || '');
  const [cronoCli, setCronoCli] = useState(() => localStorage.getItem(STORAGE_CRONO_CLI) || '');

  // Modal Manual
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState({
    cliente_id: '',
    descricao: '',
    data: hoje(),
    horas: '1',
    minutos: '0',
  });

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMes, setFiltroMes] = useState(hoje().slice(0, 7));

  useEffect(() => {
    let timer: any = null;
    if (cronoAtivo) {
      timer = setInterval(() => {
        const ini = localStorage.getItem(STORAGE_CRONO);
        if (ini) {
          setTempoSegundos(Math.max(0, Math.floor((Date.now() - new Date(ini).getTime()) / 1000)));
        }
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [cronoAtivo]);

  const iniciarCronometro = () => {
    const agora = new Date().toISOString();
    localStorage.setItem(STORAGE_CRONO, agora);
    localStorage.setItem(STORAGE_CRONO_DESC, cronoDesc);
    localStorage.setItem(STORAGE_CRONO_CLI, cronoCli);
    setCronoAtivo(true);
    setTempoSegundos(0);
    avisar('Cronômetro iniciado!');
  };

  const pararCronometro = () => {
    const minutos = Math.max(1, Math.round(tempoSegundos / 60));
    const cli = clientes.find(c => c.id === cronoCli);
    const novo: RegistroHora = {
      id: novoId(),
      cliente_id: cronoCli || null,
      cliente_nome: cli?.nome || 'Geral / Agência',
      descricao: cronoDesc.trim() || 'Atividade geral',
      data: hoje(),
      minutos,
      tipo: 'cronometro',
      criado_em: new Date().toISOString(),
    };

    const atual = [novo, ...registros];
    setRegistros(atual);
    salvarStorage(atual);

    localStorage.removeItem(STORAGE_CRONO);
    localStorage.removeItem(STORAGE_CRONO_DESC);
    localStorage.removeItem(STORAGE_CRONO_CLI);
    setCronoAtivo(false);
    setTempoSegundos(0);
    setCronoDesc('');
    setCronoCli('');
    avisar(`Tempo salvo: ${minutos} minutos registrados!`);
  };

  const salvarManual = () => {
    const totalMin = (Number(form.horas) || 0) * 60 + (Number(form.minutos) || 0);
    if (totalMin <= 0) {
      avisar('Informe uma duração válida.');
      return;
    }
    const cli = clientes.find(c => c.id === form.cliente_id);
    const novo: RegistroHora = {
      id: novoId(),
      cliente_id: form.cliente_id || null,
      cliente_nome: cli?.nome || 'Geral / Agência',
      descricao: form.descricao.trim() || 'Trabalho realizado',
      data: form.data,
      minutos: totalMin,
      tipo: 'manual',
      criado_em: new Date().toISOString(),
    };

    const atual = [novo, ...registros];
    setRegistros(atual);
    salvarStorage(atual);
    setFormAberto(false);
    setForm({ cliente_id: '', descricao: '', data: hoje(), horas: '1', minutos: '0' });
    avisar('Registro de horas salvo!');
  };

  const excluir = (id: string) => {
    if (confirm('Excluir este apontamento de horas?')) {
      const atual = registros.filter(r => r.id !== id);
      setRegistros(atual);
      salvarStorage(atual);
      avisar('Apontamento removido.');
    }
  };

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      const matchCli = !filtroCliente || r.cliente_id === filtroCliente;
      const matchMes = !filtroMes || r.data.startsWith(filtroMes);
      return matchCli && matchMes;
    });
  }, [registros, filtroCliente, filtroMes]);

  const totalMinutos = registrosFiltrados.reduce((s, r) => s + r.minutos, 0);
  const totalHorasDec = totalMinutos / 60;
  const custoTotal = totalHorasDec * valorHora;

  return (
    <>
      <CabecalhoTela
        titulo="Horas Trabalhadas & Lucro"
        icone={<Clock size={28} strokeWidth={1.6} />}
        subtitulo="Controle de tempo dedicado por cliente e cálculo do custo real de hora"
        acoes={
          <Botao variante="primario" onClick={() => setFormAberto(true)}>
            <Plus size={16} /> Lançar Horas Manual
          </Botao>
        }
      />

      {/* CRONÔMETRO GLOBAL */}
      <div style={{ marginBottom: 18 }}>
        <Card titulo="⏱️ Cronômetro em Tempo Real (Continua mesmo se fechar o app)">
          <div className="grade grade-3 igual" style={{ alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <span className="num" style={{ fontSize: 38, fontWeight: 300, fontFamily: 'monospace' }}>
                {formatarTempo(tempoSegundos)}
              </span>
              <p className="pequeno secundario" style={{ marginTop: 4 }}>
                {cronoAtivo ? '🟢 Contando tempo...' : '⚪ Cronômetro parado'}
              </p>
            </div>
            <div className="coluna" style={{ gap: 8 }}>
              <select
                className="entrada"
                value={cronoCli}
                disabled={cronoAtivo}
                onChange={e => { setCronoCli(e.target.value); localStorage.setItem(STORAGE_CRONO_CLI, e.target.value); }}
              >
                <option value="">Cliente (opcional)</option>
                {clientes.filter(c => c.status === 'ativo').map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <input
                className="entrada"
                placeholder="O que está fazendo agora?"
                value={cronoDesc}
                disabled={cronoAtivo}
                onChange={e => { setCronoDesc(e.target.value); localStorage.setItem(STORAGE_CRONO_DESC, e.target.value); }}
              />
            </div>
            <div className="linha" style={{ justifyContent: 'center' }}>
              {!cronoAtivo ? (
                <Botao variante="primario" onClick={iniciarCronometro}>
                  <Play size={16} /> Iniciar Cronômetro
                </Botao>
              ) : (
                <Botao variante="perigo" onClick={pararCronometro}>
                  <Square size={16} /> Parar e Salvar Horas
                </Botao>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* RESUMO DE LUCRO E HORAS */}
      <div className="grade grade-3 igual" style={{ marginBottom: 18 }}>
        <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
          <span className="pequeno secundario">Total de Horas (Filtro)</span>
          <p className="num" style={{ fontSize: 26, fontWeight: 300, marginTop: 4 }}>
            {Math.floor(totalMinutos / 60)}h {totalMinutos % 60}m
          </p>
          <span className="pequeno secundario">{registrosFiltrados.length} lançamentos</span>
        </div>
        <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
          <span className="pequeno secundario">Seu Valor da Hora</span>
          <p className="num" style={{ fontSize: 26, fontWeight: 300, marginTop: 4 }}>
            {moeda(valorHora)}/h
          </p>
          <span className="pequeno secundario">Definido em Configurações</span>
        </div>
        <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
          <span className="pequeno secundario">Custo do Seu Tempo</span>
          <p className="num negativo" style={{ fontSize: 26, fontWeight: 300, marginTop: 4 }}>
            {moeda(custoTotal)}
          </p>
          <span className="pequeno secundario">Deduzido no lucro real do cliente</span>
        </div>
      </div>

      {/* FILTROS E LISTA */}
      <div className="linha" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="entrada" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ flex: 1, maxWidth: 260 }}>
          <option value="">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <input className="entrada" type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ width: 'auto' }} />
      </div>

      {registrosFiltrados.length === 0 ? (
        <Vazio texto="Nenhum registro de horas no período selecionado." />
      ) : (
        <Card>
          <div className="lista">
            {registrosFiltrados.map(r => (
              <div key={r.id} className="item" style={{ cursor: 'default' }}>
                <div className="cresce">
                  <div className="linha" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="titulo">{r.descricao}</span>
                    <Chip cor={r.tipo === 'cronometro' ? 'destaque' : undefined}>
                      {r.tipo === 'cronometro' ? 'Cronômetro' : 'Manual'}
                    </Chip>
                  </div>
                  <div className="pequeno secundario">
                    {r.cliente_nome} · {data(r.data)}
                  </div>
                </div>
                <div className="linha" style={{ gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span className="num" style={{ fontWeight: 600 }}>
                      {Math.floor(r.minutos / 60)}h {r.minutos % 60}m
                    </span>
                    <div className="pequeno secundario">{moeda((r.minutos / 60) * valorHora)}</div>
                  </div>
                  <button type="button" className="btn btn-fantasma btn-icone" title="Excluir" onClick={() => excluir(r.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL MANUAL */}
      <Modal titulo="Lançamento Manual de Horas" aberto={formAberto} aoFechar={() => setFormAberto(false)}
        rodape={<Botao variante="primario" onClick={salvarManual}>Salvar Horas</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente">
            <select className="entrada" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Geral / Interno</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Data">
            <input className="entrada" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Horas">
              <input className="entrada" type="number" min="0" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} />
            </Campo>
            <Campo rotulo="Minutos">
              <input className="entrada" type="number" min="0" max="59" step="5" value={form.minutos} onChange={e => setForm(f => ({ ...f, minutos: e.target.value }))} />
            </Campo>
          </div>
          <Campo rotulo="O que foi realizado">
            <textarea className="entrada" rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Criação de criativos, configuração de CAPI, reunião..." />
          </Campo>
        </div>
      </Modal>
    </>
  );
}
