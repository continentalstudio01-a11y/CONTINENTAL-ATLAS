import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, ChevronLeft, ChevronRight, Download, Tags, Trash2 } from 'lucide-react';
import { Abas, Barra, Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Marcador, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useConfig, useLista } from '../../lib/hooks';
import { excluir, salvar } from '../../lib/repo';
import { data, hoje, mesDe, moeda, numero, somarMeses, tituloMes, nomeMes } from '../../lib/formato';
import { exportarLista } from '../../lib/planilhas';
import { aposSalvarLancamento } from '../../lib/automacoes';
import type { Carteira, Categoria, Cliente, Cobranca, Lancamento } from '../../lib/tipos';

const soma = (l: Lancamento[]) => l.reduce((s, x) => s + Number(x.valor), 0);

export function Financeiro() {
  const [params, setParams] = useSearchParams();
  const cfg = useConfig();
  const lancs = useLista<Lancamento>('lancamentos') ?? [];
  const cats = useLista<Categoria>('categorias') ?? [];
  const clientes = useLista<Cliente>('clientes') ?? [];
  const cobrancas = useLista<Cobranca>('cobrancas', (c) => c.status === 'aberta' || c.status === 'atrasada') ?? [];
  const [carteira, setCarteira] = useState<Carteira>('negocio');
  const [mes, setMes] = useState(mesDe(hoje()));
  const [filtroCat, setFiltroCat] = useState('');
  const [form, setForm] = useState<Partial<Lancamento> | null>(null);
  const [verCats, setVerCats] = useState(false);

  useEffect(() => {
    if (params.get('novo')) { setForm({}); params.delete('novo'); setParams(params, { replace: true }); }
  }, [params]);

  const catPorId = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const nomeCli = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const ehVerba = (l: Lancamento) => catPorId.get(l.categoria_id ?? '')?.especial === 'verba_adiantada';
  const daCarteira = lancs.filter((l) => l.carteira === carteira);
  const doMes = daCarteira.filter((l) => mesDe(l.data) === mes);
  const pagos = doMes.filter((l) => l.status === 'pago');
  const entradas = soma(pagos.filter((l) => l.tipo === 'entrada'));
  const saidas = soma(pagos.filter((l) => l.tipo === 'saida' && !ehVerba(l)));
  const previsto = soma(doMes.filter((l) => l.status === 'previsto' && l.tipo === 'saida'));
  const aReceber = cobrancas.reduce((s, c) => s + c.valor, 0);

  const meses = Array.from({ length: 12 }, (_, i) => somarMeses(mes, i - 11));
  const serie = meses.map((m) => {
    const l = daCarteira.filter((x) => mesDe(x.data) === m && x.status === 'pago');
    return { m, e: soma(l.filter((x) => x.tipo === 'entrada')), s: soma(l.filter((x) => x.tipo === 'saida' && !ehVerba(x))) };
  });
  const max = Math.max(1, ...serie.flatMap((x) => [x.e, x.s]));
  const ano = mes.slice(0, 4);
  const faturamentoAno = soma(lancs.filter((l) => l.carteira === 'negocio' && l.tipo === 'entrada' && l.status === 'pago' && l.data.startsWith(ano)));

  const lista = doMes.filter((l) => !filtroCat || l.categoria_id === filtroCat).sort((a, b) => b.data.localeCompare(a.data));
  const exportar = () => exportarLista(`financeiro-${carteira}-${mes}`, lista.map((l) => ({
    Data: data(l.data), Descrição: l.descricao, Tipo: l.tipo === 'entrada' ? 'Entrada' : 'Saída', Categoria: catPorId.get(l.categoria_id ?? '')?.nome ?? '',
    Cliente: l.cliente_id ? nomeCli.get(l.cliente_id) ?? '' : '', Status: l.status === 'pago' ? 'Pago' : 'Previsto', Valor: l.valor
  })));

  return (
    <>
      <CabecalhoTela titulo="Financeiro" icone={<Wallet size={28} strokeWidth={1.6} />}
        acoes={<>
          <Abas<Carteira> abas={[{ id: 'negocio', rotulo: 'Negócio' }, { id: 'pessoal', rotulo: 'Pessoal' }]} ativa={carteira} aoMudar={(c) => { setCarteira(c); setFiltroCat(''); }} />
          <Botao variante="primario" onClick={() => setForm({})}>Novo lançamento</Botao>
        </>} />

      <div className="linha entre" style={{ marginBottom: 16 }}>
        <div className="linha" style={{ gap: 4 }}>
          <BotaoIcone rotulo="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}><ChevronLeft size={20} /></BotaoIcone>
          <h2 className="titulo-card" style={{ minWidth: 190, textAlign: 'center' }}>{tituloMes(mes)}</h2>
          <BotaoIcone rotulo="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}><ChevronRight size={20} /></BotaoIcone>
        </div>
        <div className="linha">
          <Botao icone={<Tags size={16} />} onClick={() => setVerCats(true)}>Categorias</Botao>
          <Botao icone={<Download size={16} />} onClick={exportar} disabled={!lista.length}>Exportar</Botao>
        </div>
      </div>

      <div className="grade grade-4" style={{ marginBottom: 18 }}>
        <Card medio><div className="rotulo">Entradas</div><div className="kpi-mini positivo" style={{ marginTop: 8 }}>{moeda(entradas)}</div></Card>
        <Card medio><div className="rotulo">Saídas{carteira === 'negocio' ? ' (sem verbas)' : ''}</div><div className="kpi-mini" style={{ marginTop: 8 }}>{moeda(saidas)}</div></Card>
        <Card medio><div className="rotulo">{carteira === 'negocio' ? 'Lucro' : 'Saldo'}</div><div className={`kpi-mini ${entradas - saidas < 0 ? 'negativo' : ''}`} style={{ marginTop: 8 }}>{moeda(entradas - saidas)}</div></Card>
        <Card medio>
          <div className="rotulo">{carteira === 'negocio' ? 'A Receber' : 'Contas Previstas'}</div>
          <div className="kpi-mini" style={{ marginTop: 8 }}>{moeda(carteira === 'negocio' ? aReceber : previsto)}</div>
        </Card>
      </div>

      <div className="grade grade-2" style={{ marginBottom: 18, gridTemplateColumns: carteira === 'negocio' && cfg?.mei ? undefined : '1fr' }}>
        <Card titulo="Últimos 12 Meses">
          <svg viewBox="0 0 600 190" width="100%" role="img" aria-label="Entradas e saídas dos últimos 12 meses">
            {serie.map((x, i) => {
              const bx = 12 + i * 49;
              const he = (x.e / max) * 150, hs = (x.s / max) * 150;
              return (
                <g key={x.m}>
                  <rect x={bx} y={160 - he} width={17} height={he} rx={5} fill="var(--preenchimento)"><title>{`Entradas: ${moeda(x.e)}`}</title></rect>
                  <rect x={bx + 20} y={160 - hs} width={17} height={hs} rx={5} fill="var(--texto-secundario)" opacity={0.35}><title>{`Saídas: ${moeda(x.s)}`}</title></rect>
                  <text x={bx + 18} y={180} textAnchor="middle" fontSize="11" fill="var(--texto-secundario)">{nomeMes(x.m, false).slice(0, 3)}</text>
                </g>
              );
            })}
          </svg>
          <div className="linha pequeno secundario" style={{ gap: 14 }}>
            <span className="linha" style={{ gap: 6 }}><i className="ponto" style={{ background: 'var(--preenchimento)' }} />Entradas</span>
            <span className="linha" style={{ gap: 6 }}><i className="ponto" style={{ background: 'var(--texto-secundario)', opacity: .35 }} />Saídas</span>
          </div>
        </Card>
        {carteira === 'negocio' && cfg?.mei && (
          <Card titulo={`Limite do MEI em ${ano}`}>
            <p className="kpi-mini">{moeda(faturamentoAno)}</p>
            <p className="secundario" style={{ margin: '6px 0 14px' }}>de {moeda(cfg.limite_mei)} por ano</p>
            <Barra valor={faturamentoAno} max={cfg.limite_mei} />
            {faturamentoAno > cfg.limite_mei * 0.8 && <p className="faixa" style={{ marginTop: 14, color: 'var(--atencao)' }}>Você já passou de 80% do limite anual do MEI. Vale conversar com um contador.</p>}
            <p className="pequeno secundario" style={{ marginTop: 14 }}>O DAS vence todo dia 20 e a declaração anual até 31 de maio. Os dois já aparecem na agenda.</p>
          </Card>
        )}
      </div>

      <Card titulo="Lançamentos" acao={
        <select className="entrada" style={{ width: 'auto', minHeight: 38, padding: '6px 34px 6px 12px' }} value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {cats.filter((c) => c.carteira === carteira).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>}>
        {!lista.length ? <Vazio texto="Nenhum lançamento neste mês." acao={<Botao onClick={() => setForm({})}>Novo lançamento</Botao>} /> : (
          <div className="lista">
            {lista.map((l) => (
              <button key={l.id} className="item" onClick={() => setForm(l)}>
                <div className="cresce">
                  <div className="titulo">{l.descricao}</div>
                  <div className="linha pequeno secundario" style={{ gap: 6, marginTop: 3 }}>
                    <span>{data(l.data)}</span>
                    {l.categoria_id && <span>{catPorId.get(l.categoria_id)?.nome}</span>}
                    {l.cliente_id && <span>{nomeCli.get(l.cliente_id)}</span>}
                    {l.status === 'previsto' && <Chip cor="atencao">Previsto</Chip>}
                    {ehVerba(l) && <Chip cor={l.reembolsado_em ? 'ok' : 'destaque'}>{l.reembolsado_em ? 'Reembolsada' : 'A reembolsar'}</Chip>}
                  </div>
                </div>
                <span className={`num ${l.tipo === 'entrada' ? 'positivo' : ''}`} style={{ fontWeight: 500 }}>{l.tipo === 'entrada' ? '+' : '−'} {moeda(l.valor)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <FormLancamento inicial={form} carteira={carteira} aoFechar={() => setForm(null)} cats={cats} clientes={clientes} />
      <GerirCategorias aberto={verCats} aoFechar={() => setVerCats(false)} carteira={carteira} cats={cats.filter((c) => c.carteira === carteira)} />
    </>
  );
}

function FormLancamento({ inicial, carteira, aoFechar, cats, clientes }: { inicial: Partial<Lancamento> | null; carteira: Carteira; aoFechar: () => void; cats: Categoria[]; clientes: Cliente[] }) {
  const avisar = useAvisar();
  const [l, setL] = useState<Partial<Lancamento>>({});
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!inicial) return;
    setErro(null);
    const base = inicial.id ? inicial : { carteira, tipo: 'saida' as const, descricao: '', data: hoje(), status: 'pago' as const, categoria_id: null, forma_pagamento: 'Pix', cliente_id: null, recorrente: false };
    setL(base);
    setValor(inicial.id ? String(inicial.valor).replace('.', ',') : '');
  }, [inicial, carteira]);
  if (!inicial) return null;
  const set = <K extends keyof Lancamento>(k: K, v: Lancamento[K]) => setL((p) => ({ ...p, [k]: v }));
  const catsTipo = cats.filter((c) => c.carteira === l.carteira && c.tipo === l.tipo);
  const cat = cats.find((c) => c.id === l.categoria_id);
  const deCobranca = !!l.cobranca_id;

  const gravar = async () => {
    if (!l.descricao?.trim() || numero(valor) <= 0 || !l.data) { setErro('Preencha descrição, valor e data.'); return; }
    const salvo = await salvar<Lancamento>('lancamentos', {
      recorrencia_origem_id: null, referencia: null, reembolsado_em: null, cobranca_id: null, ...l,
      descricao: l.descricao.trim(), valor: numero(valor), cliente_id: l.carteira === 'negocio' ? l.cliente_id ?? null : null
    } as Partial<Lancamento>);
    await aposSalvarLancamento(salvo);
    avisar(l.id ? 'Lançamento atualizado' : 'Lançamento criado');
    aoFechar();
  };
  const apagar = async () => { if (l.id && window.confirm('Excluir este lançamento?')) { await excluir('lancamentos', l.id); aoFechar(); } };

  return (
    <Modal titulo={l.id ? 'Editar Lançamento' : 'Novo Lançamento'} aberto={!!inicial} aoFechar={aoFechar}
      rodape={<>
        {l.id && !deCobranca && <Botao variante="perigo" onClick={apagar}>Excluir</Botao>}
        <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" onClick={gravar}>{l.id ? 'Salvar alterações' : 'Criar lançamento'}</Botao>
      </>}>
      {deCobranca && <p className="faixa" style={{ marginBottom: 14 }}>Este lançamento veio do pagamento de uma cobrança. Para desfazer, use "Desfazer pagamento" em Cobranças.</p>}
      <div className="grade-form">
        <Campo rotulo="Carteira">
          <select className="entrada" value={l.carteira} onChange={(e) => setL({ ...l, carteira: e.target.value as Carteira, categoria_id: null })} disabled={deCobranca}>
            <option value="negocio">Negócio</option><option value="pessoal">Pessoal</option>
          </select>
        </Campo>
        <Campo rotulo="Tipo">
          <select className="entrada" value={l.tipo} onChange={(e) => setL({ ...l, tipo: e.target.value as Lancamento['tipo'], categoria_id: null })} disabled={deCobranca}>
            <option value="saida">Saída</option><option value="entrada">Entrada</option>
          </select>
        </Campo>
        <Campo rotulo="Descrição" inteiro erro={erro}><input className="entrada" value={l.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} autoFocus={!l.id} /></Campo>
        <Campo rotulo="Valor"><input className="entrada" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></Campo>
        <Campo rotulo="Data"><input className="entrada" type="date" value={l.data ?? ''} onChange={(e) => set('data', e.target.value)} /></Campo>
        <Campo rotulo="Categoria">
          <select className="entrada" value={l.categoria_id ?? ''} onChange={(e) => set('categoria_id', e.target.value || null)} disabled={deCobranca}>
            <option value="">Sem categoria</option>{catsTipo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Situação">
          <select className="entrada" value={l.status} onChange={(e) => set('status', e.target.value as Lancamento['status'])}>
            <option value="pago">{l.tipo === 'entrada' ? 'Recebido' : 'Pago'}</option><option value="previsto">Previsto</option>
          </select>
        </Campo>
        <Campo rotulo="Forma de pagamento">
          <select className="entrada" value={l.forma_pagamento} onChange={(e) => set('forma_pagamento', e.target.value)}>
            {['Pix', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência', 'Dinheiro'].map((f) => <option key={f}>{f}</option>)}
          </select>
        </Campo>
        {l.carteira === 'negocio' && (
          <Campo rotulo="Cliente (opcional)">
            <select className="entrada" value={l.cliente_id ?? ''} onChange={(e) => set('cliente_id', e.target.value || null)} disabled={deCobranca}>
              <option value="">Nenhum</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
        )}
        {cat?.especial === 'verba_adiantada' && <p className="faixa inteiro">Verba adiantada não entra no lucro. Com um cliente escolhido, vira automaticamente uma cobrança de reembolso.</p>}
        {!l.recorrencia_origem_id && !deCobranca && <div className="inteiro"><Marcador rotulo="Repetir todo mês (conta fixa)" marcado={!!l.recorrente} aoMudar={(v) => set('recorrente', v)} /></div>}
      </div>
    </Modal>
  );
}

function GerirCategorias({ aberto, aoFechar, carteira, cats }: { aberto: boolean; aoFechar: () => void; carteira: Carteira; cats: Categoria[] }) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<Categoria['tipo']>('saida');
  const criar = async () => {
    if (!nome.trim()) return;
    await salvar<Categoria>('categorias', { carteira, nome: nome.trim(), tipo, especial: null });
    setNome('');
  };
  return (
    <Modal titulo={`Categorias — ${carteira === 'negocio' ? 'Negócio' : 'Pessoal'}`} aberto={aberto} aoFechar={aoFechar}>
      <div className="lista">
        {[...cats].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome)).map((c) => (
          <div key={c.id} className="item" style={{ cursor: 'default' }}>
            <input className="entrada cresce" defaultValue={c.nome} onBlur={(e) => e.target.value.trim() && e.target.value !== c.nome && salvar<Categoria>('categorias', { id: c.id, nome: e.target.value.trim() })} />
            <Chip>{c.tipo === 'entrada' ? 'Entrada' : 'Saída'}</Chip>
            {!c.especial && <BotaoIcone rotulo="Excluir categoria" onClick={() => window.confirm(`Excluir a categoria ${c.nome}?`) && excluir('categorias', c.id)}><Trash2 size={17} /></BotaoIcone>}
          </div>
        ))}
      </div>
      <div className="linha" style={{ marginTop: 16 }}>
        <input className="entrada cresce" placeholder="Nova categoria" value={nome} onChange={(e) => setNome(e.target.value)} />
        <select className="entrada" style={{ width: 'auto' }} value={tipo} onChange={(e) => setTipo(e.target.value as Categoria['tipo'])}>
          <option value="saida">Saída</option><option value="entrada">Entrada</option>
        </select>
        <Botao onClick={criar}>Adicionar</Botao>
      </div>
    </Modal>
  );
}
