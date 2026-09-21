import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Plus, ImageUp, Fingerprint, Lock, RefreshCw, Download, Upload, LogOut } from 'lucide-react';
import { Abas, Botao, CabecalhoTela, Campo, Card, Chip, Marcador, Modal, useAvisar } from '../../componentes/ui';
import { definirCorretor, definirFundo, definirTema, useConfig, useLista, usePreferencias, useStatusSync, type ModoFundo, type Tema } from '../../lib/hooks';
import { salvar } from '../../lib/repo';
import { ID_CONFIG } from '../../lib/sementes';
import { dataCurta, diaDe, horaDe, moeda, numero } from '../../lib/formato';
import { baixarBackupExcel, baixarBackupJSON, restaurarBackup } from '../../lib/backup';
import { rotinaDiaria } from '../../lib/automacoes';
import { sincronizar, forcarSincronizacaoCompleta, testarConexaoSupabase } from '../../lib/sync';
import { supabase, SUPABASE_URL_ATUAL } from '../../lib/supabase';
import { db } from '../../lib/db';
import { cadastrarDigital, definirPin, digitalDisponivel, removerBloqueio, temDigital, temPin } from '../../lib/bloqueio';
import { ModalPix } from '../cobrancas/componentes';
import { Importador } from './Importador';
import { ModelosMensagem } from './ModelosMensagem';
import type { Configuracao, Pacote, Servico } from '../../lib/tipos';

type Aba = 'empresa' | 'pix' | 'aparencia' | 'seguranca' | 'catalogo' | 'financeiro' | 'mensagens' | 'dados';
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'empresa', rotulo: 'Empresa' }, { id: 'pix', rotulo: 'Pix' }, { id: 'aparencia', rotulo: 'Aparência' },
  { id: 'seguranca', rotulo: 'Segurança' }, { id: 'catalogo', rotulo: 'Catálogo' }, { id: 'financeiro', rotulo: 'Financeiro e MEI' },
  { id: 'mensagens', rotulo: '💬 Mensagens' }, { id: 'dados', rotulo: 'Dados e Backup' }
];

function useRascunho() {
  const cfg = useConfig();
  const [r, setR] = useState<Partial<Configuracao>>({});
  useEffect(() => { if (cfg) setR(cfg); }, [cfg?.atualizado_em, cfg?.logo_url, cfg?.empresa_nome]);
  const set = <K extends keyof Configuracao>(k: K, v: Configuracao[K]) => setR((p) => ({ ...p, [k]: v }));
  const gravar = async (campos: Partial<Configuracao>) => {
    // 1) Grava no localStorage como backup persistente imediato
    try {
      const atualBackup = JSON.parse(localStorage.getItem('atlas_config_empresa') || '{}');
      localStorage.setItem('atlas_config_empresa', JSON.stringify({ ...atualBackup, ...campos, id: ID_CONFIG }));
    } catch {}
    // 2) Grava no banco IndexedDB
    return salvar<Configuracao>('configuracoes', { id: ID_CONFIG, ...campos });
  };
  return { r, set, gravar };
}

export function Configuracoes() {
  const [params, setParams] = useSearchParams();
  const aba = (params.get('aba') as Aba) || 'empresa';
  return (
    <>
      <CabecalhoTela titulo="Configurações" icone={<Settings size={28} strokeWidth={1.6} />} />
      <div style={{ marginBottom: 16 }}>
        <Abas<Aba> abas={ABAS} ativa={aba} aoMudar={(a) => setParams({ aba: a }, { replace: true })} />
      </div>
      {aba === 'empresa' && <Empresa />}
      {aba === 'pix' && <Pix />}
      {aba === 'aparencia' && <Aparencia />}
      {aba === 'seguranca' && <Seguranca />}
      {aba === 'catalogo' && <Catalogo />}
      {aba === 'financeiro' && <FinanceiroMei />}
      {aba === 'mensagens' && <ModelosMensagem />}
      {aba === 'dados' && <Dados />}
    </>
  );
}

function Empresa() {
  const { r, set, gravar } = useRascunho();
  const avisar = useAvisar();
  const escolherLogo = (f?: File) => {
    if (!f) return;
    const img = new Image();
    img.onload = async () => {
      const lado = 256, cv = document.createElement('canvas');
      const escala = Math.min(lado / img.width, lado / img.height);
      cv.width = Math.round(img.width * escala); cv.height = Math.round(img.height * escala);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      const dataUrl = cv.toDataURL('image/png');
      set('logo_url', dataUrl);
      // Auto-salva imediatamente para nunca perder a logo!
      await gravar({ logo_url: dataUrl });
      avisar('Logo salvo com sucesso!');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  const removerLogo = async () => {
    set('logo_url', null);
    await gravar({ logo_url: null });
    avisar('Logo removido');
  };

  return (
    <Card titulo="Dados da Empresa">
      <div className="grade-form">
        <Campo rotulo="Nome da empresa"><input className="entrada" value={r.empresa_nome ?? ''} onChange={(e) => set('empresa_nome', e.target.value)} /></Campo>
        <Campo rotulo="Seu nome"><input className="entrada" value={r.responsavel_nome ?? ''} onChange={(e) => set('responsavel_nome', e.target.value)} placeholder="Aparece na saudação do Painel" /></Campo>
        <Campo rotulo="CNPJ"><input className="entrada" value={r.cnpj ?? ''} onChange={(e) => set('cnpj', e.target.value)} /></Campo>
        <Campo rotulo="Telefone"><input className="entrada" value={r.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Campo>
        <Campo rotulo="E-mail"><input className="entrada" type="email" value={r.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Campo>
        <Campo rotulo="Endereço"><input className="entrada" value={r.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} /></Campo>
        <div className="inteiro linha" style={{ gap: 16, alignItems: 'center', marginTop: 6 }}>
          {r.logo_url ? <img src={r.logo_url} alt="Logo da Empresa" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 14, background: 'var(--campo)', border: '1px solid var(--vidro-borda)' }} /> : <span className="secundario pequeno">Sem logotipo cadastrado.</span>}
          <label className="btn btn-secundario vidro-pilula" style={{ cursor: 'pointer' }}><ImageUp size={16} /> Escolher logo
            <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" hidden onChange={(e) => escolherLogo(e.target.files?.[0])} />
          </label>
          {r.logo_url && <Botao variante="fantasma" onClick={removerLogo}>Remover logo</Botao>}
        </div>
      </div>
      <div className="modal-rodape" style={{ marginTop: 16 }}>
        <Botao variante="primario" onClick={async () => {
          await gravar({
            empresa_nome: r.empresa_nome,
            responsavel_nome: r.responsavel_nome,
            cnpj: r.cnpj,
            telefone: r.telefone,
            email: r.email,
            endereco: r.endereco,
            logo_url: r.logo_url ?? null
          });
          avisar('Dados da empresa salvos com sucesso!');
        }}>Salvar Alterações</Botao>
      </div>
    </Card>
  );
}

import { carregarChavesPix, salvarChavesPix, adicionarChavePix, removerChavePix, definirComoPadrao, type ChavePixRegistro } from '../../lib/chavesPix';

function Pix() {
  const { r, set, gravar } = useRascunho();
  const avisar = useAvisar();
  const [teste, setTeste] = useState(false);
  const [chaves, setChaves] = useState<ChavePixRegistro[]>(carregarChavesPix);
  const [modalNova, setModalNova] = useState(false);
  const [formNova, setFormNova] = useState({
    apelido: '',
    tipo: 'cnpj' as ChavePixRegistro['tipo'],
    chave: '',
    nome_recebedor: r.pix_nome || r.empresa_nome || '',
    cidade: r.pix_cidade || 'SAO PAULO',
    padrao: false
  });

  const atualizarChaves = () => setChaves(carregarChavesPix());

  const salvarNovaChave = () => {
    if (!formNova.apelido.trim() || !formNova.chave.trim() || !formNova.nome_recebedor.trim()) {
      avisar('Preencha apelido, chave e nome do recebedor.');
      return;
    }
    adicionarChavePix(formNova);
    atualizarChaves();
    setModalNova(false);
    setFormNova({
      apelido: '',
      tipo: 'cnpj',
      chave: '',
      nome_recebedor: r.pix_nome || r.empresa_nome || '',
      cidade: r.pix_cidade || 'SAO PAULO',
      padrao: false
    });
    avisar('Chave Pix cadastrada com sucesso!');
  };

  const tornarPadrao = (id: string) => {
    definirComoPadrao(id);
    atualizarChaves();
    const c = chaves.find(x => x.id === id);
    if (c) {
      gravar({ pix_chave: c.chave, pix_nome: c.nome_recebedor, pix_cidade: c.cidade });
    }
    avisar('Chave padrão atualizada!');
  };

  const excluirChave = (id: string) => {
    removerChavePix(id);
    atualizarChaves();
    avisar('Chave Pix removida');
  };

  return (
    <div className="coluna" style={{ gap: 18 }}>
      <Card titulo="Chave Pix Padrão do Sistema">
        <p className="secundario" style={{ marginBottom: 16 }}>
          Chave padrão utilizada para gerar os QR Codes automáticos das cobranças de mensalidades.
        </p>
        <div className="grade-form">
          <Campo rotulo="Chave Pix Principal" inteiro>
            <input className="entrada" value={r.pix_chave ?? ''} onChange={(e) => set('pix_chave', e.target.value)} placeholder="E-mail, CPF, CNPJ, +55... ou chave aleatória" />
          </Campo>
          <Campo rotulo="Nome do recebedor"><input className="entrada" value={r.pix_nome ?? ''} onChange={(e) => set('pix_nome', e.target.value)} maxLength={25} /></Campo>
          <Campo rotulo="Cidade"><input className="entrada" value={r.pix_cidade ?? ''} onChange={(e) => set('pix_cidade', e.target.value)} maxLength={15} /></Campo>
        </div>
        <div className="modal-rodape">
          <Botao onClick={() => setTeste(true)} disabled={!r.pix_chave}>Testar com R$ 1,00</Botao>
          <Botao variante="primario" onClick={async () => { await gravar({ pix_chave: r.pix_chave?.trim(), pix_nome: r.pix_nome?.trim(), pix_cidade: r.pix_cidade?.trim() }); avisar('Pix salvo'); }}>Salvar Chave Padrão</Botao>
        </div>
      </Card>

      <Card titulo="Catálogo de Chaves Pix Cadastradas" acao={<Botao icone={<Plus size={15} />} onClick={() => setModalNova(true)}>Adicionar Nova Chave</Botao>}>
        <p className="secundario" style={{ marginBottom: 14 }}>
          Cadastre suas diferentes contas bancárias e chaves Pix (Nubank, Inter, Itaú, MEI, Pessoal) para escolher em qual conta receber na hora de gerar a cobrança.
        </p>
        {chaves.length === 0 ? (
          <div className="vazio">
            <p>Nenhuma chave cadastrada no catálogo. Adicione suas contas bancárias.</p>
          </div>
        ) : (
          <div className="lista">
            {chaves.map(c => (
              <div key={c.id} className="item" style={{ cursor: 'default' }}>
                <div className="cresce">
                  <div className="linha" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="titulo">{c.apelido}</span>
                    <Chip>{c.tipo.toUpperCase()}</Chip>
                    {c.padrao && <Chip cor="ok">Padrão</Chip>}
                  </div>
                  <div className="pequeno secundario">
                    Chave: <code>{c.chave}</code> · Titular: <strong>{c.nome_recebedor}</strong> ({c.cidade})
                  </div>
                </div>
                <div className="linha" style={{ gap: 8 }}>
                  {!c.padrao && (
                    <Botao onClick={() => tornarPadrao(c.id)}>Usar como Padrão</Botao>
                  )}
                  <Botao variante="perigo" onClick={() => excluirChave(c.id)}>Remover</Botao>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal Nova Chave Pix */}
      <Modal titulo="Cadastrar Nova Chave Pix" aberto={modalNova} aoFechar={() => setModalNova(false)}
        rodape={<Botao variante="primario" onClick={salvarNovaChave}>Cadastrar Chave</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Apelido da Conta / Chave *">
            <input className="entrada" placeholder="Ex: Nubank Agência, Inter MEI, Pix Pessoal" value={formNova.apelido} onChange={e => setFormNova(prev => ({ ...prev, apelido: e.target.value }))} autoFocus />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Tipo da Chave">
              <select className="entrada" value={formNova.tipo} onChange={e => setFormNova(prev => ({ ...prev, tipo: e.target.value as ChavePixRegistro['tipo'] }))}>
                <option value="cnpj">CNPJ</option>
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="celular">Celular (+55...)</option>
                <option value="aleatoria">Chave Aleatória (EVP)</option>
              </select>
            </Campo>
            <Campo rotulo="Chave Pix *">
              <input className="entrada" placeholder="Digite a chave..." value={formNova.chave} onChange={e => setFormNova(prev => ({ ...prev, chave: e.target.value }))} />
            </Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Nome do Titular / Recebedor *">
              <input className="entrada" maxLength={25} value={formNova.nome_recebedor} onChange={e => setFormNova(prev => ({ ...prev, nome_recebedor: e.target.value }))} />
            </Campo>
            <Campo rotulo="Cidade *">
              <input className="entrada" maxLength={15} value={formNova.cidade} onChange={e => setFormNova(prev => ({ ...prev, cidade: e.target.value }))} />
            </Campo>
          </div>
          <label className="marcador" style={{ marginTop: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={formNova.padrao} onChange={e => setFormNova(prev => ({ ...prev, padrao: e.target.checked }))} />
            <span>Definir esta chave como padrão do sistema</span>
          </label>
        </div>
      </Modal>

      <ModalPix aberto={teste} aoFechar={() => setTeste(false)} valor={1} txid="TESTEATLAS" titulo="Teste do Pix" />
    </div>
  );
}

const TEMAS: { id: Tema; nome: string; fundo: string; primario: string }[] = [
  { id: 'claro', nome: 'Claro', fundo: '#E6EDF6', primario: '#0F1B31' },
  { id: 'escuro', nome: 'Escuro', fundo: '#060D1C', primario: '#E6EDF6' },
  { id: 'azul', nome: 'Azul', fundo: '#D7E6FB', primario: '#0B3A8C' },
  { id: 'vermelho', nome: 'Vermelho', fundo: '#F6E4E6', primario: '#7A0F1B' }
];

function Aparencia() {
  const { tema, fundo, corretor } = usePreferencias();
  const avisar = useAvisar();
  const [textoTeste, setTextoTeste] = useState('ola dr roberto, temos uma reuniao as 15:30 para ver seu orcamento');

  return (
    <div className="coluna" style={{ gap: 18 }}>
      <Card titulo="Tema">
        <div className="grade grade-4">
          {TEMAS.map((t) => (
            <button key={t.id} onClick={() => definirTema(t.id)} className="card-medio" style={{ cursor: 'pointer', textAlign: 'left', background: t.fundo, color: t.primario, border: tema === t.id ? `2px solid ${t.primario}` : '1px solid var(--vidro-borda)' }}>
              <span style={{ display: 'block', width: 34, height: 34, borderRadius: '50%', background: t.primario, marginBottom: 26 }} />
              <span style={{ fontWeight: 500 }}>{t.nome}</span>
            </button>
          ))}
        </div>
        <p className="pequeno secundario" style={{ marginTop: 12 }}>O tema fica salvo neste aparelho.</p>
      </Card>

      <Card titulo="Corretor de Texto & Ortografia">
        <p className="secundario" style={{ marginBottom: 14 }}>
          Ativa ou desativa a correção ortográfica automática em português (pt-BR) e o assistente de aprimoramento de escrita em todos os campos de texto do sistema (WhatsApp, reuniões, propostas, atas, contratos e mensagens de leads).
        </p>
        <div className="linha" style={{ gap: 12, marginBottom: 16 }}>
          <Marcador
            rotulo={corretor ? "Corretor de texto ATIVADO em todo o sistema" : "Corretor de texto DESATIVADO"}
            marcado={corretor}
            aoMudar={(v) => {
              definirCorretor(v);
              avisar(v ? 'Corretor de texto ativado!' : 'Corretor de texto desativado');
            }}
          />
        </div>
        <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
          <p className="pequeno secundario" style={{ marginBottom: 8, fontWeight: 500 }}>
            Campo de Teste do Corretor:
          </p>
          <textarea
            className="entrada"
            rows={3}
            value={textoTeste}
            onChange={(e) => setTextoTeste(e.target.value)}
            spellCheck={corretor}
            lang="pt-BR"
            placeholder="Digite palavras para testar o corretor..."
          />
          <p className="pequeno secundario" style={{ marginTop: 6, fontSize: 12 }}>
            {corretor
              ? "✨ O corretor está ativo: sublinhado vermelho nativo e formatação inteligente de português."
              : "⚪ Corretor desativado neste aparelho."}
          </p>
        </div>
      </Card>

      <Card titulo="Fundo Animado">
        <Abas<ModoFundo> abas={[{ id: 'ligado', rotulo: 'Ligado' }, { id: 'economia', rotulo: 'Economia' }, { id: 'desligado', rotulo: 'Desligado' }]} ativa={fundo} aoMudar={definirFundo} />
        <p className="pequeno secundario" style={{ marginTop: 12 }}>Economia reduz o movimento e o desfoque para poupar bateria no celular. Desligado deixa o globo parado.</p>
      </Card>
    </div>
  );
}

function Seguranca() {
  const avisar = useAvisar();
  const [modal, setModal] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [digital, setDigital] = useState(false);
  const [, forcar] = useState(0);
  useEffect(() => { digitalDisponivel().then(setDigital); }, []);
  const gravarPin = async () => {
    if (!/^\d{4,6}$/.test(p1)) { setErro('Use de 4 a 6 números.'); return; }
    if (p1 !== p2) { setErro('Os dois PINs não são iguais.'); return; }
    await definirPin(p1);
    setModal(false); setP1(''); setP2(''); setErro(null); forcar((n) => n + 1);
    avisar('PIN definido');
  };
  return (
    <Card titulo="Bloqueio do App">
      <p className="secundario" style={{ marginBottom: 16 }}>Pede PIN ou digital ao abrir o Atlas e depois de 5 minutos em segundo plano. Vale só para este aparelho.</p>
      <div className="linha">
        <Chip cor={temPin() ? 'ok' : undefined}><Lock size={14} /> {temPin() ? 'PIN ativo' : 'Sem PIN'}</Chip>
        {temDigital() && <Chip cor="ok"><Fingerprint size={14} /> Digital ativa</Chip>}
      </div>
      <div className="modal-rodape" style={{ justifyContent: 'flex-start' }}>
        <Botao variante="primario" onClick={() => setModal(true)}>{temPin() ? 'Trocar PIN' : 'Definir PIN'}</Botao>
        {digital && temPin() && !temDigital() && <Botao icone={<Fingerprint size={16} />} onClick={async () => { if (await cadastrarDigital()) { forcar((n) => n + 1); avisar('Digital cadastrada'); } }}>Usar digital</Botao>}
        {temPin() && <Botao variante="fantasma" onClick={() => { if (window.confirm('Remover o bloqueio deste aparelho?')) { removerBloqueio(); forcar((n) => n + 1); } }}>Remover bloqueio</Botao>}
      </div>
      {!digital && <p className="pequeno secundario" style={{ marginTop: 12 }}>A digital aparece aqui quando o aparelho tem leitor biométrico e o Atlas está aberto como app instalado ou pelo endereço seguro (https).</p>}
      <Modal titulo="Definir PIN" aberto={modal} aoFechar={() => setModal(false)}
        rodape={<><Botao variante="fantasma" onClick={() => setModal(false)}>Cancelar</Botao><Botao variante="primario" onClick={gravarPin}>Salvar PIN</Botao></>}>
        <div className="grade-form">
          <Campo rotulo="Novo PIN (4 a 6 números)" erro={erro}><input className="entrada" type="password" inputMode="numeric" maxLength={6} value={p1} onChange={(e) => setP1(e.target.value.replace(/\D/g, ''))} autoFocus /></Campo>
          <Campo rotulo="Repita o PIN"><input className="entrada" type="password" inputMode="numeric" maxLength={6} value={p2} onChange={(e) => setP2(e.target.value.replace(/\D/g, ''))} /></Campo>
        </div>
      </Modal>
    </Card>
  );
}

function Catalogo() {
  const servicos = useLista<Servico>('servicos') ?? [];
  const pacotes = useLista<Pacote>('pacotes') ?? [];
  const avisar = useAvisar();
  const [s, setS] = useState<Partial<Servico> | null>(null);
  const [p, setP] = useState<Partial<Pacote> | null>(null);
  const nomeServ = new Map(servicos.map((x) => [x.id, x.nome]));
  const gravarServico = async () => {
    if (!s?.nome?.trim()) return;
    await salvar<Servico>('servicos', { chave: 'outro', descricao: '', tipo_cobranca_padrao: 'mensal', ativo: true, ...s, nome: s.nome.trim(), preco_base: Number(s.preco_base) || 0 });
    avisar('Serviço salvo'); setS(null);
  };
  const gravarPacote = async () => {
    if (!p?.nome?.trim() || !p.itens?.length) { avisar('Dê um nome e escolha ao menos um serviço.'); return; }
    await salvar<Pacote>('pacotes', { descricao: '', tipo_cobranca: 'mensal', ativo: true, ...p, nome: p.nome.trim(), preco_total: Number(p.preco_total) || p.itens.reduce((a, i) => a + i.valor, 0) });
    avisar('Pacote salvo'); setP(null);
  };
  const alternarItem = (servico_id: string, marcado: boolean) => {
    if (!p) return;
    const itens = marcado ? [...(p.itens ?? []), { servico_id, valor: servicos.find((x) => x.id === servico_id)?.preco_base ?? 0 }] : (p.itens ?? []).filter((i) => i.servico_id !== servico_id);
    setP({ ...p, itens, preco_total: itens.reduce((a, i) => a + i.valor, 0) });
  };
  return (
    <div className="coluna" style={{ gap: 18 }}>
      <Card titulo="Serviços" acao={<Botao icone={<Plus size={16} />} onClick={() => setS({})}>Novo serviço</Botao>}>
        <div className="lista">
          {servicos.map((x) => (
            <button key={x.id} className="item" onClick={() => setS(x)}>
              <div className="cresce"><div className="titulo">{x.nome}</div><div className="pequeno secundario">{x.tipo_cobranca_padrao === 'mensal' ? 'Mensal Fixo' : 'Pacote'}{x.preco_base ? `, a partir de ${moeda(x.preco_base)}` : ', preço-base não definido'}</div></div>
              {!x.ativo && <Chip>Inativo</Chip>}
            </button>
          ))}
        </div>
      </Card>
      <Card titulo="Pacotes" acao={<Botao icone={<Plus size={16} />} onClick={() => setP({ itens: [] })}>Novo pacote</Botao>}>
        {!pacotes.length ? <p className="secundario">Monte combinações de serviços com preço fechado. Elas serão usadas nas propostas (Fase 2).</p> : (
          <div className="lista">
            {pacotes.map((x) => (
              <button key={x.id} className="item" onClick={() => setP(x)}>
                <div className="cresce"><div className="titulo">{x.nome}</div><div className="pequeno secundario">{x.itens.map((i) => nomeServ.get(i.servico_id)).join(', ')}</div></div>
                <span className="num">{moeda(x.preco_total)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Modal titulo={s?.id ? 'Editar Serviço' : 'Novo Serviço'} aberto={!!s} aoFechar={() => setS(null)}
        rodape={<><Botao variante="fantasma" onClick={() => setS(null)}>Cancelar</Botao><Botao variante="primario" onClick={gravarServico}>Salvar serviço</Botao></>}>
        {s && <div className="grade-form">
          <Campo rotulo="Nome" inteiro><input className="entrada" value={s.nome ?? ''} onChange={(e) => setS({ ...s, nome: e.target.value })} /></Campo>
          <Campo rotulo="Cobrança padrão"><select className="entrada" value={s.tipo_cobranca_padrao ?? 'mensal'} onChange={(e) => setS({ ...s, tipo_cobranca_padrao: e.target.value as Servico['tipo_cobranca_padrao'] })}><option value="mensal">Mensal Fixo</option><option value="pacote">Pacote</option></select></Campo>
          <Campo rotulo="Preço-base"><input className="entrada" type="number" min="0" step="0.01" value={s.preco_base || ''} onChange={(e) => setS({ ...s, preco_base: Number(e.target.value) })} /></Campo>
          <Campo rotulo="Descrição" inteiro><textarea className="entrada" value={s.descricao ?? ''} onChange={(e) => setS({ ...s, descricao: e.target.value })} placeholder="Usada nas propostas e contratos" /></Campo>
          <div className="inteiro"><Marcador rotulo="Serviço ativo" marcado={s.ativo !== false} aoMudar={(v) => setS({ ...s, ativo: v })} /></div>
        </div>}
      </Modal>
      <Modal titulo={p?.id ? 'Editar Pacote' : 'Novo Pacote'} aberto={!!p} aoFechar={() => setP(null)}
        rodape={<><Botao variante="fantasma" onClick={() => setP(null)}>Cancelar</Botao><Botao variante="primario" onClick={gravarPacote}>Salvar pacote</Botao></>}>
        {p && <div className="grade-form">
          <Campo rotulo="Nome do pacote" inteiro><input className="entrada" value={p.nome ?? ''} onChange={(e) => setP({ ...p, nome: e.target.value })} placeholder="Ex.: Presença Completa" /></Campo>
          <div className="inteiro">{servicos.filter((x) => x.ativo).map((x) => <Marcador key={x.id} rotulo={x.nome} marcado={!!p.itens?.some((i) => i.servico_id === x.id)} aoMudar={(v) => alternarItem(x.id, v)} />)}</div>
          <Campo rotulo="Cobrança"><select className="entrada" value={p.tipo_cobranca ?? 'mensal'} onChange={(e) => setP({ ...p, tipo_cobranca: e.target.value as Pacote['tipo_cobranca'] })}><option value="mensal">Mensal Fixo</option><option value="pacote">Pacote</option></select></Campo>
          <Campo rotulo="Preço do pacote"><input className="entrada" type="number" min="0" step="0.01" value={p.preco_total || ''} onChange={(e) => setP({ ...p, preco_total: Number(e.target.value) })} /></Campo>
          <Campo rotulo="Descrição" inteiro><textarea className="entrada" value={p.descricao ?? ''} onChange={(e) => setP({ ...p, descricao: e.target.value })} /></Campo>
        </div>}
      </Modal>
    </div>
  );
}

function FinanceiroMei() {
  const { r, set, gravar } = useRascunho();
  const avisar = useAvisar();
  return (
    <Card titulo="Financeiro e MEI">
      <div className="grade-form">
        <Campo rotulo="Valor da sua hora (para o lucro por cliente)"><input className="entrada" type="number" min="0" step="0.01" value={r.valor_hora || ''} onChange={(e) => set('valor_hora', Number(e.target.value))} /></Campo>
        <div className="inteiro"><Marcador rotulo="Sou MEI (lembretes do DAS e da declaração anual, e limite de faturamento)" marcado={!!r.mei} aoMudar={(v) => set('mei', v)} /></div>
        {r.mei && <Campo rotulo="Limite anual do MEI (confira o valor vigente)"><input className="entrada" type="number" min="0" step="0.01" value={r.limite_mei || ''} onChange={(e) => set('limite_mei', Number(e.target.value))} /></Campo>}
        <Campo rotulo="Multa padrão para novos clientes (%)"><input className="entrada" type="number" min="0" step="0.1" value={r.multa_padrao ?? 2} onChange={(e) => set('multa_padrao', Number(e.target.value))} /></Campo>
        <Campo rotulo="Juros padrão ao mês (%)"><input className="entrada" type="number" min="0" step="0.1" value={r.juros_padrao ?? 1} onChange={(e) => set('juros_padrao', Number(e.target.value))} /></Campo>
      </div>
      <div className="modal-rodape"><Botao variante="primario" onClick={async () => { await gravar({ valor_hora: r.valor_hora, mei: r.mei, limite_mei: numero(r.limite_mei ?? 0), multa_padrao: r.multa_padrao, juros_padrao: r.juros_padrao }); avisar('Configurações salvas'); }}>Salvar</Botao></div>
    </Card>
  );
}


function Dados() {
  const s = useStatusSync();
  const avisar = useAvisar();
  const [email, setEmail] = useState<string | null>(null);

  // Estado do painel de diagnóstico
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{
    ok: boolean; latenciaMs: number; usuario: string | null;
    totalClientesNuvem: number; detalhes?: string; erro?: string;
  } | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [resultadoBaixar, setResultadoBaixar] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [s.sessaoAtiva]);

  const testar = async () => {
    setTestando(true);
    setResultadoTeste(null);
    const r = await testarConexaoSupabase();
    setResultadoTeste(r);
    setTestando(false);
  };

  const baixarDaNuvem = async () => {
    setBaixando(true);
    setResultadoBaixar(null);
    const r = await forcarSincronizacaoCompleta();
    setBaixando(false);
    if (r.sucesso) {
      setResultadoBaixar(`✅ ${r.total} registros baixados com sucesso da nuvem!`);
      avisar(`${r.total} registros sincronizados da nuvem`);
    } else {
      setResultadoBaixar(`❌ Erro: ${r.erro}`);
    }
  };

  const restaurar = async (f?: File) => {
    if (!f || !window.confirm('Restaurar este backup? Os registros do arquivo que forem mais novos substituem os atuais.')) return;
    try { avisar(`${await restaurarBackup(f)} registros restaurados`); } catch (e: any) { avisar(e.message); }
  };

  const sair = async () => {
    if (s.pendentes && !window.confirm('Ainda há alterações não enviadas. Sair mesmo assim?')) return;
    await supabase?.auth.signOut();
    await db.delete();
    location.reload();
  };

  return (
    <div className="coluna" style={{ gap: 18 }}>

      {/* ============ DIAGNÓSTICO SUPABASE ============ */}
      <Card titulo="☁️ Status da Conexão com o Banco (Supabase)">
        <div className="coluna" style={{ gap: 12 }}>

          {/* Indicador visual de status */}
          <div className="linha" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
              background: s.sessaoAtiva && s.online ? 'var(--ok)' : s.erro ? 'var(--erro)' : 'var(--atencao)',
              boxShadow: s.sessaoAtiva && s.online ? '0 0 6px var(--ok)' : 'none'
            }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {s.sessaoAtiva && s.online ? '🟢 Banco Conectado e Ativo'
                : s.sessaoAtiva && !s.online ? '🟡 Conta Ativa — Sem Internet'
                : '🔴 Não Logado — Dados Locais Apenas'}
            </span>
          </div>

          {/* Detalhes técnicos */}
          <div className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
            <div><span className="secundario">Servidor:</span> <strong style={{ wordBreak: 'break-all' }}>{SUPABASE_URL_ATUAL}</strong></div>
            <div><span className="secundario">Conta logada:</span> <strong>{email || s.emailUsuario || '—'}</strong></div>
            <div><span className="secundario">Sessão ativa:</span> <strong>{s.sessaoAtiva ? 'Sim ✓' : 'Não — entre com sua conta'}</strong></div>
            {s.ultimo && <div><span className="secundario">Último sync:</span> <strong>{dataCurta(diaDe(s.ultimo))} às {horaDe(s.ultimo)}</strong></div>}
            {s.pendentes > 0 && <div><span className="secundario">Pendências:</span> <strong style={{ color: 'var(--atencao)' }}>{s.pendentes} alterações aguardando envio</strong></div>}
            {s.erro && <div><span className="secundario">Erro:</span> <strong style={{ color: 'var(--erro)' }}>{s.erro}</strong></div>}
          </div>

          {/* Resultado do teste */}
          {resultadoTeste && (
            <div className="vidro-painel" style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 13,
              borderLeft: `3px solid ${resultadoTeste.ok ? 'var(--ok)' : 'var(--erro)'}`
            }}>
              {resultadoTeste.ok ? (
                <>
                  <div>✅ <strong>Banco respondendo!</strong> Latência: <strong>{resultadoTeste.latenciaMs}ms</strong></div>
                  <div>👤 Usuário: <strong>{resultadoTeste.usuario || '—'}</strong></div>
                  <div>🗃️ Clientes na nuvem: <strong>{resultadoTeste.totalClientesNuvem}</strong></div>
                </>
              ) : (
                <div>❌ <strong>Falha na conexão:</strong> {resultadoTeste.erro}</div>
              )}
            </div>
          )}

          {/* Resultado do download forçado */}
          {resultadoBaixar && (
            <div className="vidro-painel" style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 13,
              borderLeft: `3px solid ${resultadoBaixar.startsWith('✅') ? 'var(--ok)' : 'var(--erro)'}`
            }}>
              {resultadoBaixar}
            </div>
          )}

          {/* Botões de ação */}
          <div className="linha" style={{ flexWrap: 'wrap', gap: 8 }}>
            <Botao
              icone={<RefreshCw size={15} />}
              onClick={testar}
              disabled={testando}
            >
              {testando ? 'Testando conexão...' : 'Testar Conexão Agora'}
            </Botao>

            {s.sessaoAtiva && (
              <>
                <Botao
                  icone={<RefreshCw size={15} />}
                  onClick={() => sincronizar()}
                  disabled={s.sincronizando}
                >
                  {s.sincronizando ? 'Sincronizando...' : 'Sincronizar Agora'}
                </Botao>
                <Botao
                  variante="fantasma"
                  icone={<RefreshCw size={15} />}
                  onClick={baixarDaNuvem}
                  disabled={baixando}
                >
                  {baixando ? 'Baixando da nuvem...' : '⬇️ Forçar Download da Nuvem'}
                </Botao>
              </>
            )}
          </div>

          {/* Conta / Login / Logout */}
          {s.sessaoAtiva ? (
            <div className="linha">
              <Botao variante="fantasma" icone={<LogOut size={16} />} onClick={sair}>Sair da Conta</Botao>
            </div>
          ) : (
            <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 10, fontSize: 13, color: 'var(--atencao)' }}>
              <strong>⚠️ Você não está logado.</strong> No Netlify ou em outro navegador/celular, os dados ficam zerados até entrar com sua conta. Faça login na tela inicial ou em <strong>Mais → Configurações → Dados → Entrar</strong>.
            </div>
          )}
        </div>
      </Card>

      {/* ============ SINCRONIZAÇÃO BÁSICA ============ */}
      <Card titulo="Sincronização Automática">
        <p className="secundario" style={{ marginBottom: 10, fontSize: 13 }}>
          O sistema salva tudo localmente primeiro e envia para a nuvem em segundos (modo "offline-first").
          A sincronização acontece: ao abrir o app, ao voltar a ter internet e a cada 60 segundos.
        </p>
        {s.erro && <p className="faixa negativo" style={{ marginBottom: 10 }}>{s.erro}</p>}
      </Card>

      {/* ============ BACKUP ============ */}
      <Card titulo="Backup">
        <p className="secundario" style={{ marginBottom: 14 }}>Baixe uma cópia completa dos seus dados.</p>
        <div className="linha">
          <Botao icone={<Download size={16} />} onClick={baixarBackupJSON}>Baixar backup completo</Botao>
          <Botao icone={<Download size={16} />} onClick={baixarBackupExcel}>Baixar em Excel</Botao>
          <label className="btn btn-fantasma" style={{ cursor: 'pointer' }}><Upload size={16} /> Restaurar backup
            <input type="file" accept="application/json,.json" hidden onChange={(e) => { restaurar(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
      </Card>

      <Card titulo="Importar Planilhas">
        <div className="coluna">
          <Importador tipo="clientes" />
          <Importador tipo="lancamentos" />
        </div>
      </Card>

      <Card titulo="Rotinas Automáticas">
        <p className="secundario" style={{ marginBottom: 14 }}>Todo dia, ao abrir o Atlas, ele gera as cobranças do mês, marca as atrasadas, cria as tarefas mensais, repete as contas fixas e agenda os lembretes do MEI.</p>
        <Botao onClick={async () => { await rotinaDiaria(true); avisar('Rotinas executadas'); }}>Rodar agora</Botao>
      </Card>
    </div>
  );
}

