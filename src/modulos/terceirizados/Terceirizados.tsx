import { useState, useMemo } from 'react';
import { UserCog, Plus, Trash2, CheckCircle2, DollarSign, Phone, Mail } from 'lucide-react';
import { Botao, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje, moeda, numero } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente } from '../../lib/tipos';

export interface Prestador {
  id: string;
  nome: string;
  servico: string;
  telefone: string;
  email: string;
  observacoes: string;
  criado_em: string;
}

export interface CustoTerceirizado {
  id: string;
  prestador_id: string;
  prestador_nome: string;
  cliente_id: string | null;
  cliente_nome: string;
  descricao: string;
  valor: number;
  data: string;
  status: 'pendente' | 'pago' | 'reembolsado';
  nota_fiscal: string;
  criado_em: string;
}

const STORAGE_PREST = 'atlas_prestadores';
const STORAGE_CUSTOS = 'atlas_terceirizados';

function carregarPrestadores(): Prestador[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREST) || '[]'); } catch { return []; }
}
function salvarPrestadoresStorage(l: Prestador[]) { localStorage.setItem(STORAGE_PREST, JSON.stringify(l)); }

function carregarCustos(): CustoTerceirizado[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_CUSTOS) || '[]'); } catch { return []; }
}
function salvarCustosStorage(l: CustoTerceirizado[]) { localStorage.setItem(STORAGE_CUSTOS, JSON.stringify(l)); }

export function Terceirizados() {
  const [aba, setAba] = useState<'custos' | 'prestadores'>('custos');
  const [prestadores, setPrestadores] = useState<Prestador[]>(carregarPrestadores);
  const [custos, setCustos] = useState<CustoTerceirizado[]>(carregarCustos);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const avisar = useAvisar();

  // Modais
  const [formPrestAberto, setFormPrestAberto] = useState(false);
  const [formCustoAberto, setFormCustoAberto] = useState(false);

  const [formP, setFormP] = useState({
    nome: '', servico: '', telefone: '', email: '', observacoes: ''
  });

  const [formC, setFormC] = useState({
    prestador_id: '', cliente_id: '', descricao: '', valor: '', data: hoje(), nota_fiscal: ''
  });

  const salvarP = (lista: Prestador[]) => { setPrestadores(lista); salvarPrestadoresStorage(lista); };
  const salvarC = (lista: CustoTerceirizado[]) => { setCustos(lista); salvarCustosStorage(lista); };

  const criarPrestador = () => {
    if (!formP.nome.trim()) { avisar('Nome do parceiro é obrigatório.'); return; }
    const novo: Prestador = {
      id: novoId(),
      nome: formP.nome.trim(),
      servico: formP.servico.trim(),
      telefone: formP.telefone.trim(),
      email: formP.email.trim(),
      observacoes: formP.observacoes.trim(),
      criado_em: new Date().toISOString(),
    };
    salvarP([novo, ...prestadores]);
    setFormPrestAberto(false);
    setFormP({ nome: '', servico: '', telefone: '', email: '', observacoes: '' });
    avisar('Prestador cadastrado com sucesso!');
  };

  const criarCusto = () => {
    if (!formC.prestador_id || !formC.valor) { avisar('Selecione o prestador e o valor.'); return; }
    const prest = prestadores.find(p => p.id === formC.prestador_id);
    const cli = clientes.find(c => c.id === formC.cliente_id);
    const novo: CustoTerceirizado = {
      id: novoId(),
      prestador_id: formC.prestador_id,
      prestador_nome: prest?.nome || 'Prestador',
      cliente_id: formC.cliente_id || null,
      cliente_nome: cli?.nome || 'Geral / Agência',
      descricao: formC.descricao || 'Serviço terceirizado',
      valor: numero(formC.valor),
      data: formC.data,
      status: 'pendente',
      nota_fiscal: formC.nota_fiscal,
      criado_em: new Date().toISOString(),
    };
    salvarC([novo, ...custos]);
    setFormCustoAberto(false);
    setFormC({ prestador_id: '', cliente_id: '', descricao: '', valor: '', data: hoje(), nota_fiscal: '' });
    avisar('Custo terceirizado registrado!');
  };

  const alternarStatus = (c: CustoTerceirizado) => {
    const proxStatus: Record<CustoTerceirizado['status'], CustoTerceirizado['status']> = {
      pendente: 'pago',
      pago: 'reembolsado',
      reembolsado: 'pendente'
    };
    const upd = custos.map(x => x.id === c.id ? { ...x, status: proxStatus[x.status] } : x);
    salvarC(upd);
    avisar(`Status alterado para ${proxStatus[c.status]}`);
  };

  const excluirPrestador = (id: string) => {
    if (confirm('Excluir este prestador?')) {
      salvarP(prestadores.filter(p => p.id !== id));
      avisar('Prestador removido.');
    }
  };

  const excluirCusto = (id: string) => {
    if (confirm('Excluir este custo?')) {
      salvarC(custos.filter(c => c.id !== id));
      avisar('Custo removido.');
    }
  };

  const totalCustosMes = custos.filter(c => c.data.startsWith(hoje().slice(0, 7))).reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <CabecalhoTela
        titulo="Terceirizados & Parceiros"
        icone={<UserCog size={28} strokeWidth={1.6} />}
        subtitulo="Cadastro de designers, desenvolvedores, editores e custos diretos por cliente"
        acoes={
          <div className="linha" style={{ gap: 8 }}>
            {aba === 'custos' ? (
              <Botao variante="primario" onClick={() => setFormCustoAberto(true)}>
                <Plus size={16} /> Lançar Custo
              </Botao>
            ) : (
              <Botao variante="primario" onClick={() => setFormPrestAberto(true)}>
                <Plus size={16} /> Novo Prestador
              </Botao>
            )}
          </div>
        }
      />

      <div className="abas vidro-pilula" style={{ marginBottom: 16, width: 'fit-content' }}>
        <button type="button" className={`aba ${aba === 'custos' ? 'ativa' : ''}`} onClick={() => setAba('custos')}>
          Custos por Cliente ({custos.length})
        </button>
        <button type="button" className={`aba ${aba === 'prestadores' ? 'ativa' : ''}`} onClick={() => setAba('prestadores')}>
          Prestadores Parceiros ({prestadores.length})
        </button>
      </div>

      {aba === 'custos' && (
        <>
          <div className="grade grade-3 igual" style={{ marginBottom: 18 }}>
            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <span className="pequeno secundario">Custos Terceirizados (Mês)</span>
              <p className="num negativo" style={{ fontSize: 26, fontWeight: 300, marginTop: 4 }}>
                {moeda(totalCustosMes)}
              </p>
              <span className="pequeno secundario">Deduzido no lucro real dos clientes</span>
            </div>
            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <span className="pequeno secundario">Pendentes de Pagamento</span>
              <p className="num" style={{ fontSize: 26, fontWeight: 300, marginTop: 4 }}>
                {custos.filter(c => c.status === 'pendente').length}
              </p>
              <span className="pequeno secundario">Contas a pagar da agência</span>
            </div>
            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <span className="pequeno secundario">Parceiros Cadastrados</span>
              <p className="num" style={{ fontSize: 26, fontWeight: 300, marginTop: 4 }}>
                {prestadores.length}
              </p>
              <span className="pequeno secundario">Designers, devs, copywriters</span>
            </div>
          </div>

          {custos.length === 0 ? (
            <Vazio texto="Nenhum custo terceirizado registrado." acao={<Botao variante="primario" onClick={() => setFormCustoAberto(true)}><Plus size={15} /> Lançar Custo</Botao>} />
          ) : (
            <Card>
              <div className="lista">
                {custos.map(c => (
                  <div key={c.id} className="item" style={{ cursor: 'default' }}>
                    <div className="cresce">
                      <div className="linha" style={{ gap: 8, marginBottom: 4 }}>
                        <span className="titulo">{c.descricao}</span>
                        <Chip cor={c.status === 'pago' ? 'ok' : c.status === 'reembolsado' ? 'destaque' : 'atencao'}>
                          {c.status.toUpperCase()}
                        </Chip>
                      </div>
                      <div className="pequeno secundario">
                        Prestador: <strong>{c.prestador_nome}</strong> · Cliente: <strong>{c.cliente_nome}</strong> · {data(c.data)}
                      </div>
                    </div>
                    <div className="linha" style={{ gap: 12 }}>
                      <span className="num" style={{ fontSize: 18, fontWeight: 500 }}>
                        {moeda(c.valor)}
                      </span>
                      <Botao onClick={() => alternarStatus(c)}>
                        {c.status === 'pendente' ? 'Pagar' : c.status === 'pago' ? 'Reembolsado' : 'Reabrir'}
                      </Botao>
                      <button type="button" className="btn btn-fantasma btn-icone" title="Excluir" onClick={() => excluirCusto(c.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {aba === 'prestadores' && (
        <>
          {prestadores.length === 0 ? (
            <Vazio texto="Nenhum prestador parceiro cadastrado." acao={<Botao variante="primario" onClick={() => setFormPrestAberto(true)}><Plus size={15} /> Novo Prestador</Botao>} />
          ) : (
            <Card>
              <div className="lista">
                {prestadores.map(p => (
                  <div key={p.id} className="item" style={{ cursor: 'default' }}>
                    <div className="cresce">
                      <div className="linha" style={{ gap: 8, marginBottom: 4 }}>
                        <span className="titulo">{p.nome}</span>
                        <Chip>{p.servico || 'Parceiro'}</Chip>
                      </div>
                      <div className="pequeno secundario">
                        {p.telefone && <span>WhatsApp: {p.telefone} · </span>}
                        {p.email && <span>E-mail: {p.email}</span>}
                      </div>
                      {p.observacoes && <div className="pequeno secundario" style={{ marginTop: 4 }}>{p.observacoes}</div>}
                    </div>
                    <button type="button" className="btn btn-fantasma btn-icone" title="Excluir" onClick={() => excluirPrestador(p.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* MODAL PRESTADOR */}
      <Modal titulo="Novo Prestador / Parceiro" aberto={formPrestAberto} aoFechar={() => setFormPrestAberto(false)}
        rodape={<Botao variante="primario" onClick={criarPrestador}>Salvar Prestador</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Nome do Prestador *">
            <input className="entrada" value={formP.nome} onChange={e => setFormP(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Lucas Designer, Agência de Edição..." />
          </Campo>
          <Campo rotulo="Especialidade / Serviço">
            <input className="entrada" value={formP.servico} onChange={e => setFormP(f => ({ ...f, servico: e.target.value }))} placeholder="Ex: Designer de Criativos, Editor de Vídeo, Web Developer..." />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Telefone / WhatsApp">
              <input className="entrada" value={formP.telefone} onChange={e => setFormP(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
            </Campo>
            <Campo rotulo="E-mail">
              <input className="entrada" value={formP.email} onChange={e => setFormP(f => ({ ...f, email: e.target.value }))} placeholder="parceiro@email.com" />
            </Campo>
          </div>
          <Campo rotulo="Observações (chave pix, tabela de preços, etc)">
            <textarea className="entrada" rows={2} value={formP.observacoes} onChange={e => setFormP(f => ({ ...f, observacoes: e.target.value }))} />
          </Campo>
        </div>
      </Modal>

      {/* MODAL CUSTO */}
      <Modal titulo="Lançar Custo de Terceirizado" aberto={formCustoAberto} aoFechar={() => setFormCustoAberto(false)}
        rodape={<Botao variante="primario" onClick={criarCusto}>Salvar Custo</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Prestador *">
            <select className="entrada" value={formC.prestador_id} onChange={e => setFormC(f => ({ ...f, prestador_id: e.target.value }))}>
              <option value="">Selecione o prestador...</option>
              {prestadores.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.servico})</option>)}
            </select>
          </Campo>
          <Campo rotulo="Cliente Alocado (para dedução do lucro)">
            <select className="entrada" value={formC.cliente_id} onChange={e => setFormC(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Geral / Custo da Agência</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Valor (R$) *">
              <input className="entrada" type="number" step="0.01" min="0" value={formC.valor} onChange={e => setFormC(f => ({ ...f, valor: e.target.value }))} placeholder="Ex: 350,00" />
            </Campo>
            <Campo rotulo="Data">
              <input className="entrada" type="date" value={formC.data} onChange={e => setFormC(f => ({ ...f, data: e.target.value }))} />
            </Campo>
          </div>
          <Campo rotulo="Descrição do Trabalho">
            <input className="entrada" value={formC.descricao} onChange={e => setFormC(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Pacote de 10 criativos em vídeo para campanha" />
          </Campo>
        </div>
      </Modal>
    </>
  );
}
