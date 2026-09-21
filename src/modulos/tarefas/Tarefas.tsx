import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListChecks, Plus } from 'lucide-react';
import { Abas, Botao, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, AssistenteTexto, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { excluir, salvar } from '../../lib/repo';
import { hoje, somarDias } from '../../lib/formato';
import { ItemTarefa } from './componentes';
import type { Cliente, Servico, Tarefa, TarefaModelo } from '../../lib/tipos';

type Aba = 'hoje' | 'semana' | 'cliente' | 'concluidas' | 'modelos';

export function Tarefas() {
  const [params, setParams] = useSearchParams();
  const tarefas = useLista<Tarefa>('tarefas') ?? [];
  const clientes = useLista<Cliente>('clientes') ?? [];
  const [aba, setAba] = useState<Aba>('hoje');
  const [form, setForm] = useState<Partial<Tarefa> | null>(null);
  const porId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  useEffect(() => {
    if (params.get('novo')) { setForm({}); params.delete('novo'); setParams(params, { replace: true }); }
  }, [params]);

  const abertas = tarefas.filter((t) => t.status === 'aberta');
  const ordenar = (l: Tarefa[]) => [...l].sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') || Number(b.prioridade === 'alta') - Number(a.prioridade === 'alta') || (a.ordem ?? 0) - (b.ordem ?? 0));
  const listaHoje = ordenar(abertas.filter((t) => !t.prazo || t.prazo <= hoje()));
  const listaSemana = ordenar(abertas.filter((t) => t.prazo && t.prazo > hoje() && t.prazo <= somarDias(hoje(), 7)));
  const concluidas = tarefas.filter((t) => t.status === 'concluida').sort((a, b) => (b.concluida_em ?? '').localeCompare(a.concluida_em ?? '')).slice(0, 100);
  const atrasadas = abertas.filter((t) => t.prazo && t.prazo < hoje()).length;

  const render = (l: Tarefa[], vazio: string) => l.length
    ? <div className="lista">{l.map((t) => <ItemTarefa key={t.id} t={t} cliente={t.cliente_id ? porId.get(t.cliente_id) : undefined} aoAbrir={() => setForm(t)} />)}</div>
    : <Vazio texto={vazio} />;

  const grupos = useMemo(() => {
    const m = new Map<string, Tarefa[]>();
    for (const t of abertas) { const k = t.cliente_id ?? ''; m.set(k, [...(m.get(k) ?? []), t]); }
    return Array.from(m.entries()).sort(([a], [b]) => (porId.get(a)?.nome ?? 'zzz').localeCompare(porId.get(b)?.nome ?? 'zzz'));
  }, [abertas, porId]);

  return (
    <>
      <CabecalhoTela titulo="Tarefas" icone={<ListChecks size={28} strokeWidth={1.6} />}
        subtitulo={`${abertas.length} em aberto${atrasadas ? `, ${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}` : ''}`}
        acoes={<Botao variante="primario" onClick={() => setForm({})}>Nova tarefa</Botao>} />
      <div style={{ marginBottom: 16 }}>
        <Abas<Aba> abas={[{ id: 'hoje', rotulo: 'Hoje' }, { id: 'semana', rotulo: 'Próximos 7 Dias' }, { id: 'cliente', rotulo: 'Por Cliente' }, { id: 'concluidas', rotulo: 'Concluídas' }, { id: 'modelos', rotulo: 'Modelos' }]} ativa={aba} aoMudar={setAba} />
      </div>
      {aba === 'hoje' && <Card>{render(listaHoje, 'Nada para hoje. Aproveite.')}</Card>}
      {aba === 'semana' && <Card>{render(listaSemana, 'Nenhuma tarefa com prazo nos próximos 7 dias.')}</Card>}
      {aba === 'concluidas' && <Card>{render(concluidas, 'Nenhuma tarefa concluída ainda.')}</Card>}
      {aba === 'cliente' && (
        <div className="coluna" style={{ gap: 18 }}>
          {!grupos.length && <Card><Vazio texto="Nenhuma tarefa em aberto." /></Card>}
          {grupos.map(([id, lista]) => <Card key={id || 'sem'} titulo={porId.get(id)?.nome ?? 'Sem Cliente'}>{render(ordenar(lista), '')}</Card>)}
        </div>
      )}
      {aba === 'modelos' && <Modelos />}
      <FormTarefa inicial={form} aoFechar={() => setForm(null)} clientes={clientes} />
    </>
  );
}

function FormTarefa({ inicial, aoFechar, clientes }: { inicial: Partial<Tarefa> | null; aoFechar: () => void; clientes: Cliente[] }) {
  const avisar = useAvisar();
  const [t, setT] = useState<Partial<Tarefa>>({});
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (inicial) { setErro(null); setT(inicial.id ? inicial : { titulo: '', descricao: '', prazo: hoje(), prioridade: 'media', cliente_id: null }); }
  }, [inicial]);
  if (!inicial) return null;
  const set = <K extends keyof Tarefa>(k: K, v: Tarefa[K]) => setT((p) => ({ ...p, [k]: v }));
  const gravar = async () => {
    if (!t.titulo?.trim()) { setErro('Escreva o que precisa ser feito.'); return; }
    await salvar<Tarefa>('tarefas', {
      status: 'aberta', origem: 'avulsa', modelo_id: null, referencia: null, ordem: 0, concluida_em: null, ...t, titulo: t.titulo.trim()
    } as Partial<Tarefa>);
    avisar(t.id ? 'Tarefa atualizada' : 'Tarefa criada');
    aoFechar();
  };
  const apagar = async () => { if (t.id && window.confirm('Excluir esta tarefa?')) { await excluir('tarefas', t.id); aoFechar(); } };
  return (
    <Modal titulo={t.id ? 'Editar Tarefa' : 'Nova Tarefa'} aberto={!!inicial} aoFechar={aoFechar}
      rodape={<>
        {t.id && <Botao variante="perigo" onClick={apagar}>Excluir</Botao>}
        <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" onClick={gravar}>{t.id ? 'Salvar alterações' : 'Criar tarefa'}</Botao>
      </>}>
      <div className="grade-form">
        <Campo rotulo="O que precisa ser feito" inteiro erro={erro} acao={<AssistenteTexto valor={t.titulo ?? ''} aoCorrigir={v => set('titulo', v)} tipo="simples" />}>
          <input className="entrada" value={t.titulo ?? ''} onChange={(e) => set('titulo', e.target.value)} autoFocus={!t.id} placeholder="Ex: Ajustar criativos do Meta Ads..." />
        </Campo>
        <Campo rotulo="Prazo"><input className="entrada" type="date" value={t.prazo ?? ''} onChange={(e) => set('prazo', e.target.value || null)} /></Campo>
        <Campo rotulo="Prioridade">
          <select className="entrada" value={t.prioridade} onChange={(e) => set('prioridade', e.target.value as Tarefa['prioridade'])}>
            <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
          </select>
        </Campo>
        <Campo rotulo="Cliente" inteiro>
          <select className="entrada" value={t.cliente_id ?? ''} onChange={(e) => set('cliente_id', e.target.value || null)}>
            <option value="">Nenhum</option>
            {clientes.filter((c) => c.status !== 'encerrado' || c.id === t.cliente_id).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Detalhes" inteiro acao={<AssistenteTexto valor={t.descricao ?? ''} aoCorrigir={v => set('descricao', v)} />}>
          <textarea className="entrada" value={t.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} placeholder="Instruções, links ou notas de execução..." />
        </Campo>
      </div>
    </Modal>
  );
}

function Modelos() {
  const modelos = useLista<TarefaModelo>('tarefa_modelos') ?? [];
  const servicos = useLista<Servico>('servicos') ?? [];
  const [form, setForm] = useState<Partial<TarefaModelo> | null>(null);
  const [itens, setItens] = useState('');
  const avisar = useAvisar();
  const nomeServ = new Map(servicos.map((s) => [s.id, s.nome]));
  const abrir = (m: Partial<TarefaModelo>) => { setForm(m); setItens((m.itens ?? []).join('\n')); };
  const gravar = async () => {
    if (!form?.nome?.trim()) return;
    await salvar<TarefaModelo>('tarefa_modelos', { tipo: 'checklist', servico_id: null, dia_do_mes: 1, ...form, nome: form.nome.trim(), itens: itens.split('\n').map((s) => s.trim()).filter(Boolean) });
    avisar('Modelo salvo');
    setForm(null);
  };
  const grupos: [TarefaModelo['tipo'], string, string][] = [
    ['checklist', 'Checklists de Cliente Novo', 'Aplicados automaticamente quando você cadastra um serviço para um cliente.'],
    ['recorrente', 'Tarefas Mensais', 'Criadas todo mês para cada cliente ativo com o serviço, no dia escolhido.']
  ];
  return (
    <div className="coluna" style={{ gap: 18 }}>
      {grupos.map(([tipo, titulo, texto]) => (
        <Card key={tipo} titulo={titulo} acao={<Botao icone={<Plus size={16} />} onClick={() => abrir({ tipo, itens: [] })}>Novo modelo</Botao>}>
          <p className="secundario pequeno" style={{ marginBottom: 8 }}>{texto}</p>
          <div className="lista">
            {modelos.filter((m) => m.tipo === tipo).map((m) => (
              <button key={m.id} className="item" onClick={() => abrir(m)}>
                <div className="cresce">
                  <div className="titulo">{m.nome}</div>
                  <div className="pequeno secundario">{m.itens.length} {m.itens.length === 1 ? 'item' : 'itens'}{m.tipo === 'recorrente' ? `, todo dia ${m.dia_do_mes}` : ''}</div>
                </div>
                {m.servico_id && <Chip>{nomeServ.get(m.servico_id)}</Chip>}
              </button>
            ))}
          </div>
        </Card>
      ))}
      <Modal titulo={form?.id ? 'Editar Modelo' : 'Novo Modelo'} aberto={!!form} aoFechar={() => setForm(null)}
        rodape={<>
          {form?.id && <Botao variante="perigo" onClick={async () => { if (window.confirm('Excluir este modelo?')) { await excluir('tarefa_modelos', form.id!); setForm(null); } }}>Excluir</Botao>}
          <Botao variante="fantasma" onClick={() => setForm(null)}>Cancelar</Botao>
          <Botao variante="primario" onClick={gravar}>Salvar modelo</Botao>
        </>}>
        {form && (
          <div className="grade-form">
            <Campo rotulo="Nome do modelo" inteiro><input className="entrada" value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Campo>
            <Campo rotulo="Serviço">
              <select className="entrada" value={form.servico_id ?? ''} onChange={(e) => setForm({ ...form, servico_id: e.target.value || null })}>
                <option value="">Escolha o serviço</option>{servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </Campo>
            {form.tipo === 'recorrente' && <Campo rotulo="Dia do mês"><input className="entrada" type="number" min="1" max="28" value={form.dia_do_mes ?? 1} onChange={(e) => setForm({ ...form, dia_do_mes: Number(e.target.value) })} /></Campo>}
            <Campo rotulo="Itens (um por linha)" inteiro><textarea className="entrada" rows={7} value={itens} onChange={(e) => setItens(e.target.value)} /></Campo>
          </div>
        )}
      </Modal>
    </div>
  );
}
