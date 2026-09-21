// Utilitário de Correção e Aprimoramento de Texto em Português (Offline First)
// Continental Atlas

export interface OpcoesAprimoramento {
  tom?: 'original' | 'profissional' | 'comercial' | 'amigavel';
  formatarWhatsapp?: boolean;
}

// Dicionário de erros e trocas frequentes em português
const SUBSTITUICOES_COMUNS: [RegExp, string][] = [
  // Espaçamentos e pontuações
  [/\s+([.,!?:;])/g, '$1'],
  [/([.,!?:;])(?=[^\s\d,.:;?!'])/g, ' '],
 [/\s{2,}/g, ' '],
 [/\?{2,}/g, '?'],
 [/!{2,}/g, '!'],
 [/\.{4,}/g, '...'],

 // Palavras e erros comuns de digitação/ortografia em português
 [/\bvoce\b/gi, 'você'],
 [/\bvoces\b/gi, 'vocês'],
 [/\btambem\b/gi, 'também'],
 [/\bja\b/gi, 'já'],
 [/\bate\b/gi, 'até'],
 [/\bnao\b/gi, 'não'],
 [/\bentao\b/gi, 'então'],
 [/\bserio\b/gi, 'sério'],
 [/\bhorario\b/gi, 'horário'],
 [/\bhorarios\b/gi, 'horários'],
 [/\breuniao\b/gi, 'reunião'],
 [/\breunioes\b/gi, 'reuniões'],
 [/\bnumero\b/gi, 'número'],
 [/\bnumeros\b/gi, 'números'],
 [/\bposso\s+ta\b/gi, 'posso estar'],
 [/\bvou\s+ta\b/gi, 'vou'],
 [/\bvamos\s+ta\b/gi, 'vamos'],
 [/\bagente\s+vamos\b/gi, 'nós vamos'],
 [/\bagente\s+vai\b/gi, 'a gente vai'],
 [/\bmais\s+tarde\b/gi, 'mais tarde'],
 [/\bconcerteza\b/gi, 'com certeza'],
 [/\bporisso\b/gi, 'por isso'],
 [/\bapartir\s+de\b/gi, 'a partir de'],
 [/\bderrepente\b/gi, 'de repente'],
 [/\bpor\s+causa\s+que\b/gi, 'porque'],
 [/\bfaz\s+anos\b/gi, 'faz anos'],
 [/\bfazem\s+(\d+)\s+anos\b/gi, 'faz anos'],
 [/\bseje\b/gi, 'seja'],
 [/\besteje\b/gi, 'esteja'],
 [/\bmenas\b/gi, 'menos'],
 [/\bbeneficio\b/gi, 'benefício'],
 [/\bbeneficios\b/gi, 'benefícios'],
 [/\bproposta\b/gi, 'proposta'],
 [/\borcamento\b/gi, 'orçamento'],
 [/\borcamentos\b/gi, 'orçamentos'],
 [/\bcobranca\b/gi, 'cobrança'],
 [/\bcobrancas\b/gi, 'cobranças'],
 [/\bduvida\b/gi, 'dúvida'],
 [/\bduvidas\b/gi, 'dúvidas'],
 [/\bpagina\b/gi, 'página'],
 [/\bpaginas\b/gi, 'páginas'],
 [/\banalise\b/gi, 'análise'],
 [/\brelatorio\b/gi, 'relatório'],
 [/\brelatorios\b/gi, 'relatórios'],
 [/\bproximo\b/gi, 'próximo'],
 [/\bproxima\b/gi, 'próxima'],
 [/\botimo\b/gi, 'ótimo'],
 [/\botima\b/gi, 'ótima'],
 [/\bgratis\b/gi, 'grátis'],
 [/\bdisponivel\b/gi, 'disponível'],
 [/\bdisponiveis\b/gi, 'disponíveis'],
 [/\bposivel\b/gi, 'possível'],
 [/\bpossivel\b/gi, 'possível'],
 [/\bpossiveis\b/gi, 'possíveis'],
 [/\bnegocio\b/gi, 'negócio'],
 [/\bnegocios\b/gi, 'negócios'],
 [/\bpublico\b/gi, 'público'],
 [/\bpublicos\b/gi, 'públicos'],
 [/\bconteudo\b/gi, 'conteúdo'],
 [/\bconteudos\b/gi, 'conteúdos'],
 [/\bmidia\b/gi, 'mídia'],
 [/\bmidias\b/gi, 'mídias'],
 [/\banuncio\b/gi, 'anúncio'],
 [/\banuncios\b/gi, 'anúncios'],
 [/\bpadrao\b/gi, 'padrão'],
 [/\bconfiguracao\b/gi, 'configuração'],
 [/\bconfiguracoes\b/gi, 'configurações'],
];

export function capitalizarSentencas(texto: string): string {
 if (!texto) return '';
 return texto.replace(/(^\s*|[.!?]\s+)([a-zà-ú])/g, (_, prefixo, letra) => {
 return prefixo + letra.toUpperCase();
 });
}

export function corrigirTextoPtBr(texto: string): string {
 if (!texto) return '';
 let corrigido = texto;
 for (const [padrao, substituicao] of SUBSTITUICOES_COMUNS) {
 corrigido = corrigido.replace(padrao, substituicao);
 }
 return capitalizarSentencas(corrigido);
}

export function aprimorarTexto(texto: string, opcoes: OpcoesAprimoramento = {}): string {
 let resultado = corrigirTextoPtBr(texto);

 if (opcoes.tom === 'profissional') {
 resultado = resultado
 .replace(/\bolá\b/gi, 'Prezado(a)')
 .replace(/\boi\b/gi, 'Olá')
 .replace(/\bvaleu\b/gi, 'Agradecemos a atenção')
 .replace(/\bblz\b|\bbeleza\b/gi, 'Combinado')
 .replace(/\btá\b|\bta\b/gi, 'está');
 resultado = capitalizarSentencas(resultado);
 } else if (opcoes.tom === 'comercial') {
 resultado = resultado
 .replace(/\bvc\b/gi, 'você')
 .replace(/\bpq\b/gi, 'porque')
 .replace(/\bq\b/gi, 'que');
 resultado = capitalizarSentencas(resultado);
 } else if (opcoes.tom === 'amigavel') {
 resultado = resultado
 .replace(/\bPrezado\(a\)\b/gi, 'Olá')
 .replace(/\bAtenciosamente,\b/gi, 'Um grande abraço!');
 resultado = capitalizarSentencas(resultado);
 }

 if (opcoes.formatarWhatsapp) {
 resultado = resultado
 .replace(/^-\s+/gm, '👉 ')
 .replace(/^\*\s+/gm, '✅ ');
 }

 return resultado;
}

const CHAVE_STORAGE = 'atlas_corretor_ativo';

export function obterStatusCorretor(): boolean {
 try {
 const val = localStorage.getItem(CHAVE_STORAGE);
 return val === null ? true : val === 'true';
 } catch {
 return true;
 }
}

export function definirStatusCorretor(ativo: boolean) {
 try {
 localStorage.setItem(CHAVE_STORAGE, String(ativo));
 window.dispatchEvent(new CustomEvent('atlas-corretor-mudar', { detail: { ativo } }));
 } catch {}
}
