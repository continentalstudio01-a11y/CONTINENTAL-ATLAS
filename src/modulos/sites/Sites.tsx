import { useState, useMemo } from 'react';
import { Globe, Plus, Trash2, ChevronRight, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar, Barra } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje, moeda, numero } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente } from '../../lib/tipos';

interface ProjetoSite {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  nome: string;
  tipo: 'site' | 'landing';
  etapa: 'briefing' | 'wireframe' | 'design' | 'desenvolvimento' | 'revisao' | 'publicado';
  limite_revisoes: number;
  revisoes_usadas: number;
  prazo: string | null;
  link_homologacao: string;
  link_publicado: string;
  observacoes: string;
  criado_em: string;
  atualizado_em: string;
}

interface DominioHospedagem {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  dominio: string;
  registrador: string;
  hospedagem: string;
  vence_dominio: string | null;
  vence_hospedagem: string | null;
  quem_paga: 'cliente' | 'continental';
  valor_anual: number;
  observacoes: string;
}

const ETAPAS_PROJETO: { id: ProjetoSite['etapa']; rotulo: string }[] = [
  { id: 'briefing', rotulo: 'Briefing' },
  { id: 'wireframe', rotulo: 'Wireframe / Estrutura' },
  { id: 'design', rotulo: 'Design Visual' },
  { id: 'desenvolvimento', rotulo: 'Desenvolvimento' },
  { id: 'revisao', rotulo: 'Revisão com Cliente' },
  { id: 'publicado', rotulo: 'Publicado no Ar' },
];

function carregarProjetos(): ProjetoSite[] {
  try { return JSON.parse(localStorage.getItem('atlas_sites_projetos') || '[]'); } catch { return []; }
}
function salvarProjetosStorage(l: ProjetoSite[]) { localStorage.setItem('atlas_sites_projetos', JSON.stringify(l)); }

function carregarDominios(): DominioHospedagem[] {
  try { return JSON.parse(localStorage.getItem('atlas_sites_dominios') || '[]'); } catch { return []; }
}
function salvarDominiosStorage(l: DominioHospedagem[]) { localStorage.setItem('atlas_sites_dominios', JSON.stringify(l)); }

export function Sites() {
  const [aba, setAba] = useState<'projetos' | 'dominios'>('projetos');
  const [projetos, setProjetos] = useState<ProjetoSite[]>(carregarProjetos);
  const [dominios, setDominios] = useState<DominioHospedagem[]>(carregarDominios);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const avisar = useAvisar();

  const [formProjAberto, setFormProjAberto] = useState(false);
  const [formDomAberto, setFormDomAberto] = useState(false);
  const [detalhesProj, setDetalhesProj] = useState<ProjetoSite | null>(null);

  const [formP, setFormP] = useState({
    cliente_id: '', nome: '', tipo: 'landing' as ProjetoSite['tipo'],
    etapa: 'briefing' as ProjetoSite['etapa'], limite_revisoes: 3,
    prazo: '', link_homologacao: '', link_publicado: '', observacoes: ''
  });

  const [formD, setFormD] = useState({
    cliente_id: '', dominio: '', registrador: 'Registro.br',
    hospedagem: 'Hostinger', vence_dominio: '', vence_hospedagem: '',
    quem_paga: 'cliente' as DominioHospedagem['quem_paga'], valor_anual: '', observacoes: ''
  });

  const salvarP = (lista: ProjetoSite[]) => { setProjetos(lista); salvarProjetosStorage(lista); };
  const salvarD = (lista: DominioHospedagem[]) => { setDominios(lista); salvarDominiosStorage(lista); };

  const criarProjeto = () => {
    if (!formP.cliente_id || !formP.nome.trim()) { avisar('Selecione o cliente e informe o nome do site.'); return; }
    const cli = clientes.find(c => c.id === formP.cliente_id);
    const agora = new Date().toISOString();
    const novo: ProjetoSite = {
      id: novoId(), cliente_id: formP.cliente_id, cliente_nome: cli?.nome ?? '',
      nome: formP.nome, tipo: formP.tipo, etapa: formP.etapa,
      limite_revisoes: Number(formP.limite_revisoes) || 3, revisoes_usadas: 0,
      prazo: formP.prazo || null, link_homologacao: formP.link_homologacao,
      link_publicado: formP.link_publicado, observacoes: formP.observacoes,
      criado_em: agora, atualizado_em: agora,
    };
    salvarP([novo, ...projetos]);
    setFormProjAberto(false);
    avisar('Projeto de site criado');
  };

  const criarDominio = () => {
    if (!formD.cliente_id || !formD.dominio.trim()) { avisar('Selecione o cliente e informe o domínio.'); return; }
    const cli = clientes.find(c => c.id === formD.cliente_id);
    const novo: DominioHospedagem = {
      id: novoId(), cliente_id: formD.cliente_id, cliente_nome: cli?.nome ?? '',
      dominio: formD.dominio.toLowerCase(), registrador: formD.registrador,
      hospedagem: formD.hospedagem, vence_dominio: formD.vence_dominio || null,
      vence_hospedagem: formD.vence_hospedagem || null, quem_paga: formD.quem_paga,
      valor_anual: numero(formD.valor_anual), observacoes: formD.observacoes,
    };
    salvarD([novo, ...dominios]);
    setFormDomAberto(false);
    avisar('Domínio cadastrado');
  };

  const mudarEtapa = (p: ProjetoSite, etapa: ProjetoSite['etapa']) => {
    const upd = { ...p, etapa, atualizado_em: new Date().toISOString() };
    salvarP(projetos.map(x => x.id === p.id ? upd : x));
    setDetalhesProj(upd);
    avisar(`Etapa alterada para ${ETAPAS_PROJETO.find(e => e.id === etapa)?.rotulo}`);
  };

  const addRevisao = (p: ProjetoSite) => {
    const upd = { ...p, revisoes_usadas: p.revisoes_usadas + 1, atualizado_em: new Date().toISOString() };
    salvarP(projetos.map(x => x.id === p.id ? upd : x));
    setDetalhesProj(upd);
    avisar('Revisão contabilizada');
  };

  const excluirProjeto = (id: string) => {
    salvarP(projetos.filter(p => p.id !== id));
    setDetalhesProj(null);
    avisar('Projeto excluído');
  };

  const excluirDominio = (id: string) => {
    salvarD(dominios.filter(d => d.id !== id));
    avisar('Domínio excluído');
  };

  return (
    <>
      <CabecalhoTela
        titulo="Projetos de Site e Domínios"
        icone={<Globe size={28} strokeWidth={1.6} />}
        subtitulo="Gestão de etapas, revisões e vencimento de domínios/hospedagem"
        acoes={
          <div className="linha" style={{ gap: 8 }}>
            {aba === 'projetos' ? (
              <Botao variante="primario" onClick={() => setFormProjAberto(true)}>
                <Plus size={17} /> Novo Projeto
              </Botao>
            ) : (
              <Botao variante="primario" onClick={() => setFormDomAberto(true)}>
                <Plus size={17} /> Novo Domínio
              </Botao>
            )}
          </div>
        }
      />

      <div className="abas vidro-pilula" style={{ width: 'fit-content', marginBottom: 16 }}>
        <button type="button" className={`aba ${aba === 'projetos' ? 'ativa' : ''}`} onClick={() => setAba('projetos')}>
          Projetos de Site ({projetos.length})
        </button>
        <button type="button" className={`aba ${aba === 'dominios' ? 'ativa' : ''}`} onClick={() => setAba('dominios')}>
          Domínios e Hospedagem ({dominios.length})
        </button>
      </div>

      {aba === 'projetos' && (
        <>
          {projetos.length === 0 ? (
            <Vazio texto="Nenhum projeto de site cadastrado." acao={<Botao variante="primario" onClick={() => setFormProjAberto(true)}><Plus size={15} /> Novo Projeto</Botao>} />
          ) : (
            <Card>
              <div className="lista">
                {projetos.map(p => (
                  <div key={p.id} className="item" onClick={() => setDetalhesProj(p)} style={{ cursor: 'pointer' }}>
                    <div className="cresce">
                      <div className="linha" style={{ gap: 8 }}>
                        <span className="titulo">{p.nome}</span>
                        <Chip cor={p.etapa === 'publicado' ? 'ok' : 'destaque'}>
                          {ETAPAS_PROJETO.find(e => e.id === p.etapa)?.rotulo}
                        </Chip>
                        <Chip>{p.tipo === 'landing' ? 'Landing Page' : 'Site Institucional'}</Chip>
                      </div>
                      <div className="pequeno secundario">
                        Cliente: {p.cliente_nome} {p.prazo ? ` · Prazo: ${data(p.prazo)}` : ''} · Revisões: {p.revisoes_usadas}/{p.limite_revisoes}
                      </div>
                    </div>
                    <ChevronRight size={18} className="secundario" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {aba === 'dominios' && (
        <>
          {dominios.length === 0 ? (
            <Vazio texto="Nenhum domínio cadastrado." acao={<Botao variante="primario" onClick={() => setFormDomAberto(true)}><Plus size={15} /> Novo Domínio</Botao>} />
          ) : (
            <Card>
              <div className="lista">
                {dominios.map(d => {
                  const venceuDom = d.vence_dominio && d.vence_dominio < hoje();
                  const venceuHosp = d.vence_hospedagem && d.vence_hospedagem < hoje();
                  return (
                    <div key={d.id} className={`item ${venceuDom || venceuHosp ? 'atrasado' : ''}`} style={{ cursor: 'default' }}>
                      <div className="cresce">
                        <div className="linha" style={{ gap: 8 }}>
                          <span className="titulo">{d.dominio}</span>
                          <Chip>{d.quem_paga === 'continental' ? 'Pago pela Agência' : 'Pago pelo Cliente'}</Chip>
                          {d.valor_anual > 0 && <span className="num pequeno">{moeda(d.valor_anual)}/ano</span>}
                        </div>
                        <div className="pequeno secundario">
                          Cliente: {d.cliente_nome} · Registrador: {d.registrador} · Hospedagem: {d.hospedagem}
                        </div>
                        <div className="pequeno">
                          {d.vence_dominio && <span>Venc. Domínio: <strong>{data(d.vence_dominio)}</strong> {venceuDom && <span style={{ color: '#F0776B' }}>(Vencido!)</span>}</span>}
                          {d.vence_dominio && d.vence_hospedagem && ' · '}
                          {d.vence_hospedagem && <span>Venc. Hospedagem: <strong>{data(d.vence_hospedagem)}</strong> {venceuHosp && <span style={{ color: '#F0776B' }}>(Vencido!)</span>}</span>}
                        </div>
                      </div>
                      <BotaoIcone rotulo="Excluir" onClick={() => excluirDominio(d.id)}><Trash2 size={15} /></BotaoIcone>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal Criar Projeto */}
      <Modal titulo="Novo Projeto de Site" aberto={formProjAberto} aoFechar={() => setFormProjAberto(false)}
        rodape={<Botao variante="primario" onClick={criarProjeto}>Criar Projeto</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={formP.cliente_id} onChange={e => setFormP(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Nome do Projeto *">
            <input className="entrada" value={formP.nome} onChange={e => setFormP(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Novo Site Institucional Continental" />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Tipo">
              <select className="entrada" value={formP.tipo} onChange={e => setFormP(f => ({ ...f, tipo: e.target.value as ProjetoSite['tipo'] }))}>
                <option value="landing">Landing Page</option>
                <option value="site">Site Institucional</option>
              </select>
            </Campo>
            <Campo rotulo="Etapa Inicial">
              <select className="entrada" value={formP.etapa} onChange={e => setFormP(f => ({ ...f, etapa: e.target.value as ProjetoSite['etapa'] }))}>
                {ETAPAS_PROJETO.map(et => <option key={et.id} value={et.id}>{et.rotulo}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Prazo Final">
              <input className="entrada" type="date" value={formP.prazo} onChange={e => setFormP(f => ({ ...f, prazo: e.target.value }))} />
            </Campo>
            <Campo rotulo="Limite de Revisões">
              <input className="entrada" type="number" min="0" value={formP.limite_revisoes} onChange={e => setFormP(f => ({ ...f, limite_revisoes: Number(e.target.value) }))} />
            </Campo>
          </div>
          <Campo rotulo="Link de Homologação / Prévia">
            <input className="entrada" value={formP.link_homologacao} onChange={e => setFormP(f => ({ ...f, link_homologacao: e.target.value }))} placeholder="https://previa..." />
          </Campo>
          <Campo rotulo="Link Publicado (Final)">
            <input className="entrada" value={formP.link_publicado} onChange={e => setFormP(f => ({ ...f, link_publicado: e.target.value }))} placeholder="https://..." />
          </Campo>
        </div>
      </Modal>

      {/* Modal Criar Domínio */}
      <Modal titulo="Novo Domínio / Hospedagem" aberto={formDomAberto} aoFechar={() => setFormDomAberto(false)}
        rodape={<Botao variante="primario" onClick={criarDominio}>Salvar Domínio</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={formD.cliente_id} onChange={e => setFormD(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Domínio *">
            <input className="entrada" value={formD.dominio} onChange={e => setFormD(f => ({ ...f, dominio: e.target.value }))} placeholder="exemplo.com.br" />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Registrador">
              <input className="entrada" value={formD.registrador} onChange={e => setFormD(f => ({ ...f, registrador: e.target.value }))} placeholder="Registro.br, GoDaddy..." />
            </Campo>
            <Campo rotulo="Hospedagem">
              <input className="entrada" value={formD.hospedagem} onChange={e => setFormD(f => ({ ...f, hospedagem: e.target.value }))} placeholder="Hostinger, Cloudflare, Vercel..." />
            </Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Vencimento do Domínio">
              <input className="entrada" type="date" value={formD.vence_dominio} onChange={e => setFormD(f => ({ ...f, vence_dominio: e.target.value }))} />
            </Campo>
            <Campo rotulo="Vencimento da Hospedagem">
              <input className="entrada" type="date" value={formD.vence_hospedagem} onChange={e => setFormD(f => ({ ...f, vence_hospedagem: e.target.value }))} />
            </Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Quem Paga?">
              <select className="entrada" value={formD.quem_paga} onChange={e => setFormD(f => ({ ...f, quem_paga: e.target.value as DominioHospedagem['quem_paga'] }))}>
                <option value="cliente">Cliente paga direto</option>
                <option value="continental">Continental (reembolsável/incluso)</option>
              </select>
            </Campo>
            <Campo rotulo="Valor Anual (R$)">
              <input className="entrada" type="number" min="0" step="0.01" value={formD.valor_anual} onChange={e => setFormD(f => ({ ...f, valor_anual: e.target.value }))} />
            </Campo>
          </div>
        </div>
      </Modal>

      {/* Modal Detalhes do Projeto */}
      <Modal titulo={detalhesProj?.nome ?? ''} aberto={!!detalhesProj} aoFechar={() => setDetalhesProj(null)}>
        {detalhesProj && (
          <div className="coluna" style={{ gap: 16 }}>
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip cor={detalhesProj.etapa === 'publicado' ? 'ok' : 'destaque'}>
                {ETAPAS_PROJETO.find(e => e.id === detalhesProj.etapa)?.rotulo}
              </Chip>
              <Chip>{detalhesProj.tipo === 'landing' ? 'Landing Page' : 'Site Institucional'}</Chip>
              {detalhesProj.prazo && <span className="secundario pequeno">Prazo: {data(detalhesProj.prazo)}</span>}
            </div>

            <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
              <div className="linha entre pequeno" style={{ marginBottom: 6 }}>
                <span>Revisões Utilizadas</span>
                <span><strong>{detalhesProj.revisoes_usadas}</strong> de {detalhesProj.limite_revisoes}</span>
              </div>
              <Barra valor={detalhesProj.revisoes_usadas} max={detalhesProj.limite_revisoes} />
              <div style={{ marginTop: 10 }}>
                <Botao onClick={() => addRevisao(detalhesProj)}>+ Contar 1 Revisão do Cliente</Botao>
              </div>
            </div>

            <div className="lista">
              <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Cliente</span><strong>{detalhesProj.cliente_nome}</strong></div>
              {detalhesProj.link_homologacao && (
                <div className="item" style={{ cursor: 'default' }}>
                  <span className="cresce secundario">Prévia / Homologação</span>
                  <a href={detalhesProj.link_homologacao} target="_blank" rel="noreferrer" className="linha" style={{ gap: 4 }}>
                    Abrir <ExternalLink size={14} />
                  </a>
                </div>
              )}
              {detalhesProj.link_publicado && (
                <div className="item" style={{ cursor: 'default' }}>
                  <span className="cresce secundario">Site Publicado</span>
                  <a href={detalhesProj.link_publicado} target="_blank" rel="noreferrer" className="linha" style={{ gap: 4 }}>
                    Acessar <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <div>
              <p className="pequeno secundario" style={{ marginBottom: 6 }}>Avançar Etapa:</p>
              <div className="linha" style={{ gap: 6, flexWrap: 'wrap' }}>
                {ETAPAS_PROJETO.map(et => (
                  <Botao key={et.id}
                    variante={detalhesProj.etapa === et.id ? 'primario' : 'secundario'}
                    onClick={() => mudarEtapa(detalhesProj, et.id)}>
                    {et.rotulo}
                  </Botao>
                ))}
              </div>
            </div>

            <div className="linha" style={{ gap: 8, marginTop: 8 }}>
              <Botao variante="perigo" onClick={() => { if (confirm('Excluir este projeto?')) excluirProjeto(detalhesProj.id); }}>
                <Trash2 size={14} /> Excluir Projeto
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
