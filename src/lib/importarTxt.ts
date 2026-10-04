/**
 * importarTxt.ts — Parser inteligente de texto livre (proposta, briefing, anotações)
 * para extrair dados do cliente automaticamente.
 * 
 * Reconhece padrões como:
 *   Cliente: / **Cliente:** / Nome: / Empresa: / Segmento: / Nicho:
 *   WhatsApp: / Telefone: / E-mail: / Cidade: / CEP: / UF: / Estado:
 *   Instagram: / Site:
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
  observacoes_extras: string; // campos não mapeados que podem ser úteis
}

// Limpa marcadores markdown e emoji do valor extraído
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
  // Fallback: procura padrão de telefone brasileiro na linha que contém o padrão
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

// Extrai cidade e UF de strings como "Maceió – AL" ou "Maceió/AL" ou "Maceió - AL"
function extrairCidadeUF(cidadeRaw: string): { cidade: string; uf: string } {
  const m = cidadeRaw.match(/^(.+?)[\s–\-\/]+([A-Z]{2})\s*$/);
  if (m) return { cidade: m[1].trim(), uf: m[2].trim() };
  // Tenta extrair UF do próprio texto
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

  // ── Observações extras (objetivo, público-alvo, estratégia) ─────────────────
  const extras: string[] = [];
  const objetivo = extrair(texto, ['Objetivo', 'Objetivo da campanha', 'Meta']);
  if (objetivo) extras.push(`Objetivo: ${objetivo}`);

  const publico = extrair(texto, ['Público-alvo', 'Publico alvo', 'Público alvo', 'Perfil']);
  if (publico) extras.push(`Público: ${publico}`);

  const periodo = extrair(texto, ['Período', 'Periodo', 'Prazo', 'Duração']);
  if (periodo) extras.push(`Período: ${periodo}`);

  const investimento = extrair(texto, ['Investimento', 'Valor', 'Verba']);
  if (investimento) extras.push(`Investimento: ${investimento}`);

  if (extras.length) dados.observacoes_extras = extras.join(' | ');

  return dados;
}
