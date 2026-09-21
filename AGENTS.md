# Continental Atlas — Regras do Projeto

Sistema de gestão interno da Continental MKT (agência de marketing digital). Um único usuário, o dono da agência, que usa no celular Android e no computador. Ele sabe o básico de programação: explique as coisas em português simples, sem jargão, e diga exatamente onde clicar quando ele precisar configurar algo.

**Leia antes de qualquer tarefa:** `docs/especificacao-continental-atlas.md` (especificação completa, versão 2.0).

## Situação Atual

- **Fase 1 construída e testada:** Painel, Clientes, Agenda, Tarefas, Financeiro, Cobranças (Pix, WhatsApp, multa e juros), Metas, Configurações, importação/exportação, backup, bloqueio com PIN ou digital, quatro temas, fundo animado, funcionamento sem internet.
- **Próximas fases (nesta ordem):** 2 Vendas e Contratos, 3 Google, Avisos e Inteligência, 4 Campanhas e Relatórios, 5 Conteúdo, Sites e Cofre. Ver seção 11 da especificação.
- As telas das próximas fases já existem como "Em Breve" (`src/app/secoes.ts` → campo `fase`). Ao construir uma, remova o `fase` da seção e crie a rota em `src/App.tsx`.
- O banco das cinco fases já está em `supabase/migrations/0001_esquema.sql`.

## Trabalho por Fase

1. Implemente **uma fase por vez**, só depois de apresentar o plano e ele aprovar.
2. Módulo por módulo. Ao terminar cada módulo: `npm run typecheck` e `npm run build` sem erros, teste em 390 px de largura e no computador, nos quatro temas, e confira os critérios de aceite da especificação.
3. Nunca deixe o app quebrado entre um pedido e outro.

## Idioma e Textos

- Interface 100% em português do Brasil. Código também: nomes de variáveis, funções e arquivos em português, **sem acento** (`cliente`, `cobranca`, `lancamento`).
- **Títulos em Title Case consistente** (regra importante para o usuário): títulos de tela, seção, card, modal e aba sempre com as palavras principais em maiúscula — "Próximos 7 Dias", "Configuração de Tráfego", "Metas do Mês". Artigos e preposições em minúscula ("de", "do", "e").
- Botões e ações em frase comum, começando com verbo: "Cadastrar cliente", "Marcar como paga".
- Mensagens de erro dizem o que fazer: "CPF inválido. Confira os números."
- Tom das mensagens prontas para clientes (WhatsApp, e-mail): **próximo e profissional**.
- Sem emojis na interface.

## Identidade Visual (seção 4 da especificação)

- Cores só pelos tokens de `src/tema/tokens.css`. Nunca escreva cor fixa em componente (exceto as cores de tipo de evento já definidas).
- Todo tema novo ou ajuste precisa funcionar nos quatro: claro, escuro, azul, vermelho.
- Fonte Inter com os pesos da especificação (números grandes 200, títulos de tela 360, títulos de card 500, navegação 570).
- Superfícies: `vidro-painel` (cards) e `vidro-pilula` (navegação, abas, botões secundários). Botão principal com bolinha e seta (`<Botao variante="primario">`).
- Reutilize os componentes de `src/componentes/ui.tsx` antes de criar novos.
- Respeite `prefers-reduced-motion` e o modo Economia do fundo animado.

## Dados e Sincronização (seção 17 da especificação)

O Atlas é "local primeiro": grava no aparelho (Dexie/IndexedDB) e sincroniza com o Supabase.

- **Toda gravação passa por `salvar()` de `src/lib/repo.ts`.** Não grave direto nas tabelas do Dexie (exceções: `sync.ts` e `backup.ts`).
- **Exclusão sempre lógica:** `excluir()` marca `excluido = true`. Listas filtram `excluido`.
- **Registros gerados automaticamente** (cobranças, eventos de vencimento, tarefas recorrentes, lembretes) usam `idDeterministico(chave)` + `criarSeNaoExistir()`. Assim celular e computador geram o mesmo registro sem duplicar. Toda rotina automática precisa ser idempotente.
- Os campos dos tipos em `src/lib/tipos.ts` têm **exatamente** os nomes das colunas do banco.
- **Para criar uma tabela nova sincronizada:**
  1. nova migração `supabase/migrations/000N_nome.sql` (não edite a 0001 depois que ela já foi aplicada) repetindo o bloco "Colunas comuns" para a tabela nova;
  2. interface em `tipos.ts`;
  3. nova `version()` do Dexie em `db.ts` com a tabela;
  4. incluir em `TABELAS_SYNC` na ordem certa (pais antes dos filhos);
  5. chave estrangeira só para tabelas que sincronizam antes.
- IDs fixos dos dados iniciais ficam em `src/lib/sementes.ts`. Não mude esses IDs.
- Datas: `aaaa-mm-dd` para dia; data e hora com fuso `-03:00` (use `paraISO()` e as funções de `src/lib/formato.ts`). Dinheiro com `moeda()`.

## Segurança

- **Custo zero:** só serviços em plano gratuito. Pergunte antes de adicionar qualquer serviço externo.
- **Nenhum segredo no navegador ou no GitHub.** Tokens do Google, Meta, Google Ads, Resend e chaves VAPID ficam como segredos das Supabase Edge Functions. O navegador só conhece a URL do Supabase e a chave pública (anon/publishable).
- Tokens OAuth vão na tabela `integracoes_segredos` (sem política de RLS: só a `service_role` das Edge Functions acessa).
- Páginas públicas (proposta, contrato, briefing, aprovação de posts, pesquisa, agendamento) acessam dados **só** por Edge Function que valida o `token_publico`. Nenhuma tabela aberta ao público.
- RLS em todas as tabelas (`dono_id = auth.uid()`).
- O cadastro de novas contas no Supabase deve ficar desligado depois que o dono criar a dele.
- Cofre de acessos: criptografia no aparelho (AES-GCM + PBKDF2); o banco só vê texto cifrado.

## Comandos

- `npm install` — instala as dependências
- `npm run dev` — abre em http://localhost:5173
- `npm run typecheck` — confere os tipos
- `npm run build` — gera a versão de produção em `dist/`
