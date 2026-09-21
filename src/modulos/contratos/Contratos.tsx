import { useState, useMemo } from 'react';
import { FileSignature, Plus, CheckCircle2, Trash2, ChevronRight, Eye, Printer, Copy, Upload, Zap, FileText } from 'lucide-react';
import { Botao, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, Marcador, useAvisar, AssistenteTexto } from '../../componentes/ui';
import { useLista, useConfig } from '../../lib/hooks';
import { data, hoje } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente, ClienteServico, Servico } from '../../lib/tipos';

export type TipoCobrancaContrato = 'mensal' | 'unico' | 'pacote_dias' | 'parcelado';
export type FormatoModeloContrato = 'completo' | 'simplificado';

interface Contrato {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  formato_modelo?: FormatoModeloContrato;
  servicos: string[];
  tipo_cobranca: TipoCobrancaContrato;
  valor: number;
  dia_vencimento?: number;
  duracao_dias?: number;
  data_vencimento?: string;
  forma_pagamento: string;
  condicao_pagamento?: string;
  parcelas_qtd?: number;
  aplicar_juros_multa: boolean;
  multa_atraso_perc?: number;
  juros_atraso_perc?: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  fidelidade_meses: number;
  aviso_previo_dias: number;
  multa_rescisoria: number;
  reajuste_indice: 'nenhum' | 'ipca' | 'igpm' | 'fixo';
  reajuste_percentual: number | null;
  clausulas: string;
  status: 'gerado' | 'enviado' | 'assinado' | 'encerrado';
  assinado_em: string | null;
  pdf_assinado_url: string | null;
  criado_em: string;
  atualizado_em: string;
}

function normalizarContrato(c: any): Contrato {
  return {
    id: c?.id || novoId(),
    numero: c?.numero || 'CT-SEM-NUMERO',
    cliente_id: c?.cliente_id || '',
    cliente_nome: c?.cliente_nome || 'Cliente não identificado',
    formato_modelo: c?.formato_modelo || (c?.tipo_cobranca === 'pacote_dias' ? 'simplificado' : 'completo'),
    servicos: Array.isArray(c?.servicos) ? c.servicos : [],
    tipo_cobranca: c?.tipo_cobranca || 'mensal',
    valor: Number(c?.valor) || 0,
    dia_vencimento: c?.dia_vencimento ? Number(c.dia_vencimento) : 10,
    duracao_dias: c?.duracao_dias ? Number(c.duracao_dias) : undefined,
    data_vencimento: c?.data_vencimento || undefined,
    forma_pagamento: c?.forma_pagamento || 'Pix ou boleto bancário',
    condicao_pagamento: c?.condicao_pagamento || undefined,
    parcelas_qtd: c?.parcelas_qtd ? Number(c.parcelas_qtd) : undefined,
    aplicar_juros_multa: c?.aplicar_juros_multa ?? true,
    multa_atraso_perc: c?.multa_atraso_perc ? Number(c.multa_atraso_perc) : 2,
    juros_atraso_perc: c?.juros_atraso_perc ? Number(c.juros_atraso_perc) : 1,
    vigencia_inicio: c?.vigencia_inicio || hoje(),
    vigencia_fim: c?.vigencia_fim || null,
    fidelidade_meses: Number(c?.fidelidade_meses) || 0,
    aviso_previo_dias: Number(c?.aviso_previo_dias) || 30,
    multa_rescisoria: Number(c?.multa_rescisoria) || 0,
    reajuste_indice: c?.reajuste_indice || 'nenhum',
    reajuste_percentual: c?.reajuste_percentual ? Number(c.reajuste_percentual) : null,
    clausulas: c?.clausulas || '',
    status: c?.status || 'gerado',
    assinado_em: c?.assinado_em || null,
    pdf_assinado_url: c?.pdf_assinado_url || null,
    criado_em: c?.criado_em || new Date().toISOString(),
    atualizado_em: c?.atualizado_em || new Date().toISOString(),
  };
}

function carregar(): Contrato[] {
  try {
    const raw = JSON.parse(localStorage.getItem('atlas_contratos') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizarContrato);
  } catch {
    return [];
  }
}
function salvarStorage(l: Contrato[]) { localStorage.setItem('atlas_contratos', JSON.stringify(l)); }

const COR_STATUS: Record<Contrato['status'], 'ok' | 'atencao' | 'destaque' | undefined> = {
  gerado: undefined, enviado: 'destaque', assinado: 'ok', encerrado: 'atencao',
};
const LABEL_STATUS: Record<Contrato['status'], string> = {
  gerado: 'Gerado', enviado: 'Enviado', assinado: 'Assinado', encerrado: 'Encerrado',
};

export const ROTULOS_TIPO_COBRANCA: Record<TipoCobrancaContrato, string> = {
  mensal: 'Mensal Fixo',
  unico: 'Pagamento Único',
  pacote_dias: 'Pacote por Período / Dias',
  parcelado: 'Parcelado',
};

// 1. Cláusulas do Contrato Simplificado / Pacote Rápido (Enxuto para 1 página)
function gerarClausulasSimplificado(params: {
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string;
  cliente_responsavel: string;
  valor: number;
  duracao_dias: number;
  forma_pagamento: string;
  condicao_pagamento: string;
  servicos_lista: string[];
}): string {
  const valorFormatado = params.valor > 0
    ? `R$ ${params.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'R$ 147,00';

  const servicosTexto = params.servicos_lista.length > 0
    ? params.servicos_lista.map(s => `  • ${s}`).join('\n')
    : `  • Gestão e veiculação de anúncios online (Tráfego Pago)\n  • Configuração e otimização diária de campanhas\n  • Relatório final de métricas e desempenho`;

  const cond = params.condicao_pagamento || 'à vista no ato da contratação';

  return `TERMO DE ADESÃO E CONTRATAÇÃO DE PACOTE DE MARKETING DIGITAL

CONTRATANTE: ${params.cliente_nome || '___________________'}
CPF/CNPJ: ${params.cliente_documento || '___________________'}
Representante: ${params.cliente_responsavel || '___________________'}

CONTRATADA: CONTINENTAL MKT — Gestão e Estratégia em Marketing Digital

As partes celebram o presente Termo de Adesão para prestação de serviços em pacote fechado, mediante as seguintes cláusulas:

**1. OBJETO E ESCOPO DO PACOTE**
A CONTRATADA prestará ao CONTRATANTE os serviços correspondentes ao PACOTE DE ${params.duracao_dias} DIAS:
${servicosTexto}

**2. DURAÇÃO E VIGÊNCIA**
A prestação dos serviços terá duração fixa de exatamente ${params.duracao_dias} dias corridos, contados a partir da data de ativação das campanhas/anúncios acordada entre as partes. Concluído o período, o pacote encerra-se automaticamente sem renovação obrigatória ou taxa de cancelamento.

**3. VALOR DOS SERVIÇOS E PAGAMENTO**
O valor total deste pacote de serviços é de ${valorFormatado}, a ser pago ${cond}, via ${params.forma_pagamento || 'Pix'}.

**4. VERBA DE ANÚNCIOS NAS PLATAFORMAS (IMPORTANTE)**
O valor deste pacote remunera exclusivamente os serviços profissionais de gestão da CONTINENTAL MKT. Toda e qualquer verba orçamentária destinada aos anúncios nas plataformas (Meta Ads, Google Ads, etc.) é de responsabilidade direta e exclusiva do CONTRATANTE, devendo ser quitada diretamente através do método de pagamento cadastrado na sua conta de anúncios.

**5. EXECUÇÃO E NÃO PROMESSA DE RESULTADOS**
A CONTRATADA compromete-se a aplicar as melhores práticas técnicas para maximizar a visibilidade e o alcance do negócio. Por se tratar de mercado dinâmico e variável, não há garantia de volume específico de vendas ou faturamento, visto que os resultados finais dependem também do atendimento comercial, qualidade dos produtos e demanda de mercado do CONTRATANTE.

As partes confirmam a aceitação deste termo para início imediato dos trabalhos.`;
}

// 2. Cláusulas do Contrato Completo (14 Cláusulas Jurídicas)
function gerarClausulasCompleto(params: {
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string;
  cliente_responsavel: string;
  tipo_cobranca: TipoCobrancaContrato;
  valor: number;
  dia_vencimento: number;
  duracao_dias: number;
  data_vencimento: string;
  forma_pagamento: string;
  condicao_pagamento: string;
  parcelas_qtd: number;
  aplicar_juros_multa: boolean;
  multa_atraso_perc: number;
  juros_atraso_perc: number;
  aviso_previo_dias: number;
  fidelidade_meses: number;
  multa_rescisoria: number;
  reajuste_indice: string;
  reajuste_percentual: number | null;
  servicos_lista: string[];
}): string {
  const reajusteTexto = params.tipo_cobranca !== 'mensal'
    ? 'Não aplicável para esta modalidade de contratação.'
    : params.reajuste_indice === 'nenhum'
      ? 'Não haverá reajuste periódico.'
      : params.reajuste_indice === 'fixo'
        ? `O valor dos serviços será reajustado anualmente em ${params.reajuste_percentual ?? 0}% ao ano.`
        : `O valor dos serviços será reajustado anualmente pelo índice ${params.reajuste_indice.toUpperCase()}, acumulado nos últimos 12 meses.`;

  const fidelidadeTexto = params.tipo_cobranca === 'mensal' && params.fidelidade_meses > 0
    ? `O contrato tem prazo mínimo de fidelidade de ${params.fidelidade_meses} (${params.fidelidade_meses === 1 ? 'um' : params.fidelidade_meses === 3 ? 'três' : params.fidelidade_meses === 6 ? 'seis' : params.fidelidade_meses === 12 ? 'doze' : String(params.fidelidade_meses)}) meses a contar da data de início.`
    : params.tipo_cobranca === 'pacote_dias'
      ? `A prestação dos serviços terá duração determinada de ${params.duracao_dias} dias a contar da data de início.`
      : 'O presente contrato vigorará até a conclusão e entrega final dos serviços contratados.';

  const multaTexto = params.multa_rescisoria > 0
    ? `Em caso de rescisão antecipada dentro do período de vigência/fidelidade, será cobrada multa rescisória no valor de R$ ${params.multa_rescisoria.toFixed(2).replace('.', ',')}.`
    : `Não há multa rescisória prevista neste contrato.`;

  const servicosTexto = params.servicos_lista.length > 0
    ? params.servicos_lista.map(s => `  • ${s}`).join('\n')
    : '  • Serviços de marketing digital conforme acordado';

  const valorFormatado = params.valor > 0
    ? `R$ ${params.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'R$ ___________';

  let clausulaPagamento = '';
  if (params.tipo_cobranca === 'mensal') {
    clausulaPagamento = `O valor mensal dos serviços contratados é de ${valorFormatado}, a ser pago todo dia ${params.dia_vencimento || '___'} de cada mês, via ${params.forma_pagamento || 'Pix ou transferência bancária'}.`;
  } else if (params.tipo_cobranca === 'unico') {
    const cond = params.condicao_pagamento ? ` (${params.condicao_pagamento})` : '';
    const venc = params.data_vencimento ? `, com vencimento em ${data(params.data_vencimento)}` : ' na assinatura deste contrato';
    clausulaPagamento = `O valor total dos serviços contratados é de ${valorFormatado}, em pagamento único${cond}, a ser quitado${venc}, via ${params.forma_pagamento || 'Pix ou transferência bancária'}.`;
  } else if (params.tipo_cobranca === 'pacote_dias') {
    const cond = params.condicao_pagamento ? ` (${params.condicao_pagamento})` : '';
    clausulaPagamento = `O valor total do pacote de serviços para o período de ${params.duracao_dias} dias é de ${valorFormatado}${cond}, a ser pago via ${params.forma_pagamento || 'Pix ou transferência bancária'}. A vigência dos trabalhos será de exatamente ${params.duracao_dias} dias a partir do início da veiculação/execução.`;
  } else if (params.tipo_cobranca === 'parcelado') {
    const n = params.parcelas_qtd || 2;
    const vParc = params.valor > 0 ? (params.valor / n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '___';
    const cond = params.condicao_pagamento ? ` Condições acordadas: ${params.condicao_pagamento}.` : '';
    clausulaPagamento = `O valor total dos serviços contratados é de ${valorFormatado}, a ser quitado em ${n} parcelas de R$ ${vParc}, via ${params.forma_pagamento || 'Pix ou boleto bancário'}.${cond}`;
  }

  let atrasoTexto = '';
  if (params.aplicar_juros_multa) {
    const m = params.multa_atraso_perc ?? 2;
    const j = params.juros_atraso_perc ?? 1;
    atrasoTexto = `\n\nEm caso de atraso no pagamento, incidirá multa moratória de ${m}% (dois por cento) sobre o montante devido, acrescida de juros de mora de ${j}% (um por cento) ao mês, calculados pro rata die até a efetiva quitação.`;
  }

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL

CONTRATANTE: ${params.cliente_nome || '___________________'}
CPF/CNPJ: ${params.cliente_documento || '___________________'}
Endereço: ${params.cliente_endereco || '___________________'}
Representante: ${params.cliente_responsavel || '___________________'}

CONTRATADA: CONTINENTAL MKT
Prestadora de serviços de marketing digital.

As partes acima identificadas celebram o presente Contrato de Prestação de Serviços, que se regerá pelas seguintes cláusulas:

**1. OBJETO DO CONTRATO**
O(a) CONTRATANTE contrata os seguintes serviços de marketing digital da CONTINENTAL MKT:

${servicosTexto}

Serviços adicionais não listados acima deverão ser formalizados em aditivo contratual.

**2. PRAZO DE VIGÊNCIA E DURAÇÃO**
O presente contrato entra em vigor na data de assinatura. ${fidelidadeTexto}
${params.tipo_cobranca === 'mensal' ? `Após o período de fidelidade, o contrato passa a vigorar por prazo indeterminado, rescindível mediante aviso prévio de ${params.aviso_previo_dias} (${params.aviso_previo_dias === 30 ? 'trinta' : String(params.aviso_previo_dias)}) dias.` : ''}

**3. VALOR E FORMA DE PAGAMENTO**
${clausulaPagamento}${atrasoTexto}

**4. REAJUSTE ANUAL**
${reajusteTexto} ${params.tipo_cobranca === 'mensal' ? 'O reajuste será comunicado com antecedência mínima de 30 (trinta) dias.' : ''}

**5. NÃO GARANTIA DE RESULTADOS**
A CONTINENTAL MKT se compromete a empregar os melhores esforços, técnicas e conhecimentos disponíveis para atingir os objetivos do CONTRATANTE. Contudo, não há garantia de resultados específicos (como número de leads, vendas, faturamento, alcance ou posicionamento orgânico), uma vez que estes dependem de fatores externos ao controle da CONTRATADA, incluindo comportamento do mercado, sazonalidade, concorrência, qualidade do produto/atendimento do CONTRATANTE e algoritmos de terceiros (Meta, Google, etc.).

**6. OBRIGAÇÕES DA CONTINENTAL MKT (CONTRATADA)**
• Executar os serviços com zelo técnico e dentro dos prazos pactuados.
• Manter o CONTRATANTE informado sobre o andamento das ações e métricas alcançadas.
• Guardar sigilo sobre todas as informações estratégicas do CONTRATANTE.
• Solicitar aprovação do CONTRATANTE antes de veicular novos criativos ou campanhas, salvo autorização expressa em contrário.
• Notificar o CONTRATANTE caso ocorra qualquer intercorrência com as contas de anúncio ou ferramentas digitais.

**7. OBRIGAÇÕES DO CONTRATANTE**
• Fornecer em tempo hábil as informações, materiais (fotos, vídeos, textos), acessos e aprovações necessários à execução dos serviços.
• Realizar os pagamentos nas datas e condições estipuladas na Cláusula 3.
• Não contratar diretamente, sem anuência da CONTRATADA, prestadores de serviço ou terceirizados alocados pela CONTRATADA durante o contrato e por 6 (seis) meses após o término.
• Responsabilizar-se integralmente pela veracidade, legalidade e direitos autorais dos materiais próprios fornecidos.

**8. ACESSO A CONTAS E SENHAS**
Os acessos (gerenciadores de anúncios, páginas, perfis, plataformas de e-mail e hospedagem) concedidos pelo CONTRATANTE serão utilizados com absoluta confidencialidade e exclusivamente para a prestação dos serviços contratados. A CONTRATADA não responderá por prejuízos decorrentes de senhas fracas, ataques de terceiros ou instabilidades gerais das plataformas digitais. Recomenda-se a alteração de senhas pelo CONTRATANTE após o encerramento do contrato.

**9. PROPRIEDADE INTELECTUAL E PORTFÓLIO**
Todo o material produzido (artes, criativos, copies e landing pages) passará a ser de propriedade do CONTRATANTE mediante o pagamento integral dos valores devidos. A CONTRATADA reserva-se o direito de divulgar os resultados e peças produzidas em seu portfólio comercial institucional, salvo requisição expressa de sigilo.

**10. PRAZO DE APROVAÇÃO DE MATERIAIS**
O CONTRATANTE terá o prazo de até 5 (cinco) dias úteis para validar ou solicitar alterações nos materiais submetidos para aprovação. Caso não haja manifestação no período, o material será considerado tacitamente aprovado para veiculação, evitando prejuízo ao cronograma.

**11. CONFIDENCIALIDADE E LGPD**
As partes comprometem-se a proteger as informações confidenciais e os dados pessoais eventualmente manipulados, nos exatos termos da Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018 — LGPD), utilizando-os apenas para a finalidade legítima deste contrato.

**12. RESCISÃO E AVISO PRÉVIO**
${params.tipo_cobranca === 'mensal'
  ? `Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio por escrito de ${params.aviso_previo_dias} (${params.aviso_previo_dias === 30 ? 'trinta' : String(params.aviso_previo_dias)}) dias. ${multaTexto}`
  : `Em contratos por pacote ou prazo determinado, a rescisão imotivada por iniciativa do CONTRATANTE não enseja devolução de valores já quitados, cabendo a quitação proporcional dos serviços já realizados.`
}

**13. CASOS FORTUITOS E FORÇA MAIOR**
Nenhuma das partes será responsabilizada por atrasos ou impedimentos motivados por fatos alheios à sua vontade, incluindo indisponibilidade das redes sociais ou plataformas globais de anúncios (Meta/Google), catástrofes naturais ou determinações governamentais.

**14. FORO DE ELEIÇÃO**
Para dirimir quaisquer dúvidas ou litígios oriundos deste instrumento, as partes elegem o foro da comarca da sede da CONTINENTAL MKT, com expressa renúncia a qualquer outro, por mais privilegiado que seja.

As partes firmam o presente instrumento em concordância com todas as suas cláusulas.`;
}

function gerarNumero(lista: Contrato[]): string {
  const ano = new Date().getFullYear();
  const seq = lista.filter(c => c.numero.startsWith(String(ano))).length + 1;
  return `CT-${ano}-${String(seq).padStart(3, '0')}`;
}

export function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>(carregar);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const clienteServicos = useLista<ClienteServico>('cliente_servicos') ?? [];
  const servicos = useLista<Servico>('servicos') ?? [];
  const cfg = useConfig();
  const avisar = useAvisar();

  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [detalhes, setDetalhes] = useState<Contrato | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);

  const [form, setForm] = useState({
    cliente_id: '',
    formato_modelo: 'completo' as FormatoModeloContrato,
    servicos: '' as string,
    tipo_cobranca: 'mensal' as TipoCobrancaContrato,
    valor: '' as string | number,
    dia_vencimento: 10,
    duracao_dias: 7,
    data_vencimento: '',
    forma_pagamento: 'Pix',
    condicao_pagamento: 'à vista na contratação',
    parcelas_qtd: 2,
    aplicar_juros_multa: true,
    multa_atraso_perc: 2,
    juros_atraso_perc: 1,
    vigencia_inicio: hoje(),
    vigencia_fim: '',
    fidelidade_meses: 12,
    aviso_previo_dias: 30,
    multa_rescisoria: 0,
    reajuste_indice: 'ipca' as Contrato['reajuste_indice'],
    reajuste_percentual: '' as string | number,
    clausulas: '',
  });

  const salvarLista = (lista: Contrato[]) => { setContratos(lista); salvarStorage(lista); };
  const set = (f: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [f]: v }));

  const lista = useMemo(() => {
    let l = contratos;
    if (filtroStatus !== 'todos') l = l.filter(c => c.status === filtroStatus);
    return l.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [contratos, filtroStatus]);

  const clienteSelecionado = useMemo(() => clientes.find(c => c.id === form.cliente_id), [clientes, form.cliente_id]);

  const servicosDoCliente = useMemo(() => {
    if (!form.cliente_id) return [];
    return clienteServicos
      .filter(cs => cs.cliente_id === form.cliente_id && cs.status === 'ativo')
      .map(cs => servicos.find(s => s.id === cs.servico_id)?.nome ?? '')
      .filter(Boolean);
  }, [form.cliente_id, clienteServicos, servicos]);

  const valorCalculadoCliente = useMemo(() => {
    if (!form.cliente_id) return 0;
    return clienteServicos
      .filter(cs => cs.cliente_id === form.cliente_id && cs.status === 'ativo')
      .reduce((acc, cs) => acc + (cs.valor ?? 0), 0);
  }, [form.cliente_id, clienteServicos]);

  const selecionarCliente = (clienteId: string) => {
    if (!clienteId) {
      setForm(prev => ({ ...prev, cliente_id: '', clausulas: '' }));
      return;
    }
    const csCliente = clienteServicos.filter(cs => cs.cliente_id === clienteId && cs.status === 'ativo');
    const valorSoma = csCliente.reduce((acc, cs) => acc + (cs.valor ?? 0), 0);
    const diaVenc = csCliente.find(cs => cs.dia_vencimento)?.dia_vencimento ?? 10;
    const nomesServ = csCliente.map(cs => servicos.find(s => s.id === cs.servico_id)?.nome ?? '').filter(Boolean);

    setForm(prev => ({
      ...prev,
      cliente_id: clienteId,
      valor: prev.formato_modelo === 'simplificado' ? prev.valor || 147 : (valorSoma > 0 ? valorSoma : prev.valor),
      dia_vencimento: diaVenc,
      servicos: nomesServ.join('\n'),
      clausulas: '',
    }));
  };

  // Atalho para preencher pacotes rápidos em 1 clique
  const aplicarPacoteRapido = (dias: number, preco: number) => {
    setForm(prev => ({
      ...prev,
      formato_modelo: 'simplificado',
      tipo_cobranca: 'pacote_dias',
      duracao_dias: dias,
      valor: preco,
      forma_pagamento: 'Pix',
      condicao_pagamento: 'à vista na contratação',
      aplicar_juros_multa: false,
      clausulas: '',
    }));
    avisar(`Pacote de ${dias} dias (R$ ${preco}) aplicado!`);
  };

  const valorNumerico = Number(form.valor) || 0;

  // Gera preview das cláusulas dinâmicas (Completo ou Simplificado)
  const clausulasGeradas = useMemo(() => {
    if (!form.cliente_id) return '';

    if (form.formato_modelo === 'simplificado') {
      return gerarClausulasSimplificado({
        cliente_nome: clienteSelecionado?.nome ?? '',
        cliente_documento: clienteSelecionado?.documento ?? '',
        cliente_endereco: clienteSelecionado?.endereco ? `${clienteSelecionado.endereco}, ${clienteSelecionado.cidade ?? ''} - ${clienteSelecionado.uf ?? ''}` : '',
        cliente_responsavel: clienteSelecionado?.responsavel ?? clienteSelecionado?.nome ?? '',
        valor: valorNumerico,
        duracao_dias: Number(form.duracao_dias) || 7,
        forma_pagamento: form.forma_pagamento || 'Pix',
        condicao_pagamento: form.condicao_pagamento || 'à vista na contratação',
        servicos_lista: form.servicos ? form.servicos.split('\n').filter(Boolean) : servicosDoCliente,
      });
    }

    return gerarClausulasCompleto({
      cliente_nome: clienteSelecionado?.nome ?? '',
      cliente_documento: clienteSelecionado?.documento ?? '',
      cliente_endereco: clienteSelecionado?.endereco ? `${clienteSelecionado.endereco}, ${clienteSelecionado.cidade ?? ''} - ${clienteSelecionado.uf ?? ''}` : '',
      cliente_responsavel: clienteSelecionado?.responsavel ?? clienteSelecionado?.nome ?? '',
      tipo_cobranca: form.tipo_cobranca,
      valor: valorNumerico,
      dia_vencimento: Number(form.dia_vencimento) || 10,
      duracao_dias: Number(form.duracao_dias) || 30,
      data_vencimento: form.data_vencimento,
      forma_pagamento: form.forma_pagamento,
      condicao_pagamento: form.condicao_pagamento,
      parcelas_qtd: Number(form.parcelas_qtd) || 2,
      aplicar_juros_multa: form.aplicar_juros_multa,
      multa_atraso_perc: Number(form.multa_atraso_perc) || 2,
      juros_atraso_perc: Number(form.juros_atraso_perc) || 1,
      aviso_previo_dias: Number(form.aviso_previo_dias) || 30,
      fidelidade_meses: Number(form.fidelidade_meses) || 0,
      multa_rescisoria: Number(form.multa_rescisoria) || 0,
      reajuste_indice: form.reajuste_indice,
      reajuste_percentual: form.reajuste_percentual ? Number(form.reajuste_percentual) : null,
      servicos_lista: form.servicos ? form.servicos.split('\n').filter(Boolean) : servicosDoCliente,
    });
  }, [form, clienteSelecionado, valorNumerico, servicosDoCliente]);

  const abrirFormulario = (tipo: FormatoModeloContrato = 'completo') => {
    setForm({
      cliente_id: '',
      formato_modelo: tipo,
      servicos: '',
      tipo_cobranca: tipo === 'simplificado' ? 'pacote_dias' : 'mensal',
      valor: tipo === 'simplificado' ? 147 : '',
      dia_vencimento: 10,
      duracao_dias: 7,
      data_vencimento: '',
      forma_pagamento: 'Pix',
      condicao_pagamento: 'à vista na contratação',
      parcelas_qtd: 2,
      aplicar_juros_multa: tipo === 'completo',
      multa_atraso_perc: cfg?.multa_padrao ?? 2,
      juros_atraso_perc: cfg?.juros_padrao ?? 1,
      vigencia_inicio: hoje(),
      vigencia_fim: '',
      fidelidade_meses: 12,
      aviso_previo_dias: 30,
      multa_rescisoria: 0,
      reajuste_indice: 'ipca',
      reajuste_percentual: '',
      clausulas: '',
    });
    setFormAberto(true);
  };

  const criar = () => {
    if (!form.cliente_id) { avisar('Selecione um cliente.'); return; }
    const cli = clientes.find(c => c.id === form.cliente_id);
    const agora = new Date().toISOString();
    const clausulasFinal = form.clausulas.trim() || clausulasGeradas;
    const novo: Contrato = {
      id: novoId(),
      numero: gerarNumero(contratos),
      cliente_id: form.cliente_id,
      cliente_nome: cli?.nome ?? '',
      formato_modelo: form.formato_modelo,
      servicos: form.servicos ? form.servicos.split('\n').filter(Boolean) : servicosDoCliente,
      tipo_cobranca: form.tipo_cobranca,
      valor: valorNumerico,
      dia_vencimento: form.tipo_cobranca === 'mensal' ? Number(form.dia_vencimento) || 10 : undefined,
      duracao_dias: form.tipo_cobranca === 'pacote_dias' ? Number(form.duracao_dias) || 7 : undefined,
      data_vencimento: form.data_vencimento || undefined,
      forma_pagamento: form.forma_pagamento,
      condicao_pagamento: form.condicao_pagamento || undefined,
      parcelas_qtd: form.tipo_cobranca === 'parcelado' ? Number(form.parcelas_qtd) || 2 : undefined,
      aplicar_juros_multa: form.aplicar_juros_multa,
      multa_atraso_perc: form.aplicar_juros_multa ? Number(form.multa_atraso_perc) || 2 : undefined,
      juros_atraso_perc: form.aplicar_juros_multa ? Number(form.juros_atraso_perc) || 1 : undefined,
      vigencia_inicio: form.vigencia_inicio,
      vigencia_fim: form.vigencia_fim || null,
      fidelidade_meses: form.formato_modelo === 'completo' ? Number(form.fidelidade_meses) : 0,
      aviso_previo_dias: form.formato_modelo === 'completo' ? Number(form.aviso_previo_dias) : 0,
      multa_rescisoria: form.formato_modelo === 'completo' ? Number(form.multa_rescisoria) : 0,
      reajuste_indice: form.formato_modelo === 'completo' ? form.reajuste_indice : 'nenhum',
      reajuste_percentual: form.reajuste_percentual ? Number(form.reajuste_percentual) : null,
      clausulas: clausulasFinal,
      status: 'gerado',
      assinado_em: null,
      pdf_assinado_url: null,
      criado_em: agora,
      atualizado_em: agora,
    };
    salvarLista([novo, ...contratos]);
    setFormAberto(false);
    avisar(`Contrato ${novo.numero} gerado com sucesso!`);
  };

  const mudarStatus = (c: Contrato, status: Contrato['status']) => {
    const agora = new Date().toISOString();
    const atualizado = { ...c, status, atualizado_em: agora, assinado_em: status === 'assinado' ? agora : c.assinado_em };
    salvarLista(contratos.map(x => x.id === c.id ? atualizado : x));
    setDetalhes(d => d?.id === c.id ? atualizado : d);
    avisar(`Contrato marcado como ${LABEL_STATUS[status].toLowerCase()}`);
  };

  const excluir = (id: string) => {
    salvarLista(contratos.filter(c => c.id !== id));
    setDetalhes(null);
    avisar('Contrato excluído');
  };

  const copiarNumero = (c: Contrato) => {
    navigator.clipboard.writeText(c.numero).then(() => avisar('Número copiado!')).catch(() => {});
  };

  const imprimir = (c: Contrato) => {
    try {
      const cli = clientes.find(x => x.id === c.cliente_id);
      const janela = window.open('', '_blank');
      if (!janela) {
        avisar('A janela de impressão foi bloqueada pelo navegador. Permita pop-ups.');
        return;
      }
      const clausulasTexto = c.clausulas || '';
      const clausulasHtml = clausulasTexto
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
      const valFmt = c.valor ? Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'A combinar';
      const modRotulo = (c.tipo_cobranca && ROTULOS_TIPO_COBRANCA[c.tipo_cobranca]) || 'Mensal';
      const servicosLista = Array.isArray(c.servicos) ? c.servicos : [];
      const eSimplificado = c.formato_modelo === 'simplificado';

      janela.document.write(`<html><head><title>Contrato ${c.numero}</title>
      <style>
        @page { margin: 2cm; }
        body { font-family: 'Arial', sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.7; color: #1a1a1a; font-size: 14px; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 8px; }
        h2 { font-size: 14px; margin-top: 24px; }
        .cabecalho { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
        .empresa { font-size: 12px; color: #555; }
        .num { font-size: 12px; margin-top: 4px; }
        p { margin: 8px 0; }
        .assinaturas { margin-top: 50px; display: flex; gap: 60px; }
        .assinatura { flex: 1; border-top: 1px solid #333; padding-top: 8px; font-size: 13px; text-align: center; }
        pre { white-space: pre-wrap; font-family: inherit; }
      </style></head><body>
      <div class="cabecalho">
        ${cfg?.logo_url ? `<img src="${cfg.logo_url}" style="max-height:60px;margin-bottom:8px" />` : ''}
        <h1>${eSimplificado ? 'TERMO DE ADESÃO — PACOTE DE MARKETING DIGITAL' : 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS'}</h1>
        <div class="num"><strong>Documento nº:</strong> ${c.numero}</div>
        <div class="empresa">Continental MKT — Serviços de Marketing Digital</div>
      </div>
      <p><strong>Cliente:</strong> ${cli?.nome ?? c.cliente_nome}</p>
      <p><strong>CPF/CNPJ:</strong> ${cli?.documento ?? '—'}</p>
      <p><strong>Modalidade:</strong> ${modRotulo}${c.duracao_dias ? ` (${c.duracao_dias} dias)` : ''} &nbsp;|&nbsp; <strong>Valor do Pacote:</strong> R$ ${valFmt}</p>
      <p><strong>Início da Vigência:</strong> ${data(c.vigencia_inicio)}${c.vigencia_fim ? ` &nbsp;|&nbsp; <strong>Término:</strong> ${data(c.vigencia_fim)}` : ''}</p>
      ${c.assinado_em ? `<p><strong>Assinado em:</strong> ${data(c.assinado_em)}</p>` : ''}
      ${servicosLista.length > 0 && !eSimplificado ? `<h2>Serviços Contratados</h2><ul>${servicosLista.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
      <h2>${eSimplificado ? 'Termos e Condições do Pacote' : 'Cláusulas e Condições Gerais'}</h2>
      <div style="text-align:justify"><p>${clausulasHtml}</p></div>
      <div class="assinaturas">
        <div class="assinatura">
          <p><strong>Continental MKT</strong></p>
          <p>Contratada</p>
        </div>
        <div class="assinatura">
          <p><strong>${cli?.nome ?? c.cliente_nome}</strong></p>
          <p>Contratante${cli?.documento ? ` — ${cli.documento}` : ''}</p>
        </div>
      </div>
      <p style="text-align:center;margin-top:40px;font-size:12px;color:#888">Gerado pelo Continental Atlas em ${new Date().toLocaleDateString('pt-BR')}</p>
      </body></html>`);
      janela.document.close();
      janela.focus();
      setTimeout(() => {
        try { janela.print(); } catch {}
      }, 300);
    } catch (e) {
      avisar('Erro ao gerar visualização de impressão.');
    }
  };

  return (
    <>
      <CabecalhoTela
        titulo="Contratos"
        icone={<FileSignature size={28} strokeWidth={1.6} />}
        subtitulo={`${contratos.length} contrato${contratos.length !== 1 ? 's' : ''} · ${contratos.filter(c => c.status === 'assinado').length} assinado${contratos.filter(c => c.status === 'assinado').length !== 1 ? 's' : ''}`}
        acoes={
          <div className="linha" style={{ gap: 8 }}>
            <Botao onClick={() => abrirFormulario('simplificado')}>
              <Zap size={16} /> Pacote Rápido (7-14 Dias)
            </Botao>
            <Botao variante="primario" onClick={() => abrirFormulario('completo')}>
              <Plus size={17} /> Novo Contrato
            </Botao>
          </div>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <select className="entrada" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: 'auto' }}>
          <option value="todos">Todos os status</option>
          {Object.entries(LABEL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vazio
          texto="Nenhum contrato encontrado."
          acao={
            <div className="linha" style={{ gap: 8 }}>
              <Botao onClick={() => abrirFormulario('simplificado')}><Zap size={15} /> Pacote Rápido</Botao>
              <Botao variante="primario" onClick={() => abrirFormulario('completo')}><Plus size={15} /> Novo Contrato</Botao>
            </div>
          }
        />
      ) : (
        <Card>
          <div className="lista">
            {lista.map(c => (
              <div key={c.id} className="item" onClick={() => setDetalhes(c)} style={{ cursor: 'pointer' }}>
                <div className="cresce">
                  <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span className="titulo">{c.numero} — {c.cliente_nome}</span>
                    <Chip cor={COR_STATUS[c.status]}>{LABEL_STATUS[c.status]}</Chip>
                    {c.formato_modelo === 'simplificado' ? (
                      <Chip cor="destaque">⚡ Pacote Rápido</Chip>
                    ) : (
                      <Chip>📑 Completo</Chip>
                    )}
                    {c.tipo_cobranca && ROTULOS_TIPO_COBRANCA[c.tipo_cobranca] && (
                      <Chip>{ROTULOS_TIPO_COBRANCA[c.tipo_cobranca]}</Chip>
                    )}
                  </div>
                  <div className="pequeno secundario">
                    {c.valor ? `R$ ${Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · ` : ''}
                    {c.duracao_dias ? `${c.duracao_dias} dias · ` : ''}
                    Início: {data(c.vigencia_inicio)}{c.vigencia_fim ? ` · Fim: ${data(c.vigencia_fim)}` : ''}
                    {c.assinado_em ? ` · Assinado em ${data(c.assinado_em)}` : ''}
                    {Array.isArray(c.servicos) && c.servicos.length > 0 && ` · ${c.servicos.length} serviço${c.servicos.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <ChevronRight size={18} className="secundario" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Formulário de Criação */}
      <Modal
        titulo={form.formato_modelo === 'simplificado' ? '⚡ Novo Pacote Rápido (Contrato Simplificado)' : '📑 Novo Contrato Completo'}
        aberto={formAberto}
        aoFechar={() => setFormAberto(false)}
        rodape={
          <div className="linha" style={{ gap: 8 }}>
            <Botao onClick={() => { if (form.cliente_id) setPreviewAberto(true); else avisar('Selecione um cliente primeiro.'); }}>
              <Eye size={15} /> Preview das Cláusulas
            </Botao>
            <Botao variante="primario" onClick={criar}><CheckCircle2 size={15} /> Gerar Contrato</Botao>
          </div>
        }
      >
        <div className="coluna" style={{ gap: 14 }}>
          {/* Seletor de Modelo */}
          <div style={{ padding: '10px 12px', background: 'var(--vidro-painel-a)', borderRadius: 10, border: '1px solid var(--vidro-borda)' }}>
            <span className="pequeno secundario" style={{ display: 'block', marginBottom: 6 }}>Modelo do Contrato:</span>
            <div className="linha" style={{ gap: 8 }}>
              <button
                type="button"
                className={`btn ${form.formato_modelo === 'simplificado' ? 'btn-primario' : 'btn-secundario'}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                onClick={() => {
                  set('formato_modelo', 'simplificado');
                  set('tipo_cobranca', 'pacote_dias');
                  if (!form.valor) set('valor', 147);
                  if (!form.duracao_dias) set('duracao_dias', 7);
                  set('aplicar_juros_multa', false);
                }}
              >
                <Zap size={15} /> ⚡ Pacote Rápido (7-30 Dias)
              </button>
              <button
                type="button"
                className={`btn ${form.formato_modelo === 'completo' ? 'btn-primario' : 'btn-secundario'}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                onClick={() => set('formato_modelo', 'completo')}
              >
                <FileText size={15} /> 📑 Contrato Completo
              </button>
            </div>
          </div>

          {/* Atalhos rápidos para pacotes de dias (ex: 7 dias 147) */}
          {form.formato_modelo === 'simplificado' && (
            <div>
              <span className="pequeno secundario" style={{ display: 'block', marginBottom: 6 }}>Preenchimento com 1 toque:</span>
              <div className="linha" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="chip" style={{ cursor: 'pointer', padding: '4px 10px' }} onClick={() => aplicarPacoteRapido(7, 147)}>
                  🚀 7 Dias por R$ 147
                </button>
                <button type="button" className="chip" style={{ cursor: 'pointer', padding: '4px 10px' }} onClick={() => aplicarPacoteRapido(14, 297)}>
                  🚀 14 Dias por R$ 297
                </button>
                <button type="button" className="chip" style={{ cursor: 'pointer', padding: '4px 10px' }} onClick={() => aplicarPacoteRapido(21, 397)}>
                  🚀 21 Dias por R$ 397
                </button>
                <button type="button" className="chip" style={{ cursor: 'pointer', padding: '4px 10px' }} onClick={() => aplicarPacoteRapido(30, 497)}>
                  🚀 30 Dias por R$ 497
                </button>
              </div>
            </div>
          )}

          {/* Seção 1: Cliente e Serviços */}
          <Campo rotulo="Cliente *">
            <select className="entrada" value={form.cliente_id} onChange={e => selecionarCliente(e.target.value)} autoFocus>
              <option value="">Selecionar cliente...</option>
              {clientes.filter(c => c.status === 'ativo').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>

          {form.cliente_id && (
            <div style={{ padding: '8px 12px', background: 'var(--vidro-painel-a)', borderRadius: 8, border: '1px solid var(--vidro-borda)' }}>
              <div className="pequeno"><strong>Documento:</strong> {clienteSelecionado?.documento || 'Não informado'} · <strong>Responsável:</strong> {clienteSelecionado?.responsavel || clienteSelecionado?.nome}</div>
            </div>
          )}

          {/* Seção 2: Valor e Condições do Pacote */}
          <div style={{ borderTop: '1px solid var(--vidro-borda)', paddingTop: 12 }}>
            <span className="titulo-card" style={{ fontSize: 15, display: 'block', marginBottom: 10 }}>
              💰 Valor e Duração do Pacote
            </span>

            <div className="grade grade-2">
              <Campo rotulo="Valor a Cobrar (R$) *">
                <input
                  className="entrada"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={e => set('valor', e.target.value)}
                  placeholder="Ex: 147.00"
                />
              </Campo>

              {form.formato_modelo === 'simplificado' ? (
                <Campo rotulo="Duração da Campanha (Dias)">
                  <input
                    className="entrada"
                    type="number"
                    min="1"
                    value={form.duracao_dias}
                    onChange={e => set('duracao_dias', Number(e.target.value))}
                    placeholder="Ex: 7, 14, 21, 30"
                  />
                </Campo>
              ) : (
                <Campo rotulo="Modalidade de Cobrança">
                  <select className="entrada" value={form.tipo_cobranca} onChange={e => set('tipo_cobranca', e.target.value as TipoCobrancaContrato)}>
                    <option value="mensal">📅 Mensal Fixo (recorrente)</option>
                    <option value="unico">⚡ Pagamento Único (à vista)</option>
                    <option value="pacote_dias">⏳ Pacote por Período / Dias</option>
                    <option value="parcelado">💳 Parcelado</option>
                  </select>
                </Campo>
              )}
            </div>

            <div className="grade grade-2" style={{ marginTop: 10 }}>
              <Campo rotulo="Forma de Pagamento">
                <input
                  className="entrada"
                  value={form.forma_pagamento}
                  onChange={e => set('forma_pagamento', e.target.value)}
                  placeholder="Ex: Pix, Boleto bancário, Cartão"
                />
              </Campo>
              <Campo rotulo="Condição / Prazo">
                <input
                  className="entrada"
                  value={form.condicao_pagamento}
                  onChange={e => set('condicao_pagamento', e.target.value)}
                  placeholder="Ex: à vista na contratação"
                />
              </Campo>
            </div>

            {/* Campos adicionais para contrato completo */}
            {form.formato_modelo === 'completo' && form.tipo_cobranca === 'mensal' && (
              <div className="grade grade-2" style={{ marginTop: 10 }}>
                <Campo rotulo="Dia do Vencimento no Mês (1 a 31)">
                  <input
                    className="entrada"
                    type="number"
                    min="1"
                    max="31"
                    value={form.dia_vencimento}
                    onChange={e => set('dia_vencimento', Number(e.target.value))}
                    placeholder="Ex: 10"
                  />
                </Campo>
                <Campo rotulo="Fidelidade (meses)">
                  <input className="entrada" type="number" min="0" value={form.fidelidade_meses} onChange={e => set('fidelidade_meses', e.target.value)} />
                </Campo>
              </div>
            )}
          </div>

          <Campo rotulo="Serviços incluídos (opcional — deixe em branco para o padrão do pacote)">
            <textarea className="entrada" rows={3} value={form.servicos} onChange={e => set('servicos', e.target.value)}
              placeholder="Ex: Gestão de anúncios no Instagram e Facebook&#10;Otimização diária de verba e público&#10;Relatório de desempenho" />
          </Campo>

          {/* Cláusulas manuais */}
          <Campo rotulo="Cláusulas personalizadas (opcional — deixe vazio para usar o modelo automático)">
            <div>
              <AssistenteTexto valor={form.clausulas} aoCorrigir={v => set('clausulas', v)} />
              <textarea className="entrada" rows={4} value={form.clausulas} onChange={e => set('clausulas', e.target.value)}
                placeholder="Deixe vazio para usar o modelo gerado automaticamente com os dados e condições configuradas..."
                style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 4 }} />
            </div>
          </Campo>
        </div>
      </Modal>

      {/* Modal Preview das Cláusulas */}
      <Modal titulo={`Preview do Contrato — ${form.cliente_id ? clientes.find(c => c.id === form.cliente_id)?.nome : ''}`}
        aberto={previewAberto} aoFechar={() => setPreviewAberto(false)}>
        <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 }}>
          <pre style={{ fontFamily: 'inherit', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--texto)' }}>
            {form.clausulas.trim() || clausulasGeradas}
          </pre>
        </div>
      </Modal>

      {/* Modal Detalhes do Contrato */}
      <Modal titulo={`Contrato ${detalhes?.numero}`} aberto={!!detalhes} aoFechar={() => setDetalhes(null)}>
        {detalhes && (
          <div className="coluna" style={{ gap: 16 }}>
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip cor={COR_STATUS[detalhes.status]}>{LABEL_STATUS[detalhes.status]}</Chip>
              {detalhes.formato_modelo === 'simplificado' ? (
                <Chip cor="destaque">⚡ Pacote Rápido</Chip>
              ) : (
                <Chip>📑 Completo</Chip>
              )}
              {detalhes.tipo_cobranca && ROTULOS_TIPO_COBRANCA[detalhes.tipo_cobranca] && (
                <Chip>{ROTULOS_TIPO_COBRANCA[detalhes.tipo_cobranca]}</Chip>
              )}
              <span className="secundario pequeno">Gerado em {data(detalhes.criado_em)}</span>
            </div>
            <div className="lista">
              <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Cliente</span><strong>{detalhes.cliente_nome || 'Não informado'}</strong></div>
              <div className="item" style={{ cursor: 'default' }}>
                <span className="cresce secundario">Valor do Pacote</span>
                <strong>{detalhes.valor ? `R$ ${Number(detalhes.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A combinar'}</strong>
              </div>
              {detalhes.duracao_dias && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Duração da campanha</span><span>{detalhes.duracao_dias} dias</span></div>}
              {detalhes.forma_pagamento && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Forma de pagamento</span><span>{detalhes.forma_pagamento}</span></div>}
              {detalhes.dia_vencimento && detalhes.formato_modelo !== 'simplificado' && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Vencimento mensal</span><span>Todo dia {detalhes.dia_vencimento}</span></div>}
              <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Vigência</span><span>{data(detalhes.vigencia_inicio)}{detalhes.vigencia_fim ? ` até ${data(detalhes.vigencia_fim)}` : ''}</span></div>
              {detalhes.assinado_em && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Assinado em</span><span>{data(detalhes.assinado_em)}</span></div>}
            </div>
            {Array.isArray(detalhes.servicos) && detalhes.servicos.length > 0 && (
              <div>
                <p className="pequeno secundario" style={{ marginBottom: 4 }}>Serviços:</p>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {detalhes.servicos.map((s, i) => <li key={i} className="pequeno">{s}</li>)}
                </ul>
              </div>
            )}

            {/* Preview das cláusulas */}
            <div>
              <p className="pequeno secundario" style={{ marginBottom: 4 }}>Termos e Cláusulas:</p>
              <div style={{ maxHeight: 220, overflowY: 'auto', padding: 12, background: 'var(--vidro-painel-a)', borderRadius: 8, border: '1px solid var(--vidro-borda)' }}>
                <pre style={{ fontFamily: 'inherit', fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', color: 'var(--texto)' }}>
                  {detalhes.clausulas || 'Sem cláusulas cadastradas.'}
                </pre>
              </div>
            </div>

            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Botao onClick={() => imprimir(detalhes)}><Printer size={14} /> Imprimir / PDF</Botao>
              <Botao onClick={() => copiarNumero(detalhes)}><Copy size={14} /> Copiar Nº</Botao>
              {detalhes.status === 'gerado' && <Botao onClick={() => mudarStatus(detalhes, 'enviado')}>Marcar Enviado</Botao>}
              {detalhes.status === 'enviado' && <Botao variante="primario" onClick={() => mudarStatus(detalhes, 'assinado')}><CheckCircle2 size={14} /> Marcar Assinado</Botao>}
              {detalhes.status === 'assinado' && (
                <>
                  <label className="botao" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Upload size={14} /> Upload PDF Assinado
                    <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        const atualizado = { ...detalhes, pdf_assinado_url: url, atualizado_em: new Date().toISOString() };
                        salvarLista(contratos.map(x => x.id === detalhes.id ? atualizado : x));
                        setDetalhes(atualizado);
                        avisar('PDF assinado salvo!');
                      }
                    }} />
                  </label>
                  <Botao onClick={() => mudarStatus(detalhes, 'encerrado')}>Encerrar</Botao>
                </>
              )}
              {detalhes.pdf_assinado_url && (
                <Botao onClick={() => window.open(detalhes.pdf_assinado_url!, '_blank')}>
                  <Eye size={14} /> Ver PDF Assinado
                </Botao>
              )}
              {detalhes.status !== 'assinado' && detalhes.status !== 'encerrado' && (
                <Botao variante="perigo" onClick={() => { if (confirm('Excluir este contrato?')) excluir(detalhes.id); }}><Trash2 size={14} /> Excluir</Botao>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
