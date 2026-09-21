// Módulo de Modelos de Mensagem WhatsApp — Continental Atlas (Seção 8.6 / 5.17)
// Modelos editáveis para cobranças, propostas, relatórios, briefings e leads.

import { useState } from 'react';
import { MessageCircle, Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { Abas, Botao, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar, AssistenteTexto } from '../../componentes/ui';
import { novoId } from '../../lib/ids';

export type TipoModelo = 'cobranca' | 'proposta' | 'relatorio' | 'briefing' | 'lead' | 'nps' | 'reajuste' | 'geral';

export interface ModeloMensagem {
  id: string;
  tipo: TipoModelo;
  nome: string;
  texto: string;
  criado_em: string;
  atualizado_em: string;
}

const CHAVE = 'atlas_modelos_mensagem';

export function carregarModelos(): ModeloMensagem[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch { return []; }
}

export function salvarModelos(lista: ModeloMensagem[]) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

export function obterModelo(tipo: TipoModelo): ModeloMensagem | null {
  const lista = carregarModelos();
  return lista.find(m => m.tipo === tipo) ?? MODELOS_PADRAO.find(m => m.tipo === tipo) ?? null;
}

export function aplicarVariaveis(texto: string, vars: Record<string, string>): string {
  if (!texto) return '';
  try {
    return Object.entries(vars).reduce((t, [k, v]) => {
      return t.split(`{{${k}}}`).join(v ?? '');
    }, texto);
  } catch {
    return texto;
  }
}

// Modelos padrão que são exibidos quando o usuário não editou
const MODELOS_PADRAO: ModeloMensagem[] = [
  {
    id: 'padrao-cobranca',
    tipo: 'cobranca',
    nome: 'Cobrança Mensal',
    texto: `Olá, {{cliente_nome}}! 👋

Passando para lembrar que temos uma mensalidade vencendo:

📋 *Serviço:* {{descricao}}
💰 *Valor:* R$ {{valor}}
📅 *Vencimento:* {{vencimento}}

*Pix para pagamento:*
🔑 {{pix_chave}}
👤 {{pix_nome}}
📝 Copia e cola: {{pix_codigo}}

Após o pagamento, pode confirmar por aqui. Qualquer dúvida estou à disposição! 😊`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'padrao-proposta',
    tipo: 'proposta',
    nome: 'Envio de Proposta Comercial',
    texto: `Olá, {{cliente_nome}}! 🤝

Segue a proposta comercial que preparei especialmente para o {{empresa}}:

🔗 {{link_proposta}}

A proposta detalha todos os serviços, valores e condições. Ela fica disponível até {{validade}}.

Fico à disposição para qualquer dúvida ou ajuste! Se preferir, podemos marcar uma conversa rápida. 📞`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'padrao-relatorio',
    tipo: 'relatorio',
    nome: 'Envio de Relatório Mensal',
    texto: `Olá, {{cliente_nome}}! 📊

Segue o relatório de {{periodo}} do {{empresa}}:

📈 *Resultados do mês:*
💰 Investimento: R$ {{investimento}}
🎯 {{resultado_tipo}}: {{resultado_valor}}
💵 Custo por {{resultado_tipo}}: R$ {{custo_resultado}}

📄 *Relatório completo:* {{link_pdf}}

Qualquer dúvida sobre os números ou estratégia, é só chamar! No próximo mês, vamos {{proximos_passos}}. 🚀`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'padrao-briefing',
    tipo: 'briefing',
    nome: 'Envio de Briefing',
    texto: `Olá, {{cliente_nome}}! 📝

Para darmos início ao trabalho do melhor jeito possível, preparei um formulário rápido com algumas perguntas sobre o {{empresa}}:

🔗 {{link_briefing}}

Leva poucos minutos e vai nos ajudar muito a entender seu negócio! O link fica disponível por {{validade_dias}} dias.

Qualquer dúvida estou por aqui! 😊`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'padrao-lead',
    tipo: 'lead',
    nome: 'Primeiro Contato com Lead',
    texto: `Olá, {{cliente_nome}}! 👋

Sou o Alessandro da Continental MKT, agência especializada em marketing digital.

Vi o {{empresa}} e acredito que podemos ajudar a atrair mais clientes e fortalecer a presença online de vocês! 🚀

Faço uma análise gratuita do seu negócio digital — sem compromisso. Posso te enviar?`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'padrao-nps',
    tipo: 'nps',
    nome: 'Pesquisa de Satisfação NPS',
    texto: `Olá, {{cliente_nome}}! 😊

Trabalhamos juntos há um tempo e sua opinião é muito importante para nós!

Você levaria menos de 1 minuto para responder uma pergunta sobre nossa parceria?

🔗 {{link_nps}}

Sua resposta nos ajuda a melhorar cada vez mais! Obrigado. 🙏`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'padrao-reajuste',
    tipo: 'reajuste',
    nome: 'Aviso de Reajuste Anual',
    texto: `Olá, {{cliente_nome}}! 📢

Passando para comunicar que, a partir de {{data_reajuste}}, haverá um reajuste no valor dos nossos serviços para o {{empresa}}:

💰 *Valor atual:* R$ {{valor_atual}}
📈 *Índice aplicado:* {{indice}} ({{percentual}}%)
💰 *Novo valor:* R$ {{valor_novo}}

Esse reajuste está previsto no contrato e segue o índice {{indice}} dos últimos 12 meses.

Qualquer dúvida, estou à disposição! Obrigado pela parceria. 🤝`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'padrao-geral',
    tipo: 'geral',
    nome: 'Mensagem Geral',
    texto: `Olá, {{cliente_nome}}! 👋

{{mensagem}}

Qualquer dúvida, estou à disposição!
Continental MKT`,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
];

const TIPO_LABELS: Record<TipoModelo, string> = {
  cobranca: '💰 Cobrança',
  proposta: '📋 Proposta',
  relatorio: '📊 Relatório',
  briefing: '📝 Briefing',
  lead: '🎯 Lead',
  nps: '⭐ NPS',
  reajuste: '📈 Reajuste',
  geral: '💬 Geral',
};

const VARIAVEIS_MODELO: Record<TipoModelo, string[]> = {
  cobranca: ['cliente_nome', 'descricao', 'valor', 'vencimento', 'pix_chave', 'pix_nome', 'pix_codigo'],
  proposta: ['cliente_nome', 'empresa', 'link_proposta', 'validade'],
  relatorio: ['cliente_nome', 'empresa', 'periodo', 'investimento', 'resultado_tipo', 'resultado_valor', 'custo_resultado', 'link_pdf', 'proximos_passos'],
  briefing: ['cliente_nome', 'empresa', 'link_briefing', 'validade_dias'],
  lead: ['cliente_nome', 'empresa'],
  nps: ['cliente_nome', 'link_nps'],
  reajuste: ['cliente_nome', 'empresa', 'data_reajuste', 'valor_atual', 'indice', 'percentual', 'valor_novo'],
  geral: ['cliente_nome', 'mensagem'],
};

type Aba = TipoModelo | 'todos';

export function ModelosMensagem() {
  const [modelos, setModelos] = useState<ModeloMensagem[]>(() => {
    const salvos = carregarModelos();
    if (salvos.length === 0) return MODELOS_PADRAO;
    return salvos;
  });
  const [aba, setAba] = useState<TipoModelo>('cobranca');
  const [editando, setEditando] = useState<ModeloMensagem | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'geral' as TipoModelo, texto: '' });
  const avisar = useAvisar();

  const salvarLista = (lista: ModeloMensagem[]) => {
    setModelos(lista);
    salvarModelos(lista);
  };

  const modelosDoTipo = modelos.filter(m => m.tipo === aba);

  const abrirNovo = () => {
    setForm({ nome: '', tipo: aba, texto: '' });
    setEditando(null);
    setFormAberto(true);
  };

  const abrirEditar = (m: ModeloMensagem) => {
    setForm({ nome: m.nome, tipo: m.tipo, texto: m.texto });
    setEditando(m);
    setFormAberto(true);
  };

  const salvarForm = () => {
    if (!form.nome.trim()) { avisar('Digite um nome para o modelo.'); return; }
    if (!form.texto.trim()) { avisar('Digite o texto do modelo.'); return; }
    const agora = new Date().toISOString();
    if (editando) {
      const atualizado = { ...editando, nome: form.nome, tipo: form.tipo, texto: form.texto, atualizado_em: agora };
      salvarLista(modelos.map(m => m.id === editando.id ? atualizado : m));
      avisar('Modelo atualizado!');
    } else {
      const novo: ModeloMensagem = { id: novoId(), nome: form.nome, tipo: form.tipo, texto: form.texto, criado_em: agora, atualizado_em: agora };
      salvarLista([...modelos, novo]);
      avisar('Modelo criado!');
    }
    setFormAberto(false);
  };

  const excluir = (id: string) => {
    if (!confirm('Excluir este modelo?')) return;
    salvarLista(modelos.filter(m => m.id !== id));
    avisar('Modelo excluído');
  };

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => avisar('Texto copiado!')).catch(() => {});
  };

  const restaurarPadrao = (tipo: TipoModelo) => {
    if (!confirm('Restaurar o modelo padrão para este tipo? Você perderá as edições.')) return;
    const padrao = MODELOS_PADRAO.find(m => m.tipo === tipo);
    if (!padrao) return;
    const semEstesTipo = modelos.filter(m => m.tipo !== tipo || !m.id.startsWith('padrao-'));
    salvarLista([...semEstesTipo.filter(m => m.tipo !== tipo), { ...padrao, atualizado_em: new Date().toISOString() }]);
    avisar('Modelo padrão restaurado!');
  };

  const ABAS_TIPOS = Object.entries(TIPO_LABELS).map(([id, rotulo]) => ({ id: id as TipoModelo, rotulo }));

  return (
    <>
      <CabecalhoTela
        titulo="Modelos de Mensagem WhatsApp"
        icone={<MessageCircle size={28} strokeWidth={1.6} />}
        subtitulo="Textos prontos para cobranças, propostas, relatórios e mais"
        acoes={<Botao variante="primario" onClick={abrirNovo}><Plus size={17} /> Novo Modelo</Botao>}
      />

      <div style={{ marginBottom: 16 }}>
        <Abas<TipoModelo>
          abas={ABAS_TIPOS}
          ativa={aba}
          aoMudar={setAba}
        />
      </div>

      {/* Variáveis disponíveis */}
      <Card>
        <div style={{ marginBottom: 8 }}>
          <span className="rotulo" style={{ fontSize: 12 }}>Variáveis disponíveis para este tipo:</span>
        </div>
        <div className="linha" style={{ gap: 6, flexWrap: 'wrap' }}>
          {VARIAVEIS_MODELO[aba].map(v => (
            <button key={v}
              className="chip"
              style={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, background: 'var(--vidro-painel-a)', border: '1px solid var(--vidro-borda)', borderRadius: 6, padding: '2px 8px', color: 'var(--destaque)' }}
              onClick={() => { navigator.clipboard.writeText(`{{${v}}}`).then(() => avisar(`{{${v}}} copiado!`)).catch(() => {}); }}
            >
              {'{{'}{ v }{'}}'}
            </button>
          ))}
        </div>
        <p className="pequeno secundario" style={{ marginTop: 8 }}>Clique em uma variável para copiar. Use nos seus modelos — elas são substituídas automaticamente ao enviar.</p>
      </Card>

      <div className="coluna" style={{ gap: 12, marginTop: 12 }}>
        {modelosDoTipo.length === 0 ? (
          <Vazio texto="Nenhum modelo neste tipo." acao={<Botao variante="primario" onClick={abrirNovo}><Plus size={15} /> Novo Modelo</Botao>} />
        ) : (
          modelosDoTipo.map(m => (
            <Card key={m.id}>
              <div className="linha" style={{ gap: 8, marginBottom: 8 }}>
                <strong style={{ flex: 1 }}>{m.nome}</strong>
                <Chip>{TIPO_LABELS[m.tipo]}</Chip>
              </div>
              <pre style={{ fontFamily: 'inherit', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--texto)', background: 'var(--vidro-painel-a)', padding: '10px 12px', borderRadius: 8, marginBottom: 10 }}>
                {m.texto}
              </pre>
              <div className="linha" style={{ gap: 8 }}>
                <Botao onClick={() => copiarTexto(m.texto)}><Copy size={14} /> Copiar texto</Botao>
                <Botao onClick={() => abrirEditar(m)}><Pencil size={14} /> Editar</Botao>
                {!m.id.startsWith('padrao-') && (
                  <Botao variante="perigo" onClick={() => excluir(m.id)}><Trash2 size={14} /> Excluir</Botao>
                )}
                {m.id.startsWith('padrao-') && (
                  <Botao onClick={() => restaurarPadrao(m.tipo)}>Restaurar padrão</Botao>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Edição */}
      <Modal titulo={editando ? 'Editar Modelo' : 'Novo Modelo de Mensagem'} aberto={formAberto} aoFechar={() => setFormAberto(false)}
        rodape={<Botao variante="primario" onClick={salvarForm}>Salvar Modelo</Botao>}>
        <div className="coluna" style={{ gap: 14 }}>
          <div className="grade grade-2">
            <Campo rotulo="Nome do modelo">
              <input className="entrada" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Cobrança - Após vencimento" autoFocus />
            </Campo>
            <Campo rotulo="Tipo">
              <select className="entrada" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoModelo }))}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
          </div>
          <Campo rotulo="Texto da mensagem">
            <div>
              <div style={{ marginBottom: 4 }}>
                <span className="pequeno secundario">Variáveis: </span>
                {VARIAVEIS_MODELO[form.tipo].map(v => (
                  <span key={v} onClick={() => setForm(p => ({ ...p, texto: p.texto + `{{${v}}}` }))}
                    style={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, marginRight: 6, color: 'var(--destaque)', textDecoration: 'underline' }}>
                    {'{{'}{v}{'}}'}
                  </span>
                ))}
              </div>
              <AssistenteTexto valor={form.texto} aoCorrigir={v => setForm(p => ({ ...p, texto: v }))} />
              <textarea
                className="entrada"
                rows={10}
                value={form.texto}
                onChange={e => setForm(p => ({ ...p, texto: e.target.value }))}
                placeholder="Digite o texto da mensagem. Use as variáveis acima para dados dinâmicos."
                style={{ fontFamily: 'inherit', fontSize: 13, marginTop: 4 }}
              />
            </div>
          </Campo>
          {form.texto && (
            <div>
              <p className="pequeno secundario" style={{ marginBottom: 6 }}>Preview (com variáveis de exemplo):</p>
              <pre style={{ fontFamily: 'inherit', fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'var(--vidro-painel-a)', padding: '10px 12px', borderRadius: 8 }}>
                {aplicarVariaveis(form.texto, {
                  cliente_nome: 'João Silva', empresa: 'Pizzaria do João', descricao: 'Gestão de Tráfego Pago',
                  valor: '1.200,00', vencimento: '25/09/2026', pix_chave: '99999-99999', pix_nome: 'Continental MKT',
                  pix_codigo: '00020126...', link_proposta: 'https://atlas.app/p/abc123', validade: '30/09/2026',
                  periodo: 'setembro/2026', investimento: '2.000,00', resultado_tipo: 'leads', resultado_valor: '47',
                  custo_resultado: '42,55', link_pdf: 'https://atlas.app/r/abc123', proximos_passos: 'testar novos criativos',
                  link_briefing: 'https://atlas.app/b/abc123', validade_dias: '15', link_nps: 'https://atlas.app/nps/abc123',
                  data_reajuste: '01/10/2026', valor_atual: '1.500,00', indice: 'IPCA', percentual: '4,62', valor_novo: '1.569,30',
                  mensagem: 'Sua mensagem personalizada aqui.',
                })}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
