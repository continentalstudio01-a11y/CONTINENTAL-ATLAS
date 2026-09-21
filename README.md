# Continental Atlas

Sistema de gestão da Continental MKT: clientes, agenda, tarefas, financeiro, cobranças e metas num lugar só, no celular e no computador, funcionando até sem internet.

A **Fase 1 está pronta**. As Fases 2 a 5 estão descritas em `docs/especificacao-continental-atlas.md` e serão construídas com o agente do Antigravity, uma de cada vez (roteiro no fim deste arquivo).

---

## 1. Abrir no Antigravity

1. Descompacte o arquivo `continental-atlas.zip` numa pasta do seu computador (por exemplo, `Documentos/continental-atlas`).
2. No Antigravity, abra essa pasta (Open Folder).
3. O agente lê sozinho o `AGENTS.md` e a regra em `.agents/rules/`. Você não precisa copiar nada para o chat.

## 2. Rodar no Computador (Modo Local)

Precisa do **Node.js** versão LTS instalado (nodejs.org). Depois, no terminal do Antigravity, dentro da pasta do projeto:

```
npm install
npm run dev
```

Abra **http://localhost:5173**. Nesse modo, os dados ficam só neste computador (aparece "Modo local" no topo). Já dá para cadastrar clientes, lançar despesas e testar tudo.

Se preferir, peça ao agente: *"Instale as dependências e rode o Atlas para eu ver."*

## 3. Primeiros Ajustes no App

Em **Configurações**:

1. **Empresa:** seu nome (aparece na saudação), dados da empresa e o **logo**.
2. **Pix:** chave, nome do recebedor e cidade. Use "Testar com R$ 1,00" e leia o QR Code no app do banco para conferir.
3. **Catálogo:** preço-base de cada serviço e, se quiser, pacotes.
4. **Segurança:** defina o PIN (e a digital, no celular).
5. **Financeiro e MEI:** valor da sua hora e o limite anual do MEI vigente.

Em **Tarefas → Modelos**, revise os checklists de cliente novo e as tarefas mensais que já deixei prontos.

## 4. Ligar a Sincronização (Celular + Computador)

Para usar nos dois aparelhos com os mesmos dados, crie o banco gratuito no Supabase. Os nomes dos menus podem mudar um pouco com o tempo.

1. Crie uma conta em **supabase.com** e um projeto novo (região **South America (São Paulo)**). Guarde a senha do banco.
2. Abra **SQL Editor**, cole o conteúdo inteiro de `supabase/migrations/0001_esquema.sql` e clique em **Run**. Isso cria todas as tabelas das cinco fases, com segurança.
3. Em **Project Settings** (ou no botão **Connect**), copie a **Project URL** e a chave **publishable** (ou **anon**). Nunca use a chave "secret" ou "service_role" no app.
4. Na pasta do projeto, copie o arquivo `.env.example` para um novo arquivo chamado `.env` e preencha:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

5. Rode `npm run dev` de novo. Vai aparecer a tela **Entrar**: use "Criar minha conta (só na primeira vez)" com seu e-mail e uma senha forte. Confirme pelo e-mail, se o Supabase pedir.
6. **Importante:** depois de criar sua conta, no Supabase vá em **Authentication → Sign In / Providers** e **desligue o cadastro de novos usuários** ("Allow new users to sign up"). Assim ninguém mais cria conta no seu Atlas.

Os dados que você já tinha cadastrado no modo local são enviados sozinhos para a nuvem no primeiro login.

## 5. Publicar na Internet e Instalar no Celular

1. Crie um repositório **privado** no **GitHub** e envie o projeto. Peça ao agente: *"Crie o repositório Git e me ajude a enviar para um repositório privado no GitHub."* O arquivo `.env` **não** vai para o GitHub (já está no `.gitignore`).
2. Na **Cloudflare**: **Workers & Pages → Create → Pages → Connect to Git**, escolha o repositório e configure:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (os mesmos valores do `.env`)
3. Quando terminar, você recebe um endereço como `continental-atlas.pages.dev`. No Supabase, em **Authentication → URL Configuration**, coloque esse endereço em **Site URL**.
4. No celular Android, abra o endereço no **Chrome** → menu **⋮** → **Adicionar à tela inicial** (ou **Instalar app**). O Atlas abre como aplicativo, com PIN ou digital.

A cada envio ao GitHub, a Cloudflare publica a versão nova sozinha.

## 6. Backup

Em **Configurações → Dados e Backup**, baixe o backup completo de vez em quando e guarde em local seguro (ele tem dados pessoais dos clientes). O backup automático semanal no Google Drive chega na Fase 3.

---

## Próximas Fases (Pedidos Prontos para o Agente)

Faça **uma fase por vez**. Cole o pedido no chat do Antigravity, leia o plano que o agente apresentar e só aprove quando estiver claro. Ao final, peça para ele conferir todos os critérios de aceite.

**Fase 2 — Vendas e Contratos**

```
Leia AGENTS.md e docs/especificacao-continental-atlas.md. Vamos implementar
somente a Fase 2 (seção 11): Funil de Prospecção, recebimento automático
dos leads quentes do meu sistema de captação do Google Maps (n8n), Propostas
nos três modos, Contratos, aceite online e assinatura gov.br, Briefing,
modelos de mensagem editáveis, Indicações, Terceirizados, Horas e Lucro por
Cliente e Reajuste Anual. Antes de escrever código, me apresente o plano e o
passo a passo simples do que eu preciso configurar. Depois de eu aprovar,
implemente módulo por módulo, com typecheck, build e teste no celular.
```

**Fase 3 — Google, Avisos e Inteligência**

```
Leia AGENTS.md e docs/especificacao-continental-atlas.md. Vamos implementar
somente a Fase 3: sincronização com o Google Agenda, Agendamento Público,
Notificações (push no celular, e-mail pelo Resend e central no app), rotinas
no servidor (pg_cron), Resumo Semanal, Recursos Inteligentes (cliente em
risco, oportunidades de venda, ata que vira tarefas, aniversários), Pesquisa
de Satisfação e Backup Automático no Google Drive. Antes, me mostre o plano
e o passo a passo das contas do Google Cloud e do Resend.
```

**Fase 4 — Campanhas e Relatórios**

```
Leia AGENTS.md e docs/especificacao-continental-atlas.md. Vamos implementar
somente a Fase 4: integrações de leitura com Meta Ads e Google Ads (MCC),
Campanhas com ROAS, Diário de Otimizações, Metas por Cliente, Leads dos
Formulários do Meta, Relatórios em PDF (melhores anúncios opcionais) e
Alertas de Campanha. Antes, confira comigo se o token de desenvolvedor do
Google Ads e o app do Meta já estão aprovados e me mostre o plano.
```

**Fase 5 — Conteúdo, Sites e Cofre**

```
Leia AGENTS.md e docs/especificacao-continental-atlas.md. Vamos implementar
somente a Fase 5: Calendário de Conteúdo com datas comemorativas, link de
aprovação de posts e criativos (sem aprovação automática: fica esperando e
me avisa para cobrar), publicação automática no Instagram e no Facebook,
Projetos de Site, Domínios e Hospedagem e Cofre de Acessos criptografado.
Antes, me mostre o plano e as permissões do Meta que precisam de revisão.
```

## Preparação que Leva Dias (Comece Já)

- **Google Ads:** criar a conta de administrador (MCC), vincular as contas dos clientes e pedir o token de desenvolvedor (Fase 4).
- **Meta:** criar o app no Meta for Developers e o usuário do sistema no Gerenciador de Negócios (Fases 4 e 5).
- **Contratos:** revisar o texto-base com um advogado (Fase 2).

## Estrutura

```
AGENTS.md                      regras para o agente
.agents/rules/                 regra sempre ativa do Antigravity
docs/                          especificação 2.0
src/app/                       layout, navegação, fundo animado, login, bloqueio
src/modulos/                   telas de cada módulo
src/componentes/ui.tsx         botões, cards, campos, abas, modal, avisos
src/tema/                      quatro temas e estilos
src/lib/                       banco local, sincronização, automações, Pix, WhatsApp
supabase/migrations/           banco completo com segurança por usuário
```
