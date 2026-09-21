import { db } from './db';
import { criarSeNaoExistir } from './repo';
import type { Configuracao, Servico, Categoria, TarefaModelo } from './tipos';

// Dados iniciais com IDs fixos: se você usar o Atlas em dois aparelhos, os dois criam
// exatamente os mesmos registros e a sincronização não duplica nada.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const ID_CONFIG = id(1);
export const SERV = { trafego: id(101), site: id(102), social: id(103), gmn: id(104) };
export const CAT = { receitaServicos: id(201), verbaAdiantada: id(204), impostos: id(205) };

export async function semear() {
  if (await db.configuracoes.get(ID_CONFIG)) return;

  await criarSeNaoExistir<Configuracao>('configuracoes', {
    id: ID_CONFIG, empresa_nome: 'Continental MKT', responsavel_nome: '', cnpj: '', endereco: '',
    telefone: '', email: '', logo_url: null, pix_chave: '', pix_nome: '', pix_cidade: '',
    fuso_horario: 'America/Sao_Paulo', valor_hora: 0, mei: true, limite_mei: 81000,
    multa_padrao: 2, juros_padrao: 1
  });

  const servicos: Array<[string, Servico['chave'], string, Servico['tipo_cobranca_padrao']]> = [
    [SERV.trafego, 'trafego', 'Gestão de Tráfego Pago', 'mensal'],
    [SERV.site, 'site', 'Sites e Landing Pages', 'pacote'],
    [SERV.social, 'social', 'Social Media', 'mensal'],
    [SERV.gmn, 'gmn', 'Google Meu Negócio', 'mensal']
  ];
  for (const [sid, chave, nome, tipo] of servicos) {
    await criarSeNaoExistir<Servico>('servicos', { id: sid, chave, nome, descricao: '', tipo_cobranca_padrao: tipo, preco_base: 0, ativo: true });
  }

  const categorias: Array<[number, Categoria['carteira'], string, Categoria['tipo'], Categoria['especial']]> = [
    [201, 'negocio', 'Receita de Serviços', 'entrada', 'receita_servico'],
    [202, 'negocio', 'Outras Receitas', 'entrada', null],
    [203, 'negocio', 'Ferramentas e Assinaturas', 'saida', null],
    [204, 'negocio', 'Verba Adiantada', 'saida', 'verba_adiantada'],
    [205, 'negocio', 'Impostos', 'saida', 'imposto'],
    [206, 'negocio', 'Terceirizados', 'saida', null],
    [207, 'negocio', 'Equipamentos', 'saida', null],
    [208, 'negocio', 'Marketing Próprio', 'saida', null],
    [209, 'negocio', 'Outras Despesas', 'saida', null],
    [221, 'pessoal', 'Salário', 'entrada', null],
    [222, 'pessoal', 'Outras Receitas', 'entrada', null],
    [223, 'pessoal', 'Moradia', 'saida', null],
    [224, 'pessoal', 'Alimentação', 'saida', null],
    [225, 'pessoal', 'Transporte', 'saida', null],
    [226, 'pessoal', 'Saúde', 'saida', null],
    [227, 'pessoal', 'Educação', 'saida', null],
    [228, 'pessoal', 'Lazer', 'saida', null],
    [229, 'pessoal', 'Outras Despesas', 'saida', null]
  ];
  for (const [n, carteira, nome, tipo, especial] of categorias) {
    await criarSeNaoExistir<Categoria>('categorias', { id: id(n), carteira, nome, tipo, especial });
  }

  const modelos: Array<[number, string, TarefaModelo['tipo'], string, string[], number]> = [
    [301, 'Cliente Novo — Tráfego Pago', 'checklist', SERV.trafego, [
      'Pedir acesso ao Gerenciador de Negócios do Meta', 'Pedir acesso à conta do Google Ads',
      'Verificar pixel e eventos de conversão', 'Enviar o briefing', 'Fazer a reunião de alinhamento',
      'Definir verba mensal e metas de resultado'], 0],
    [302, 'Cliente Novo — Sites e Landing Pages', 'checklist', SERV.site, [
      'Enviar o briefing', 'Receber logo, textos e fotos', 'Definir domínio e hospedagem', 'Aprovar o layout com o cliente'], 0],
    [303, 'Cliente Novo — Social Media', 'checklist', SERV.social, [
      'Enviar o briefing', 'Pedir acesso ao Instagram e à página do Facebook', 'Definir a linha editorial',
      'Montar o calendário do primeiro mês'], 0],
    [304, 'Cliente Novo — Google Meu Negócio', 'checklist', SERV.gmn, [
      'Pedir acesso ao perfil da empresa', 'Conferir endereço, horário e telefone', 'Subir fotos novas',
      'Responder avaliações pendentes'], 0],
    [311, 'Mensal — Tráfego Pago', 'recorrente', SERV.trafego, ['Revisar campanhas e registrar otimizações', 'Conferir verba consumida do mês'], 15],
    [312, 'Mensal — Social Media', 'recorrente', SERV.social, ['Planejar o conteúdo do próximo mês'], 20],
    [313, 'Mensal — Google Meu Negócio', 'recorrente', SERV.gmn, ['Publicar atualização no perfil da empresa'], 10]
  ];
  for (const [n, nome, tipo, servico_id, itens, dia] of modelos) {
    await criarSeNaoExistir<TarefaModelo>('tarefa_modelos', { id: id(n), nome, tipo, servico_id, itens, dia_do_mes: dia });
  }
}
