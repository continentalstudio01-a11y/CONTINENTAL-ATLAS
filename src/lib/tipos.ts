// Tipos dos registros. Os nomes dos campos são idênticos às colunas do Supabase
// (supabase/migrations/0001_esquema.sql) para a sincronização funcionar sem conversão.

export interface Base {
  id: string;
  criado_em: string;
  atualizado_em: string;
  excluido: boolean;
}

export type ChaveServico = 'trafego' | 'site' | 'social' | 'gmn' | 'outro';
export type TipoCobranca = 'mensal' | 'pacote';
export type Carteira = 'negocio' | 'pessoal';

export interface Configuracao extends Base {
  empresa_nome: string;
  responsavel_nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logo_url: string | null;
  pix_chave: string;
  pix_nome: string;
  pix_cidade: string;
  fuso_horario: string;
  valor_hora: number;
  mei: boolean;
  limite_mei: number;
  multa_padrao: number;
  juros_padrao: number;
}

export interface Servico extends Base {
  nome: string;
  chave: ChaveServico;
  descricao: string;
  tipo_cobranca_padrao: TipoCobranca;
  preco_base: number;
  ativo: boolean;
}

export interface Pacote extends Base {
  nome: string;
  descricao: string;
  itens: { servico_id: string; valor: number }[];
  preco_total: number;
  tipo_cobranca: TipoCobranca;
  ativo: boolean;
}

export interface Cliente extends Base {
  tipo_pessoa: 'PF' | 'PJ';
  nome: string;
  nome_fantasia: string;
  documento: string;
  responsavel: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  cidade: string;
  uf: string;
  nicho: string;
  origem: string;
  indicado_por_id: string | null;
  status: 'ativo' | 'pausado' | 'encerrado';
  observacoes: string;
  aniversario: string | null;
  multa_ativa: boolean;
  multa_percentual: number;
  juros_mensal: number;
  aprova_posts: boolean;
  lead_id: string | null;
}

export interface ClienteServico extends Base {
  cliente_id: string;
  servico_id: string;
  descricao: string;
  tipo_cobranca: TipoCobranca;
  valor: number;
  dia_vencimento: number;
  parcelas: number;
  primeiro_vencimento: string | null;
  inicio: string;
  fim: string | null;
  status: 'ativo' | 'encerrado';
}

export interface ClienteTrafego extends Base {
  cliente_id: string;
  quem_paga_verba: 'cliente' | 'continental';
  verba_mensal_planejada: number;
  resultado_principal: 'leads' | 'conversas' | 'compras' | 'cliques';
  frequencia_relatorio: 'semanal' | 'quinzenal' | 'mensal' | 'nenhuma';
  dia_relatorio: number;
  puxar_leads_formularios: boolean;
}

export interface ContaAnuncio extends Base {
  cliente_id: string;
  plataforma: 'meta' | 'google';
  conta_externa_id: string;
  nome: string;
  ativa: boolean;
}

export type TipoEvento = 'reuniao' | 'prazo' | 'vencimento' | 'relatorio' | 'pessoal' | 'conteudo';

export interface Evento extends Base {
  titulo: string;
  tipo: TipoEvento;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  local_link: string;
  descricao: string;
  cliente_id: string | null;
  lead_id: string | null;
  recorrencia: 'nenhuma' | 'semanal' | 'mensal';
  lembretes: number[];
  automatico: boolean;
  origem_tabela: string | null;
  origem_id: string | null;
  google_event_id: string | null;
  sync_pendente: boolean;
}

export interface Tarefa extends Base {
  titulo: string;
  descricao: string;
  prazo: string | null;
  prioridade: 'alta' | 'media' | 'baixa';
  status: 'aberta' | 'concluida';
  cliente_id: string | null;
  origem: 'avulsa' | 'checklist' | 'recorrente' | 'sistema';
  modelo_id: string | null;
  referencia: string | null;
  ordem: number;
  concluida_em: string | null;
}

export interface TarefaModelo extends Base {
  nome: string;
  tipo: 'checklist' | 'recorrente';
  servico_id: string | null;
  itens: string[];
  dia_do_mes: number;
}

export interface Categoria extends Base {
  carteira: Carteira;
  nome: string;
  tipo: 'entrada' | 'saida';
  especial: 'receita_servico' | 'verba_adiantada' | 'imposto' | null;
}

export interface Lancamento extends Base {
  carteira: Carteira;
  categoria_id: string | null;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: string;
  status: 'previsto' | 'pago';
  forma_pagamento: string;
  cliente_id: string | null;
  cobranca_id: string | null;
  recorrente: boolean;
  recorrencia_origem_id: string | null;
  referencia: string | null;
  reembolsado_em: string | null;
}

export interface Cobranca extends Base {
  cliente_id: string;
  cliente_servico_id: string | null;
  lancamento_origem_id: string | null;
  descricao: string;
  valor: number;
  vencimento: string;
  status: 'aberta' | 'paga' | 'atrasada' | 'cancelada';
  pago_em: string | null;
  valor_pago: number | null;
  forma_pagamento: string;
  lancamento_id: string | null;
  referencia: string | null;
}

export interface Meta extends Base {
  mes: string;
  faturamento_alvo: number;
  novos_clientes_alvo: number;
}

export interface Pendencia {
  seq?: number;
  tabela: string;
  registro_id: string;
  criado_em: string;
}

export interface Estado {
  chave: string;
  valor: string;
}

// Fase 2 — Vendas e Contratos
export interface Lead extends Base {
  nome: string;
  empresa: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  nicho: string;
  origem: string;
  etapa: 'novo' | 'contato' | 'reuniao' | 'proposta' | 'fechado' | 'perdido';
  valor_estimado: number;
  motivo_perda: string | null;
  pontuacao: number | null;
  chave_externa: string | null;
  dados_externos: Record<string, unknown>;
  proximo_contato: string | null;
  observacoes: string;
  cliente_id: string | null;
}

export interface LeadInteracao extends Base {
  lead_id: string;
  tipo: 'whatsapp' | 'ligacao' | 'reuniao' | 'nota';
  descricao: string;
  data: string;
}

export interface BriefingPergunta {
  id: string;
  texto: string;
  tipo: 'texto' | 'texto_longo' | 'multipla_escolha' | 'sim_nao' | 'link';
  opcoes?: string[];
  obrigatoria: boolean;
}

export interface BriefingModelo extends Base {
  nome: string;
  servico_chave: string | null;
  perguntas: BriefingPergunta[];
}

export interface Briefing extends Base {
  cliente_id: string | null;
  lead_id: string | null;
  modelo_id: string | null;
  token_publico: string | null;
  respostas: Record<string, string>;
  status: 'rascunho' | 'enviado' | 'respondido';
  enviado_em: string | null;
  respondido_em: string | null;
}

// Fase 4 — Campanhas
export interface MetricaDiaria extends Base {
  conta_anuncio_id: string;
  cliente_id: string;
  data: string;
  campanha_id: string;
  campanha_nome: string;
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  resultados: number;
  conversoes: number;
  valor_conversoes: number;
  dados: Record<string, unknown>;
}

export interface Relatorio extends Base {
  cliente_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  incluir_melhores_anuncios: boolean;
  anuncios_escolhidos: unknown[];
  pdf_path: string | null;
  status: 'rascunho' | 'gerado' | 'enviado';
  enviado_em: string | null;
}

// Fase 5 — Conteúdo, Sites e Cofre
export interface Conteudo extends Base {
  cliente_id: string;
  titulo: string;
  legenda: string;
  midias: string[];
  formato: 'feed' | 'carrossel' | 'reels' | 'story';
  rede: 'instagram' | 'facebook' | 'ambos';
  agendado_para: string | null;
  status: 'ideia' | 'producao' | 'aprovacao' | 'ajustes' | 'aprovado' | 'agendado' | 'publicado' | 'erro';
  data_comemorativa: string | null;
  publicado_em: string | null;
  id_externo: string | null;
  erro: string | null;
}

export interface ProjetoSite extends Base {
  cliente_id: string;
  nome: string;
  tipo: 'site' | 'landing';
  etapa_atual: string;
  limite_revisoes: number;
  revisoes_usadas: number;
  prazo: string | null;
  status: 'andamento' | 'pausado' | 'entregue' | 'cancelado';
}

export interface Dominio extends Base {
  cliente_id: string | null;
  dominio: string;
  registrador: string;
  hospedagem: string;
  vence_dominio: string | null;
  vence_hospedagem: string | null;
  quem_paga: 'cliente' | 'continental';
  valor: number;
  observacoes: string;
}

export interface CofreItem extends Base {
  cliente_id: string | null;
  servico: string;
  url: string;
  cifrado: string;
  iv: string;
}


