/**
 * importarTxt.ts — Parser inteligente de texto livre (proposta, briefing, anotações)
 * para extrair dados do cliente automaticamente.
 * 
 * Reconhece dados cadastrais, serviços contratados, pacotes e configurações de tráfego.
 */

export interface DadosExtraidos {
  nome: string;
  nome_fantasia: string;
  responsavel: string;
  whatsapp: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  endereco: string;
  nicho: string;
  instagram: string;
  site: string;
  observacoes_extras: string;
  
  // Serviço / Pacote contratado
  servico_nome?: string;
  pacote_nome?: string;
  valor?: number;
  duracao_dias?: number;
  tipo_cobranca?: 'pacote' | 'mensal';
  
  // Tráfego / Campanha
  regiao_divulgacao?: string;
  publico_alvo?: string;
  objetivo_campanha?: string;
  meta_alcance?: string;
}

// Limpa marcadores markdown e emojis do valor extraído
function limpar(v: string): string {
  return v
    .replace(/\*\*/g, '')              // **negrito**
    .replace(/^#+\s*/, '')            // ## títulos
    .replace(/📋|👤|🏢|💆|📍|📮|📲|📅|💰|🎨|📌|📏|🎯|📢|💆|📈|📲|👥|👩|🎂|💬|📞|📱|➡️|✨|🗓️|⬇️|✅|❌|🟢|🟡|🔴|☁️|🌐|📊|🔑|📄|💡|⭐|⚠️|🤝|📑|⚡/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrai valor após padrões como "Campo: Valor" ou "**Campo:** Valor"
function extrair(texto: string, padroes: string[]): string {
  for (const padrao of padroes) {
    const regex = new RegExp(
      `(?:\\*{0,2})${padrao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\*{0,2})\\s*[:\\-–]\\s*(.+)`,
      'im'
    );
    const m = texto.match(regex);
    if (m?.[1]) return limpar(m[1].split(/[\n\r]/)[0]);
  }
  return '';
}

// Extrai telefone/WhatsApp de qualquer linha
function extrairFone(texto: string, padroes: string[]): string {
  const val = extrair(texto, padroes);
  if (val) return val;
  for (const padrao of padroes) {
    const linhas = texto.split('\n');
    for (const linha of linhas) {
      const limpaPadrao = new RegExp(padrao, 'i');
      if (limpaPadrao.test(linha)) {
        const fone = linha.match(/\(?\d{2}\)?\s*\d{4,5}[\s-]?\d{4}/);
        if (fone) return fone[0].trim();
      }
    }
  }
  return '';
}

// Extrai número financeiro de strings como "R$ 247,00" ou "247"
function extrairValorNumerico(str: string): number {
  if (!str) return 0;
  const limpo = str.replace(/[^\d,\.]/g, '');
  if (!limpo) return 0;
  // Trata formato brasileiro (247,00)
  const padraoBr = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const num = parseFloat(padraoBr);
  return isNaN(num) ? 0 : num;
}

// Extrai número de dias de strings como "10 dias" ou "7d"
function extrairDias(str: string): number {
  if (!str) return 0;
  const m = str.match(/(\d+)\s*(?:dias?|d\b)/i);
  if (m) return parseInt(m[1], 10);
  const apenasNum = parseInt(str.replace(/\D/g, ''), 10);
  return isNaN(apenasNum) ? 0 : apenasNum;
}

// Extrai cidade e UF de strings como "Maceió – AL" ou "Maceió/AL" ou "Maceió - AL"
function extrairCidadeUF(cidadeRaw: string): { cidade: string; uf: string } {
  const m = cidadeRaw.match(/^(.+?)[\s–\-\/]+([A-Z]{2})\s*$/);
  if (m) return { cidade: m[1].trim(), uf: m[2].trim() };
  const uf = cidadeRaw.match(/\b([A-Z]{2})\b/);
  return {
    cidade: cidadeRaw.replace(/\b[A-Z]{2}\b/, '').replace(/[\s–\-\/]+$/, '').trim(),
    uf: uf ? uf[1] : ''
  };
}

// Normaliza handle do Instagram
function normalizarInstagram(v: string): string {
  return v.replace(/https?:\/\/(?:www\.)?instagram\.com\//, '@').replace(/\/$/, '');
}

export function parsearTexto(texto: string): Partial<DadosExtraidos> {
  const dados: Partial<DadosExtraidos> = {};

  // ── Nome / Cliente ──────────────────────────────────────────────────────────
  const nome = extrair(texto, ['Cliente', 'Nome', 'Nome completo', 'Razão social']);
  if (nome) dados.nome = nome;

  // ── Empresa / Nome fantasia ──────────────────────────────────────────────────
  const empresa = extrair(texto, ['Empresa', 'Nome fantasia', 'Estabelecimento']);
  if (empresa && empresa !== dados.nome) dados.nome_fantasia = empresa;

  // ── Responsável ─────────────────────────────────────────────────────────────
  const responsavel = extrair(texto, ['Responsável', 'Contato', 'Proprietário', 'Dono']);
  if (responsavel) dados.responsavel = responsavel;

  // ── Nicho / Segmento ────────────────────────────────────────────────────────
  const nicho = extrair(texto, ['Segmento', 'Nicho', 'Ramo', 'Setor', 'Atividade', 'Ramo de atividade']);
  if (nicho) dados.nicho = nicho;

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  const wpp = extrairFone(texto, ['WhatsApp', 'Whatsapp', 'WPP', 'Zap', 'Contato WhatsApp']);
  if (wpp) dados.whatsapp = wpp;

  // ── Telefone ────────────────────────────────────────────────────────────────
  const tel = extrairFone(texto, ['Telefone', 'Celular', 'Fone', 'Tel', 'Phone']);
  if (tel && tel !== dados.whatsapp) dados.telefone = tel;

  // ── E-mail ──────────────────────────────────────────────────────────────────
  const emailMatch = texto.match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  if (emailMatch) dados.email = emailMatch[0];

  // ── Cidade / UF ─────────────────────────────────────────────────────────────
  const cidadeRaw = extrair(texto, ['Cidade', 'Local', 'Localidade', 'Município', 'Localização', 'Região']);
  if (cidadeRaw) {
    const { cidade, uf } = extrairCidadeUF(cidadeRaw);
    if (cidade) dados.cidade = cidade;
    if (uf) dados.uf = uf;
  }

  // UF separado (se não veio da cidade)
  if (!dados.uf) {
    const ufRaw = extrair(texto, ['UF', 'Estado', 'Unidade federativa']);
    if (ufRaw) dados.uf = ufRaw.toUpperCase().slice(0, 2);
  }

  // ── CEP → endereço ──────────────────────────────────────────────────────────
  const cep = extrair(texto, ['CEP', 'Cep']);
  const enderecoRaw = extrair(texto, ['Endereço', 'Endereco', 'Rua', 'Logradouro', 'Address']);
  if (enderecoRaw) dados.endereco = enderecoRaw;
  else if (cep) dados.endereco = `CEP: ${cep}`;

  // ── Instagram ────────────────────────────────────────────────────────────────
  const insta = extrair(texto, ['Instagram', 'Insta', 'IG']);
  if (insta) dados.instagram = normalizarInstagram(insta);

  // ── Site ─────────────────────────────────────────────────────────────────────
  const site = extrair(texto, ['Site', 'Website', 'Web', 'URL', 'Link']);
  if (site) dados.site = site;

  // ── Pacote / Serviço / Investimento ──────────────────────────────────────────
  const pacote = extrair(texto, ['Pacote', 'Plano', 'Serviço']);
  if (pacote) dados.pacote_nome = pacote;

  const investimento = extrair(texto, ['Investimento', 'Valor', 'Preço', 'Mensalidade', 'Total']);
  if (investimento) {
    dados.valor = extrairValorNumerico(investimento);
  }

  const periodo = extrair(texto, ['Período', 'Periodo', 'Prazo', 'Duração', 'Vigência']);
  if (periodo) {
    dados.duracao_dias = extrairDias(periodo);
    dados.tipo_cobranca = 'pacote';
  } else if (texto.toLowerCase().includes('panfletagem') || texto.toLowerCase().includes('panfletos')) {
    dados.tipo_cobranca = 'pacote';
  }

  // Tráfego / Panfletagem
  if (texto.toLowerCase().includes('panfletagem') || texto.toLowerCase().includes('anúncios') || texto.toLowerCase().includes('tráfego')) {
    dados.servico_nome = 'Tráfego Pago';
  }

  // ── Região / Público / Objetivo / Meta ───────────────────────────────────────
  const regiao = extrair(texto, ['Região', 'Área de divulgação', 'Area de divulgacao', 'Abrangência']);
  if (regiao) dados.regiao_divulgacao = regiao;

  const publico = extrair(texto, ['Público-alvo', 'Publico-alvo', 'Publico alvo', 'Perfil', 'Público']);
  if (publico) dados.publico_alvo = publico;

  const objetivo = extrair(texto, ['Objetivo', 'Objetivo da campanha', 'Meta da campanha']);
  if (objetivo) dados.objetivo_campanha = objetivo;

  const meta = extrair(texto, ['Meta do pacote', 'Meta', 'Alcance estimado', 'Pessoas alcançadas']);
  if (meta) dados.meta_alcance = meta;

  // ── Observações extras estruturadas ─────────────────────────────────────────
  const extras: string[] = [];
  if (dados.pacote_nome) extras.push(`📦 Pacote: ${dados.pacote_nome}`);
  if (dados.duracao_dias) extras.push(`📅 Período: ${dados.duracao_dias} dias`);
  if (dados.valor) extras.push(`💰 Investimento: R$ ${dados.valor.toFixed(2)}`);
  if (dados.regiao_divulgacao) extras.push(`📍 Região: ${dados.regiao_divulgacao}`);
  if (dados.publico_alvo) extras.push(`👥 Público: ${dados.publico_alvo}`);
  if (dados.objetivo_campanha) extras.push(`🎯 Objetivo: ${dados.objetivo_campanha}`);
  if (dados.meta_alcance) extras.push(`📈 Meta: ${dados.meta_alcance}`);

  if (extras.length) dados.observacoes_extras = extras.join('\n');

  return dados;
}
