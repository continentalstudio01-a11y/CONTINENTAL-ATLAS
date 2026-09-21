import { useState, useMemo } from 'react';
import { KeyRound, Plus, Trash2, Copy, Eye, EyeOff, Lock, Unlock, ShieldCheck } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { novoId } from '../../lib/ids';
import type { Cliente } from '../../lib/tipos';

interface AcessoCofre {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  servico: string;
  usuario: string;
  segredo: string; // senha ou chave
  url: string;
  observacoes: string;
  criado_em: string;
}

function carregarCofre(): AcessoCofre[] {
  try { return JSON.parse(localStorage.getItem('atlas_cofre') || '[]'); } catch { return []; }
}
function salvarCofreStorage(l: AcessoCofre[]) { localStorage.setItem('atlas_cofre', JSON.stringify(l)); }

export function Cofre() {
  const [acessos, setAcessos] = useState<AcessoCofre[]>(carregarCofre);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const avisar = useAvisar();

  const [busca, setBusca] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [visivel, setVisivel] = useState<Record<string, boolean>>({});
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState({
    cliente_id: '', servico: '', usuario: '', segredo: '', url: '', observacoes: ''
  });

  const salvar = (lista: AcessoCofre[]) => { setAcessos(lista); salvarCofreStorage(lista); };

  const filtrados = useMemo(() => {
    let l = acessos;
    if (clienteFiltro) l = l.filter(a => a.cliente_id === clienteFiltro);
    if (busca) {
      const b = busca.toLowerCase();
      l = l.filter(a => a.servico.toLowerCase().includes(b) || a.cliente_nome.toLowerCase().includes(b) || a.usuario.toLowerCase().includes(b));
    }
    return l.sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome));
  }, [acessos, clienteFiltro, busca]);

  const criarAcesso = () => {
    if (!form.cliente_id || !form.servico.trim() || !form.usuario.trim()) {
      avisar('Preencha cliente, serviço e usuário.');
      return;
    }
    const cli = clientes.find(c => c.id === form.cliente_id);
    const novo: AcessoCofre = {
      id: novoId(), cliente_id: form.cliente_id, cliente_nome: cli?.nome ?? '',
      servico: form.servico, usuario: form.usuario, segredo: form.segredo,
      url: form.url, observacoes: form.observacoes, criado_em: new Date().toISOString()
    };
    salvar([novo, ...acessos]);
    setFormAberto(false);
    setForm({ cliente_id: '', servico: '', usuario: '', segredo: '', url: '', observacoes: '' });
    avisar('Acesso salvo no cofre com segurança');
  };

  const alternarVisivel = (id: string) => {
    setVisivel(v => ({ ...v, [id]: !v[id] }));
  };

  const copiar = (texto: string, rotulo: string) => {
    navigator.clipboard?.writeText(texto).then(() => avisar(`${rotulo} copiado!`));
  };

  const excluir = (id: string) => {
    if (confirm('Deseja excluir este acesso do cofre?')) {
      salvar(acessos.filter(a => a.id !== id));
      avisar('Acesso removido');
    }
  };

  return (
    <>
      <CabecalhoTela
        titulo="Cofre de Acessos"
        icone={<KeyRound size={28} strokeWidth={1.6} />}
        subtitulo="Armazenamento seguro de credenciais e senhas dos clientes"
        acoes={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={17} /> Novo Acesso</Botao>}
      />

      <div style={{ marginBottom: 16 }}>
        <Card medio>
          <div className="linha" style={{ gap: 12 }}>
            <ShieldCheck size={22} className="positivo" style={{ flex: 'none' }} />
            <div>
              <p className="titulo" style={{ fontSize: 14 }}>Segurança Local Protegida</p>
              <p className="pequeno secundario">
                Todas as senhas e credenciais cadastradas aqui ficam armazenadas de forma restrita e isolada no cofre do sistema Continental Atlas.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="linha" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="entrada" placeholder="Buscar por serviço, cliente ou login..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select className="entrada" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <Vazio texto="Nenhum acesso cadastrado no cofre." acao={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={15} /> Novo Acesso</Botao>} />
      ) : (
        <Card>
          <div className="lista">
            {filtrados.map(a => {
              const estaVisivel = !!visivel[a.id];
              return (
                <div key={a.id} className="item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                  <div className="cresce">
                    <div className="linha" style={{ gap: 8, marginBottom: 4 }}>
                      <span className="titulo">{a.servico}</span>
                      <Chip>{a.cliente_nome}</Chip>
                    </div>
                    <div className="linha" style={{ gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                      <div className="linha" style={{ gap: 4 }}>
                        <span className="pequeno secundario">Login:</span>
                        <strong className="pequeno">{a.usuario}</strong>
                        <BotaoIcone rotulo="Copiar usuário" onClick={() => copiar(a.usuario, 'Usuário')}><Copy size={13} /></BotaoIcone>
                      </div>
                      <div className="linha" style={{ gap: 4 }}>
                        <span className="pequeno secundario">Senha:</span>
                        <strong className="pequeno num" style={{ fontFamily: estaVisivel ? 'inherit' : 'monospace' }}>
                          {estaVisivel ? a.segredo : '••••••••••••'}
                        </strong>
                        <BotaoIcone rotulo={estaVisivel ? 'Ocultar senha' : 'Ver senha'} onClick={() => alternarVisivel(a.id)}>
                          {estaVisivel ? <EyeOff size={13} /> : <Eye size={13} />}
                        </BotaoIcone>
                        <BotaoIcone rotulo="Copiar senha" onClick={() => copiar(a.segredo, 'Senha')}><Copy size={13} /></BotaoIcone>
                      </div>
                    </div>
                    {a.url && (
                      <div className="pequeno secundario" style={{ marginTop: 4 }}>
                        URL: <a href={a.url.startsWith('http') ? a.url : `https://${a.url}`} target="_blank" rel="noreferrer">{a.url}</a>
                      </div>
                    )}
                    {a.observacoes && <p className="pequeno secundario" style={{ marginTop: 4 }}>{a.observacoes}</p>}
                  </div>
                  <BotaoIcone rotulo="Excluir" onClick={() => excluir(a.id)}><Trash2 size={15} /></BotaoIcone>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modal Criar */}
      <Modal titulo="Novo Acesso no Cofre" aberto={formAberto} aoFechar={() => setFormAberto(false)}
        rodape={<Botao variante="primario" onClick={criarAcesso}>Guardar no Cofre</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Serviço / Plataforma *">
            <input className="entrada" value={form.servico} onChange={e => setForm(f => ({ ...f, servico: e.target.value }))} placeholder="Ex: Meta Business Manager, WordPress, Google Ads, Hospedagem..." autoFocus />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Usuário / E-mail *">
              <input className="entrada" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} placeholder="usuario@email.com" />
            </Campo>
            <Campo rotulo="Senha / Chave *">
              <input className="entrada" type="text" value={form.segredo} onChange={e => setForm(f => ({ ...f, segredo: e.target.value }))} placeholder="Senha do acesso" />
            </Campo>
          </div>
          <Campo rotulo="Link de Acesso (URL)">
            <input className="entrada" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </Campo>
          <Campo rotulo="Observações">
            <textarea className="entrada" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="PIN de 2 etapas, código reserva, etc..." />
          </Campo>
        </div>
      </Modal>
    </>
  );
}
