import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus, Plus, Trash2 } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Marcador, AssistenteTexto, useAvisar } from '../../componentes/ui';
import { useConfig, useLista } from '../../lib/hooks';
import { db } from '../../lib/db';
import { salvar } from '../../lib/repo';
import { novoId } from '../../lib/ids';
import { hoje, somarDias } from '../../lib/formato';
import { documentoValido, formatarDocumento } from '../../lib/validacao';
import { aplicarChecklists, atualizarCobrancasFuturas, cancelarCobrancasFuturas, encerrarCliente, gerarCobrancas } from '../../lib/automacoes';
import type { Cliente, ClienteServico, ClienteTrafego, Servico } from '../../lib/tipos';

type Linha = ClienteServico & { _nova?: boolean; _statusAnterior?: string };

const clienteVazio = (): Partial<Cliente> => ({
  tipo_pessoa: 'PJ', nome: '', nome_fantasia: '', documento: '', responsavel: '', telefone: '', whatsapp: '', email: '',
  endereco: '', cidade: '', uf: '', nicho: '', origem: '', indicado_por_id: null, status: 'ativo', observacoes: '',
  aniversario: null, multa_ativa: false, multa_percentual: 2, juros_mensal: 1, aprova_posts: false, lead_id: null
});
const trafegoVazio = (): Partial<ClienteTrafego> => ({
  quem_paga_verba: 'cliente', verba_mensal_planejada: 0, resultado_principal: 'leads', frequencia_relatorio: 'mensal',
  dia_relatorio: 5, puxar_leads_formularios: false
});
const ORIGENS = ['Indicação', 'Google Maps', 'Instagram', 'Site', 'Anúncios', 'Outro'];
const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

export function FormCliente() {
  const { id } = useParams();
  const editando = !!id;
  const navegar = useNavigate();
  const avisar = useAvisar();
  const cfg = useConfig();
  const servicos = useLista<Servico>('servicos') ?? [];
  const clientes = useLista<Cliente>('clientes') ?? [];
  const [c, setC] = useState<Partial<Cliente>>(clienteVazio);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [removidas, setRemovidas] = useState<Linha[]>([]);
  const [trafego, setTrafego] = useState<Partial<ClienteTrafego>>(trafegoVazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!editando) {
      if (cfg) setC((p) => ({ ...p, multa_percentual: cfg.multa_padrao, juros_mensal: cfg.juros_padrao }));
      return;
    }
    (async () => {
      const cli = await db.clientes.get(id!);
      if (!cli || cli.excluido) { navegar('/clientes'); return; }
      setC(cli);
      const cs = (await db.cliente_servicos.where('cliente_id').equals(id!).toArray()).filter((x) => !x.excluido);
      setLinhas(cs.map((x) => ({ ...x, _statusAnterior: x.status })));
      const tr = await db.cliente_trafego.get(id!);
      if (tr) setTrafego(tr);
    })();
  }, [id, editando, cfg?.id]);

  const servPorId = useMemo(() => new Map(servicos.map((s) => [s.id, s])), [servicos]);
  const temTrafego = linhas.some((l) => l.status === 'ativo' && servPorId.get(l.servico_id)?.chave === 'trafego');
  const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) => setC((p) => ({ ...p, [k]: v }));
  const setLinha = (i: number, parcial: Partial<Linha>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...parcial } : l)));
  const setTr = <K extends keyof ClienteTrafego>(k: K, v: ClienteTrafego[K]) => setTrafego((p) => ({ ...p, [k]: v }));

  const adicionarServico = () => {
    const s = servicos.find((x) => x.ativo);
    setLinhas((ls) => [...ls, {
      id: novoId(), criado_em: '', atualizado_em: '', excluido: false, cliente_id: '', servico_id: s?.id ?? '', descricao: '',
      tipo_cobranca: s?.tipo_cobranca_padrao ?? 'mensal', valor: s?.preco_base ?? 0, dia_vencimento: 10, parcelas: 1,
      primeiro_vencimento: somarDias(hoje(), 7), inicio: hoje(), fim: null, status: 'ativo', _nova: true
    }]);
  };
  const escolherServico = (i: number, servicoId: string) => {
    const s = servPorId.get(servicoId);
    setLinha(i, { servico_id: servicoId, ...(s && linhas[i]._nova ? { tipo_cobranca: s.tipo_cobranca_padrao, valor: s.preco_base || linhas[i].valor } : {}) });
  };
  const remover = (i: number) => {
    const l = linhas[i];
    if (!l._nova) setRemovidas((r) => [...r, l]);
    setLinhas((ls) => ls.filter((_, j) => j !== i));
  };

  const gravar = async () => {
    const e: Record<string, string> = {};
    if (!c.nome?.trim()) e.nome = 'Informe o nome do cliente.';
    if (!documentoValido(c.tipo_pessoa ?? 'PJ', c.documento ?? '')) e.documento = c.tipo_pessoa === 'PF' ? 'CPF inválido. Confira os números.' : 'CNPJ inválido. Confira os números.';
    linhas.forEach((l, i) => {
      if (!l.servico_id) e[`servico${i}`] = 'Escolha o serviço.';
      if (!(Number(l.valor) > 0)) e[`valor${i}`] = 'Informe o valor.';
    });
    setErros(e);
    if (Object.keys(e).length) { avisar('Confira os campos destacados'); return; }
    setSalvando(true);
    try {
      const anterior = editando ? await db.clientes.get(id!) : undefined;
      const cli = await salvar<Cliente>('clientes', { ...c, nome: c.nome!.trim(), documento: formatarDocumento(c.documento ?? ''), uf: (c.uf ?? '').toUpperCase() } as Partial<Cliente>);
      for (const l of linhas) {
        const { _nova, _statusAnterior, ...dados } = l;
        const cs = await salvar<ClienteServico>('cliente_servicos', { ...dados, cliente_id: cli.id, valor: Number(dados.valor), dia_vencimento: Number(dados.dia_vencimento), parcelas: Number(dados.parcelas) });
        if (cs.status === 'encerrado') { if (_statusAnterior !== 'encerrado') await cancelarCobrancasFuturas(cs.id); continue; }
        if (_nova) await aplicarChecklists(cli, cs); else await atualizarCobrancasFuturas(cs);
        await gerarCobrancas(cs, cli);
      }
      for (const r of removidas) {
        await salvar<ClienteServico>('cliente_servicos', { id: r.id, excluido: true });
        await cancelarCobrancasFuturas(r.id);
      }
      if (temTrafego) await salvar<ClienteTrafego>('cliente_trafego', { ...trafego, id: cli.id, cliente_id: cli.id });
      if (cli.status === 'encerrado' && anterior?.status !== 'encerrado') await encerrarCliente(cli);
      avisar(editando ? 'Cliente atualizado' : 'Cliente cadastrado');
      navegar(`/clientes/${cli.id}`, { replace: true });
    } finally {
      setSalvando(false);
    }
  };

  const excluirCliente = async () => {
    if (!c.id || !window.confirm('Excluir este cliente? As cobranças futuras em aberto serão canceladas.')) return;
    await encerrarCliente(c as Cliente);
    await salvar<Cliente>('clientes', { id: c.id, excluido: true });
    avisar('Cliente excluído');
    navegar('/clientes', { replace: true });
  };

  return (
    <>
      <CabecalhoTela titulo={editando ? 'Editar Cliente' : 'Novo Cliente'} icone={<UserPlus size={28} strokeWidth={1.6} />}
        subtitulo={editando ? c.nome : 'Ao salvar, o Atlas cria as cobranças, os vencimentos na agenda e o checklist de cada serviço.'} />
      <div className="coluna" style={{ gap: 18 }}>
        <Card titulo="Dados do Cliente">
          <div className="grade-form">
            <Campo rotulo="Tipo">
              <select className="entrada" value={c.tipo_pessoa} onChange={(e) => set('tipo_pessoa', e.target.value as Cliente['tipo_pessoa'])}>
                <option value="PJ">Pessoa jurídica</option><option value="PF">Pessoa física</option>
              </select>
            </Campo>
            <Campo rotulo={c.tipo_pessoa === 'PF' ? 'Nome completo' : 'Nome ou razão social'} erro={erros.nome}>
              <input className="entrada" value={c.nome} onChange={(e) => set('nome', e.target.value)} autoFocus={!editando} />
            </Campo>
            <Campo rotulo="Nome fantasia"><input className="entrada" value={c.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} /></Campo>
            <Campo rotulo={c.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'} erro={erros.documento}>
              <input className="entrada" inputMode="numeric" value={c.documento} onChange={(e) => set('documento', e.target.value)} />
            </Campo>
            <Campo rotulo="Responsável"><input className="entrada" value={c.responsavel} onChange={(e) => set('responsavel', e.target.value)} /></Campo>
            <Campo rotulo="WhatsApp"><input className="entrada" type="tel" value={c.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(69) 99999-9999" /></Campo>
            <Campo rotulo="Telefone"><input className="entrada" type="tel" value={c.telefone} onChange={(e) => set('telefone', e.target.value)} /></Campo>
            <Campo rotulo="E-mail"><input className="entrada" type="email" value={c.email} onChange={(e) => set('email', e.target.value)} /></Campo>
            <Campo rotulo="Cidade"><input className="entrada" value={c.cidade} onChange={(e) => set('cidade', e.target.value)} /></Campo>
            <Campo rotulo="UF"><input className="entrada" maxLength={2} value={c.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} /></Campo>
            <Campo rotulo="Endereço" inteiro><input className="entrada" value={c.endereco} onChange={(e) => set('endereco', e.target.value)} /></Campo>
            <Campo rotulo="Nicho"><input className="entrada" value={c.nicho} onChange={(e) => set('nicho', e.target.value)} placeholder="Ex.: pizzaria, clínica, loja de roupas" /></Campo>
            <Campo rotulo="Origem">
              <select className="entrada" value={c.origem} onChange={(e) => set('origem', e.target.value)}>
                <option value="">Não informada</option>{ORIGENS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Campo>
            {c.origem === 'Indicação' && (
              <Campo rotulo="Indicado por">
                <select className="entrada" value={c.indicado_por_id ?? ''} onChange={(e) => set('indicado_por_id', e.target.value || null)}>
                  <option value="">Escolha o cliente que indicou</option>
                  {clientes.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </Campo>
            )}
            <Campo rotulo="Aniversário do cliente"><input className="entrada" type="date" value={c.aniversario ?? ''} onChange={(e) => set('aniversario', e.target.value || null)} /></Campo>
            <Campo rotulo="Status">
              <select className="entrada" value={c.status} onChange={(e) => set('status', e.target.value as Cliente['status'])}>
                <option value="ativo">Ativo</option><option value="pausado">Pausado</option><option value="encerrado">Encerrado</option>
              </select>
            </Campo>
          </div>
        </Card>

        <Card titulo="Serviços Contratados" acao={<Botao icone={<Plus size={16} />} onClick={adicionarServico}>Adicionar serviço</Botao>}>
          {!linhas.length && <p className="secundario">Nenhum serviço ainda. Adicione os serviços que este cliente contratou.</p>}
          <div className="coluna" style={{ gap: 14 }}>
            {linhas.map((l, i) => (
              <div key={l.id} className="card-medio" style={{ background: 'var(--campo)', border: '1px solid var(--vidro-borda)' }}>
                <div className="grade-form">
                  <Campo rotulo="Serviço" erro={erros[`servico${i}`]}>
                    <select className="entrada" value={l.servico_id} onChange={(e) => escolherServico(i, e.target.value)}>
                      <option value="">Escolha</option>
                      {servicos.filter((s) => s.ativo || s.id === l.servico_id).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </Campo>
                  <Campo rotulo="Tipo de cobrança">
                    <select className="entrada" value={l.tipo_cobranca} onChange={(e) => setLinha(i, { tipo_cobranca: e.target.value as Linha['tipo_cobranca'] })} disabled={!l._nova}>
                      <option value="mensal">Mensal Fixo</option><option value="pacote">Pacote</option>
                    </select>
                  </Campo>
                  <Campo rotulo={l.tipo_cobranca === 'mensal' ? 'Valor mensal' : 'Valor total do pacote'} erro={erros[`valor${i}`]}>
                    <input className="entrada" type="number" min="0" step="0.01" inputMode="decimal" value={l.valor || ''} onChange={(e) => setLinha(i, { valor: Number(e.target.value) })} />
                  </Campo>
                  {l.tipo_cobranca === 'mensal' ? (
                    <Campo rotulo="Dia do vencimento"><input className="entrada" type="number" min="1" max="31" value={l.dia_vencimento} onChange={(e) => setLinha(i, { dia_vencimento: Number(e.target.value) })} /></Campo>
                  ) : (
                    <>
                      <Campo rotulo="Parcelas"><input className="entrada" type="number" min="1" max="24" value={l.parcelas} onChange={(e) => setLinha(i, { parcelas: Number(e.target.value) })} disabled={!l._nova} /></Campo>
                      <Campo rotulo="Primeiro vencimento"><input className="entrada" type="date" value={l.primeiro_vencimento ?? ''} onChange={(e) => setLinha(i, { primeiro_vencimento: e.target.value })} disabled={!l._nova} /></Campo>
                    </>
                  )}
                  <Campo rotulo="Início"><input className="entrada" type="date" value={l.inicio} onChange={(e) => setLinha(i, { inicio: e.target.value })} /></Campo>
                  {l.tipo_cobranca === 'mensal' && <Campo rotulo="Fim (opcional)"><input className="entrada" type="date" value={l.fim ?? ''} onChange={(e) => setLinha(i, { fim: e.target.value || null })} /></Campo>}
                  <Campo rotulo="Descrição (opcional)"><input className="entrada" value={l.descricao} onChange={(e) => setLinha(i, { descricao: e.target.value })} placeholder="Aparece nas cobranças" /></Campo>
                  {!l._nova && (
                    <Campo rotulo="Situação do serviço">
                      <select className="entrada" value={l.status} onChange={(e) => setLinha(i, { status: e.target.value as Linha['status'] })}>
                        <option value="ativo">Ativo</option><option value="encerrado">Encerrado</option>
                      </select>
                    </Campo>
                  )}
                </div>
                <div className="linha" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                  <Botao variante="fantasma" icone={<Trash2 size={16} />} onClick={() => remover(i)}>Remover serviço</Botao>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {temTrafego && (
          <Card titulo="Configuração de Tráfego">
            <div className="grade-form">
              <Campo rotulo="Quem paga a verba dos anúncios">
                <select className="entrada" value={trafego.quem_paga_verba} onChange={(e) => setTr('quem_paga_verba', e.target.value as ClienteTrafego['quem_paga_verba'])}>
                  <option value="cliente">O cliente, direto no cartão dele</option><option value="continental">A Continental MKT, com reembolso</option>
                </select>
              </Campo>
              <Campo rotulo="Verba mensal planejada"><input className="entrada" type="number" min="0" step="0.01" value={trafego.verba_mensal_planejada || ''} onChange={(e) => setTr('verba_mensal_planejada', Number(e.target.value))} /></Campo>
              <Campo rotulo="Resultado principal">
                <select className="entrada" value={trafego.resultado_principal} onChange={(e) => setTr('resultado_principal', e.target.value as ClienteTrafego['resultado_principal'])}>
                  <option value="leads">Leads</option><option value="conversas">Conversas no WhatsApp</option><option value="compras">Compras</option><option value="cliques">Cliques</option>
                </select>
              </Campo>
              <Campo rotulo="Frequência do relatório">
                <select className="entrada" value={trafego.frequencia_relatorio} onChange={(e) => setTr('frequencia_relatorio', e.target.value as ClienteTrafego['frequencia_relatorio'])}>
                  <option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option><option value="nenhuma">Sem relatório</option>
                </select>
              </Campo>
              {trafego.frequencia_relatorio === 'semanal' ? (
                <Campo rotulo="Dia do envio">
                  <select className="entrada" value={trafego.dia_relatorio} onChange={(e) => setTr('dia_relatorio', Number(e.target.value))}>
                    {DIAS_SEMANA.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                  </select>
                </Campo>
              ) : trafego.frequencia_relatorio !== 'nenhuma' && (
                <Campo rotulo="Dia do mês do envio"><input className="entrada" type="number" min="1" max="28" value={trafego.dia_relatorio} onChange={(e) => setTr('dia_relatorio', Number(e.target.value))} /></Campo>
              )}
              <div className="inteiro">
                <Marcador rotulo="Puxar os leads dos formulários do Meta deste cliente" marcado={!!trafego.puxar_leads_formularios} aoMudar={(v) => setTr('puxar_leads_formularios', v)} />
              </div>
            </div>
          </Card>
        )}

        <Card titulo="Preferências do Cliente">
          <div className="grade-form">
            <div className="inteiro">
              <Marcador rotulo="Aprova posts e criativos pelo link do Atlas" marcado={!!c.aprova_posts} aoMudar={(v) => set('aprova_posts', v)} />
              <Marcador rotulo="Cobrar multa e juros quando atrasar" marcado={!!c.multa_ativa} aoMudar={(v) => set('multa_ativa', v)} />
            </div>
            {c.multa_ativa && (
              <>
                <Campo rotulo="Multa (%)"><input className="entrada" type="number" min="0" step="0.1" value={c.multa_percentual} onChange={(e) => set('multa_percentual', Number(e.target.value))} /></Campo>
                <Campo rotulo="Juros ao mês (%)"><input className="entrada" type="number" min="0" step="0.1" value={c.juros_mensal} onChange={(e) => set('juros_mensal', Number(e.target.value))} /></Campo>
              </>
            )}
            <Campo rotulo="Observações" inteiro acao={<AssistenteTexto valor={c.observacoes ?? ''} aoCorrigir={v => set('observacoes', v)} />}>
              <textarea className="entrada" value={c.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} placeholder="Preferências, histórico de alinhamentos e particularidades..." />
            </Campo>
          </div>
        </Card>

        <div className="linha entre">
          <div>{editando && <Botao variante="perigo" onClick={excluirCliente}>Excluir cliente</Botao>}</div>
          <div className="linha">
            <Botao variante="fantasma" onClick={() => navegar(-1)}>Cancelar</Botao>
            <Botao variante="primario" onClick={gravar} disabled={salvando}>{editando ? 'Salvar alterações' : 'Cadastrar cliente'}</Botao>
          </div>
        </div>
      </div>
    </>
  );
}
