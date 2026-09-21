import { moeda, data, soDigitos } from './formato';
import type { Cliente, Cobranca } from './tipos';

// Mensagens prontas no tom "próximo e profissional". Na Fase 2 viram modelos editáveis
// em Configurações (tabela mensagem_modelos).

export function primeiroNome(c?: Cliente | null): string {
  const n = (c?.responsavel || c?.nome || '').trim();
  return n.split(/\s+/)[0] || 'tudo bem';
}

export function msgCobranca(c: Cobranca, cliente: Cliente | null | undefined, total: number, pix: string | null, acrescimos?: { multa: number; juros: number }) {
  const nome = primeiroNome(cliente);
  const blocoPix = pix ? `\n\nDeixei o Pix copia e cola logo abaixo pra facilitar:\n\n${pix}` : '';
  if (c.status === 'atrasada') {
    const detalhe = acrescimos && (acrescimos.multa || acrescimos.juros)
      ? ` O valor original é ${moeda(c.valor)}; com multa de ${moeda(acrescimos.multa)} e juros de ${moeda(acrescimos.juros)}, fica ${moeda(total)}.`
      : ` O valor é ${moeda(total)}.`;
    return `Oi, ${nome}, tudo bem? Ainda não identifiquei o pagamento de ${c.descricao.toLowerCase()}, que venceu em ${data(c.vencimento)}.${detalhe}${blocoPix}\n\nSe já pagou, é só me mandar o comprovante. Obrigado!`;
  }
  return `Oi, ${nome}, tudo bem? Passando pra lembrar que ${c.descricao.toLowerCase()}, no valor de ${moeda(total)}, vence no dia ${data(c.vencimento)}.${blocoPix}\n\nQualquer dúvida, é só me chamar!`;
}

export function linkWhatsApp(numero: string, texto: string): string {
  let d = soDigitos(numero);
  if (d && !d.startsWith('55')) d = `55${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}
