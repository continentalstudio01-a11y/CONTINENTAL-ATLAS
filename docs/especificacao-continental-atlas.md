# Continental Atlas — Especificação do Sistema

Versão 2.0, setembro de 2026. Sistema de gestão interno da Continental MKT, escrito para ser implementado com um agente de código (Google Antigravity ou Claude Code).

**Situação:** a Fase 1 está construída e testada. As Fases 2 a 5 estão especificadas aqui e já têm as tabelas criadas em `supabase/migrations/0001_esquema.sql`. A versão 2.0 acrescenta a seção 16 (recursos novos) e a seção 17 (funcionamento sem internet), e atualiza as seções 6, 7, 11, 12, 14 e 15.

---

## 1. Visão Geral

O Continental Atlas é o sistema de gestão da Continental MKT, agência de marketing digital que atende de 6 a 15 clientes ativos com gestão de tráfego pago (Meta Ads e Google Ads), sites e landing pages, social media e Google Meu Negócio. Hoje agenda, clientes, finanças, propostas, contratos e relatórios ficam espalhados em ferramentas diferentes, o que gera retrabalho, cobranças esquecidas e relatórios montados na mão. O Atlas junta tudo num lugar só: da prospecção do lead até o relatório mensal do cliente.

**Premissas**

- Usuário único: só o dono da Continental MKT usa o sistema. Clientes nunca fazem login; eles só interagem pelo link público de briefing.
- Uso igual no celular Android e no computador, com dados na nuvem sincronizados em tempo real.
- Funciona sem internet: tudo é gravado primeiro no aparelho e sincronizado quando a conexão volta (seção 17).
- Custo mensal zero: apenas serviços em plano gratuito (ver seção 6).
- Interface em português do Brasil, moeda R$, datas dd/mm/aaaa, horas em 24h e fuso de Brasília (UTC−3).
- Formalização como MEI: muda o contrato, os impostos e os lembretes (seção 16.8).

## 2. Objetivos

1. Cadastrar um cliente novo completo (serviços, cobranças, agenda e checklist criados automaticamente) em menos de 3 minutos.
2. Gerar proposta ou contrato em PDF em menos de 2 minutos.
3. Deixar o relatório de um cliente pronto para envio em menos de 5 minutos, com os números puxados automaticamente.
4. Nenhuma cobrança esquecida: toda mensalidade e parcela tem cobrança gerada e lembrete.
5. Custo fixo mensal de R$ 0,00.

## 3. Fora do Escopo (Versão 1)

- **Acesso de Clientes e Equipe.** O uso é individual; permissões multiusuário aumentariam muito a complexidade.
- **Envio Automático de WhatsApp.** Exige API paga; as mensagens abrem prontas e o envio é um toque.
- **Criar ou Editar Campanhas pelo Atlas.** As integrações de anúncios são só de leitura.
- **Emissão de Nota Fiscal.** Fica com o emissor da prefeitura ou do contador.
- **Recursos com IA Paga.** Contrariam a premissa de custo zero. Os recursos inteligentes da seção 16.12 funcionam por regras, sem IA paga.
- **Trazer Eventos do Google Agenda para o Atlas.** A sincronização é só no sentido Atlas → Google (possível evolução futura).

---

## 4. Identidade Visual

### 4.1 Referência e Adaptação

A referência é uma página de apresentação em vidro sobre fundo azul-esbranquiçado (estilo "ConSentinel"). Do visual dela, o Atlas adota: a paleta, as superfícies de vidro com desfoque, a fonte Inter com pesos intermediários, os botões em pílula com bolinha e seta, os números de destaque finos e grandes com divisória diagonal, e a barra de progresso fina.

O que **não** vem da referência:

- O sistema de unidades fixo (`--u` baseado numa tela de 1280×960 que nunca rola). O Atlas tem listas, tabelas e formulários, então usa layout responsivo comum, com rolagem.
- O logo em globo, o vídeo e as imagens hospedadas da referência (são de terceiros). O Atlas usa o logo da Continental MKT e um fundo animado próprio (seção 4.6).

### 4.2 Tipografia

Fonte única: **Inter** variável (pesos 100–900), carregada do Google Fonts com `display=swap`. Os pesos intermediários fazem parte da identidade e devem ser usados exatamente como abaixo.

| Papel | Peso | Desktop | Celular |
|---|---|---|---|
| Números de destaque (KPIs) | 200 | 72–96px | 48–60px |
| Título de tela | 360 | 40px | 30px |
| Título de card | 500 | 22px | 20px |
| Subtítulos e rótulos de apoio | 470 | 16px | 15px |
| Texto, campos e tabelas | 400 | 15px | 15px |
| Itens de navegação | 570 | 15px | 13px |
| Nome da marca | 520 | 20px | 18px |

Espaçamento entre letras: títulos −0.03em, navegação −0.03em, texto −0.01em, KPIs 0. Valores e tabelas usam `font-variant-numeric: tabular-nums`.

### 4.3 Cores e Temas

Quatro temas, trocados por botão em Configurações. O Claro reproduz a referência; o Escuro usa o mesmo vidro sobre azul-marinho profundo; Azul e Vermelho mantêm o vidro com fundo e destaques na cor.

| Token | Claro | Escuro | Azul | Vermelho |
|---|---|---|---|---|
| `--fundo` | #E6EDF6 | #060D1C | #D7E6FB | #F6E4E6 |
| `--texto` | #020C21 | #E8EEF7 | #041A3D | #2A0509 |
| `--texto-suave` | #0F182F | #C9D3E3 | #0B2552 | #3D0B11 |
| `--texto-secundario` | #59627E | #8C97AE | #4B5F82 | #7A5157 |
| `--primario` | #0F1B31 | #E6EDF6 | #0B3A8C | #7A0F1B |
| `--primario-bolinha` | #384B64 | #C3D0E2 | #2F5FB0 | #A0303C |
| `--primario-texto` | #FFFFFF | #020C21 | #FFFFFF | #FFFFFF |
| `--destaque` | #4A78B0 | #7EA6DA | #2563C9 | #C8323F |
| `--trilha` | #DDE4EE | rgba(255,255,255,.10) | #C6D8F3 | #EFD2D6 |
| `--preenchimento` | #5F88B4 | #7EA6DA | #2F6BD1 | #C8323F |
| `--vidro-pilula` | rgba(255,255,255,.78) | rgba(255,255,255,.08) | rgba(255,255,255,.72) | rgba(255,255,255,.72) |
| `--vidro-painel-a` | rgba(255,255,255,.44) | rgba(255,255,255,.10) | rgba(255,255,255,.42) | rgba(255,255,255,.42) |
| `--vidro-painel-b` | rgba(255,255,255,.16) | rgba(255,255,255,.03) | rgba(255,255,255,.14) | rgba(255,255,255,.14) |
| `--vidro-borda` | rgba(255,255,255,.60) | rgba(255,255,255,.14) | rgba(255,255,255,.60) | rgba(255,255,255,.60) |
| `--anel` | rgba(120,145,180,.20) | rgba(126,166,218,.18) | rgba(37,99,201,.18) | rgba(200,50,63,.16) |

Cores de status (iguais nos temas claros; versão clara entre parênteses para o Escuro): sucesso #2E8B57 (#5CC98C), atenção #C98A1B (#E7B04A), erro #B42318 (#F0776B). No tema Vermelho, erro sempre vem acompanhado de ícone, para não se confundir com o destaque.

### 4.4 Vidro, Bordas e Sombras

Toda superfície de vidro declara `-webkit-backdrop-filter` e `backdrop-filter`.

```css
.vidro-pilula{
  background:var(--vidro-pilula);
  border:1px solid var(--vidro-borda);
  -webkit-backdrop-filter:blur(40px);
  backdrop-filter:blur(40px);
  box-shadow:0 0 0 1.3px var(--anel), 0 2px 10px rgba(28,52,92,.05);
  border-radius:999px;
}
.vidro-painel{
  background:linear-gradient(135deg,var(--vidro-painel-a),var(--vidro-painel-b));
  border:1px solid var(--vidro-borda);
  -webkit-backdrop-filter:blur(40px) saturate(112%);
  backdrop-filter:blur(40px) saturate(112%);
  box-shadow:inset 1px 1px 0 rgba(255,255,255,.55),
             inset -1px -1px 0 rgba(255,255,255,.18),
             0 18px 40px rgba(28,52,92,.07);
}
```

No tema Escuro, os brilhos internos (inset) caem para .12 e .04.

### 4.5 Componentes

- **Botão Primário:** pílula na cor `--primario`, texto peso 400, bolinha circular `--primario-bolinha` à direita com seta (chevron, traço 1.9). Altura 56px no desktop e 52px no celular. Ao passar o mouse, sobe 2px.
- **Botão Secundário:** pílula de vidro (`.vidro-pilula`), texto peso 470.
- **Card de Vidro:** `.vidro-painel`, com raio conforme a hierarquia: 28px nos cards grandes do Painel, 20px nos cards de lista, 14px em campos e chips.
- **KPI:** número peso 200 com rótulo de 2 a 3 linhas ao lado (peso 400, `--texto-secundario`) e divisória diagonal fina entre dois KPIs, como no "112+ / 55K+" da referência.
- **Barra de Progresso:** trilha de 8px (`--trilha`) com preenchimento `--preenchimento`, cantos arredondados. Usada em metas, verba consumida e checklists.
- **Ponto de Status:** círculo de 10px na cor do status.
- **Ícone de Módulo:** círculo de vidro branco (56–72px) com ícone de traço no cabeçalho de cada módulo, como o escudo da referência.
- **Ícones:** biblioteca lucide, traço 1.7, pontas e junções arredondadas.
- **Campos de Formulário:** fundo de vidro claro, borda 1px, raio 14px, foco com contorno de 2px em `--destaque`.
- **Chips:** etapas do funil, status de cobrança, tipos de evento.
- **Painel Deslizante:** menus e formulários rápidos no celular, em vidro, abrindo de baixo para cima.
- **Avisos Rápidos (toasts):** em vidro, confirmando a ação com o mesmo nome do botão.

**Movimento.** Uma única entrada orquestrada, no estilo da referência (números sobem com máscara, vidro "assenta"), apenas na tela de login e na primeira abertura do Painel no dia. Fora isso, movimento só em resposta a ações (abrir, confirmar, mover card). `prefers-reduced-motion` desliga todas as animações.

### 4.6 Fundo Animado

Presente em todas as telas. Um **globo de vidro desenhado em código** (canvas), sem vídeo: esfera com meridianos e paralelos finos girando devagar (uma volta a cada ~60 segundos), brilho radial suave e manchas de luz (cáusticas) se deslocando lentamente, nas cores do tema ativo. Fica atrás de todo o conteúdo, e os painéis de vidro desfocam o movimento.

Regras de desempenho:

- Limite de 30 quadros por segundo e resolução máxima de 1,5× no celular.
- Pausa automática quando a aba ou o app vai para segundo plano.
- Três modos em Configurações: **Ligado**, **Economia** (15 quadros por segundo, sem cáusticas) e **Desligado** (imagem estática).
- Com `prefers-reduced-motion`, começa em Desligado.

### 4.7 Navegação e Layout

- **Desktop (≥1024px):** barra superior com logo da Continental MKT e o nome "Continental Atlas" à esquerda; pílula de vidro centralizada com Painel, Agenda, Tarefas, Clientes, Funil, Financeiro, Campanhas e Mais; à direita, sino de notificações e Botão Primário "Novo" (criação rápida de cliente, evento, tarefa, lançamento, proposta e lead). Conteúdo com largura máxima de 1280px.
- **Tablet (640–1023px):** a pílula mostra só os ícones, com rótulo ao tocar.
- **Celular (<640px):** topo com logo e sino; pílula de vidro flutuante na parte de baixo com Painel, Agenda, Clientes, Financeiro e Mais; bolinha "+" acima dela para criação rápida. "Mais" abre um painel deslizante com as demais seções (Tarefas, Funil, Propostas, Contratos, Briefings, Campanhas, Relatórios, Metas, Configurações).

Esboço do Painel Inicial no desktop:

```
[logo] Continental Atlas   ( Painel  Agenda  Tarefas  Clientes  …  Mais )   [sino] [Novo (>)]

R$ 18.400   Faturamento      /     12   Clientes       +--------------------------+
            do Mês                      Ativos         | Metas do Mês             |
                                                       | Faturamento  ======--  72% |
                                                       | Novos        ===-----  1/3 |
                                                       +--------------------------+
+---------------+  +---------------+  +---------------+
| Hoje          |  | Cobranças     |  | Alertas       |
+---------------+  +---------------+  +---------------+
+---------------+  +---------------+  +---------------+
| Tarefas       |  | Funil         |  | Relatórios a  |
|               |  |               |  | Enviar        |
+---------------+  +---------------+  +---------------+
```

No celular, os blocos empilham em coluna única nesta ordem: KPIs, Hoje, Cobranças, Tarefas, Alertas, Metas, Funil, Relatórios a Enviar.

### 4.8 Textos da Interface

- Títulos de telas, seções e cards em **Title Case consistente** (ex.: "Funil de Prospecção", "Metas do Mês", "Relatórios a Enviar"), com minúsculas só em artigos, preposições e conjunções. Nunca misturar ("Metas do mês" ao lado de "Relatórios a Enviar" é erro).
- Botões começam com verbo, em caixa de frase: "Gerar contrato", "Marcar como paga", "Enviar pelo WhatsApp".
- A ação mantém o nome no fluxo inteiro: "Gerar contrato" confirma com "Contrato gerado".
- Erros dizem o que aconteceu e como resolver, sem pedir desculpas.
- Telas vazias convidam à ação: "Nenhum cliente ainda." + botão "Cadastrar cliente".
- Moeda R$ 1.234,56; datas dd/mm/aaaa; horas 24h.

---

## 5. Módulos

Cada módulo traz o comportamento esperado e os critérios de aceite, que servem de teste ao final da implementação.

### 5.1 Painel Inicial

Primeira tela ao entrar. Blocos: KPIs grandes (Faturamento do Mês recebido e Clientes Ativos, com divisória diagonal), Metas do Mês, Hoje (eventos do dia), Tarefas (atrasadas e de hoje), Cobranças (vencendo nos próximos 7 dias e atrasadas, com ações rápidas), Alertas de Campanha não lidos, Funil (quantidade por etapa e valor em propostas abertas) e Relatórios a Enviar (próximos 7 dias). Tocar em qualquer bloco abre o módulo já filtrado. O Painel mostra só números do negócio; a carteira pessoal fica no Financeiro.

**Critérios de Aceite**
- [ ] Carrega em até 2 segundos no 4G com dados de 15 clientes.
- [ ] Todos os números conferem com os módulos de origem.
- [ ] No celular, os blocos seguem a ordem definida na seção 4.7.

### 5.2 Clientes (CRM)

**Cadastro:** pessoa física ou jurídica, nome ou razão social, nome fantasia, CPF ou CNPJ (validados), responsável, telefone e WhatsApp, e-mail, endereço, cidade e UF, nicho, origem, status (Ativo, Pausado, Encerrado) e observações.

**Serviços Contratados:** cada cliente pode ter vários serviços, cada um com tipo de cobrança selecionável (**Mensal Fixo** ou **Pacote**), valor, dia de vencimento (mensal) ou número de parcelas e datas (pacote), início e fim.

**Configuração de Tráfego** (quando o cliente tem tráfego pago): quem paga a verba (Cliente ou Continental MKT), verba mensal planejada, contas de anúncio vinculadas (Meta e/ou Google), resultado principal usado no custo por resultado (Leads, Conversas, Compras ou Cliques), frequência do relatório (Semanal, Quinzenal ou Mensal) e dia de envio.

**Ficha do Cliente** com abas: Resumo, Serviços, Financeiro (cobranças e verbas adiantadas), Agenda, Tarefas, Campanhas, Documentos (propostas, contratos, briefings, relatórios) e Histórico (linha do tempo automática de tudo que aconteceu).

Ao salvar um cliente novo (ou converter uma proposta aceita), o Atlas cria automaticamente: checklist de cliente novo de cada serviço, cobranças, eventos de vencimento e de relatório na agenda, e tarefas mensais recorrentes.

**Critérios de Aceite**
- [ ] CPF e CNPJ inválidos são recusados com mensagem clara.
- [ ] Cliente com dois serviços (ex.: tráfego mensal + site em pacote) gera as cobranças certas de cada um.
- [ ] Mudar o dia de vencimento atualiza as cobranças futuras em aberto e os eventos da agenda.
- [ ] Encerrar um cliente para de gerar cobranças, tarefas e relatórios futuros, sem apagar o histórico.
- [ ] Busca por nome, telefone ou documento; filtros por status, serviço e nicho.

### 5.3 Catálogo de Serviços e Pacotes

Quatro serviços iniciais: **Gestão de Tráfego Pago**, **Sites e Landing Pages**, **Social Media** e **Google Meu Negócio**, cada um com descrição, tipo de cobrança padrão e preço-base editáveis. Pacotes são combinações prontas de serviços com preço fechado (ex.: "Tráfego + Social Media"). O catálogo alimenta propostas, contratos, briefings e checklists.

**Critérios de Aceite**
- [ ] Criar, editar e desativar serviços e pacotes; desativar não afeta clientes existentes.
- [ ] O preço-base é só sugestão: o valor final é editável na proposta e no cliente.

### 5.4 Funil de Prospecção

Quadro com as etapas **Novo Lead**, **Contato Feito**, **Reunião Marcada**, **Proposta Enviada**, **Fechado** e **Perdido**.

Cada lead tem: nome, telefone, endereço, cidade, nicho, nota no Google, o que falta no negócio, score (Frio, Médio, Quente), origem (Google Maps, Indicação, Instagram, Outro), data do próximo contato e histórico de interações (WhatsApp, ligação, reunião, nota). No desktop os cards são arrastados entre etapas; no celular, botão "Mover para". Mover para Perdido pede o motivo. O botão de WhatsApp abre a conversa com mensagem modelo.

Os leads quentes do sistema de captação do Google Maps chegam automaticamente em Novo Lead (seção 8.4).

**Critérios de Aceite**
- [ ] Lead repetido (mesmo `place_id` ou telefone) é atualizado, nunca duplicado.
- [ ] Lead com próximo contato vencido aparece destacado e entra nas tarefas do Painel.
- [ ] Mover para Reunião Marcada oferece criar o evento na agenda.
- [ ] Converter em cliente leva todos os dados e o histórico.

### 5.5 Propostas

Três formas de montar, escolhidas ao criar:

- **Pacote Pronto:** escolhe um pacote do catálogo e ajusta só cliente, validade e condições.
- **Modelo Ajustável:** parte de um pacote ou de uma proposta anterior e altera itens e valores.
- **Do Zero:** adiciona livremente itens do catálogo.

Campos: número sequencial (ex.: 2026-014), lead ou cliente, itens (serviço, descrição, tipo de cobrança, quantidade, valor), desconto (R$ ou %), total mensal e total único exibidos separadamente, validade, condições de pagamento e observações. Quando o lead veio do sistema de captação com "o que falta" (ex.: sem site), o Atlas sugere o serviço correspondente.

Status: **Rascunho**, **Enviada**, **Aceita**, **Recusada**, **Expirada**. Saída em PDF com a identidade da Continental MKT e mensagem pronta para o WhatsApp. Aceitar a proposta converte o lead em cliente (se ainda for lead), cria os serviços, gera o contrato e dispara o onboarding.

**Critérios de Aceite**
- [ ] Os três modos geram o mesmo formato de PDF.
- [ ] Total mensal (recorrente) e total único (pacotes) aparecem separados.
- [ ] Proposta vencida muda para Expirada automaticamente.
- [ ] Aceitar cria cliente, serviços, contrato, cobranças e checklist sem redigitar nada.
- [ ] É possível duplicar uma proposta existente.

### 5.6 Contratos

O contrato é montado em blocos:

- **Cláusulas-Base Comuns:** partes, objeto, vigência, valor e forma de pagamento, obrigações das partes, não garantia de resultados, acesso a contas e senhas, confidencialidade e LGPD, rescisão e aviso prévio, multa por atraso e foro.
- **Cláusulas Específicas** de cada serviço contratado (tráfego, site, social media, Google Meu Negócio).
- **Variações Automáticas:** Mensal Fixo ou Pacote; verba paga pelo cliente ou adiantada pela Continental MKT (com prazo de reembolso).

Os modelos ficam editáveis em Configurações, com variáveis como `{{cliente.nome}}`, `{{cliente.documento}}`, `{{servicos.lista}}`, `{{valor.mensal}}` e `{{vigencia.inicio}}`. Antes de gerar, o Atlas mostra uma prévia editável daquele contrato. Saída em PDF com logo. Status: **Gerado**, **Enviado**, **Assinado**, **Encerrado**, com upload do PDF assinado.

**Critérios de Aceite**
- [ ] Cliente só com site gera contrato sem cláusulas de tráfego; cliente com tráfego e verba adiantada inclui a cláusula de reembolso.
- [ ] Nenhuma variável fica sem preencher: a geração é bloqueada e o campo faltante é apontado.
- [ ] Editar um modelo não altera contratos já gerados.

### 5.7 Briefing do Cliente

Modelos de formulário por serviço, com perguntas editáveis (texto curto, texto longo, múltipla escolha, sim/não, link). O Atlas gera um link único (`/briefing/{token}`) para um cliente ou lead, com validade padrão de 15 dias, e abre o WhatsApp com a mensagem pronta. A página pública usa o tema Claro com o logo da Continental MKT, não pede login, é feita para celular e guarda um rascunho no navegador enquanto o cliente preenche. Ao enviar, as respostas entram na ficha, você recebe uma notificação e é criada a tarefa "Revisar briefing".

**Critérios de Aceite**
- [ ] Link expirado ou já respondido mostra aviso e não aceita novo envio.
- [ ] A página pública não expõe nenhum outro dado do sistema.
- [ ] Perguntas obrigatórias são validadas antes do envio.

### 5.8 Agenda

Tipos de evento com cor própria: **Reunião**, **Prazo**, **Vencimento**, **Relatório** e **Pessoal**. Visões Dia, Semana, Mês e Lista. Campos: título, tipo, início e fim (ou dia inteiro), cliente ou lead vinculado, local ou link da reunião, recorrência e lembretes (padrões por tipo, editáveis).

Eventos automáticos (vencimentos, envios de relatório, próximos contatos do funil) ficam marcados como automáticos e se atualizam quando a origem muda. Tudo é enviado para o Google Agenda (seção 8.1).

**Critérios de Aceite**
- [ ] Criar evento em até 3 toques no celular, pela bolinha "+".
- [ ] Evento criado no celular aparece no computador sem recarregar a página.
- [ ] Editar ou apagar um evento reflete no Google Agenda em até 1 minuto.
- [ ] Eventos automáticos só são apagados pela origem, mas aceitam lembretes extras.

### 5.9 Tarefas e Checklists

Três tipos:

- **Checklist de Cliente Novo:** modelo por serviço, aplicado ao cadastrar o cliente (ex.: tráfego: pedir acesso ao Gerenciador de Negócios, verificar pixel, reunião de alinhamento, enviar briefing).
- **Tarefas Recorrentes:** modelo por serviço com dia do mês (ex.: planejamento de conteúdo do mês, conferência de verba).
- **Tarefas Avulsas:** do dia a dia.

Campos: título, descrição, prazo, prioridade (Alta, Média, Baixa), cliente e status. Visões: Hoje, Próximos 7 Dias, Por Cliente e Concluídas. O progresso do checklist aparece na ficha do cliente com barra de progresso.

**Critérios de Aceite**
- [ ] Tarefas recorrentes são criadas uma única vez por mês para cada cliente.
- [ ] Editar um modelo afeta só as próximas aplicações.
- [ ] Tarefa atrasada aparece destacada e é contada no Painel.

### 5.10 Financeiro

Duas carteiras, **Negócio** e **Pessoal**, alternadas no topo da tela e nunca misturadas.

Lançamentos: entrada ou saída, descrição, valor, data, status (Previsto ou Pago), categoria, forma de pagamento (Pix, Boleto, Cartão, Transferência, Dinheiro), cliente (opcional) e recorrência mensal.

Categorias iniciais, todas editáveis:
- **Negócio:** Receita de Serviços, Ferramentas e Assinaturas, Verba Adiantada, Impostos, Equipamentos, Marketing Próprio, Outros.
- **Pessoal:** Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Outros.

**Verba Adiantada:** uma saída nessa categoria, vinculada a um cliente, gera um valor a receber daquele cliente. Quando o cliente reembolsa, a baixa zera o valor. Verba adiantada nunca entra no cálculo do lucro.

**Resumo de Cada Carteira:** entradas, saídas, lucro (no Negócio: receitas menos despesas, sem verbas adiantadas), a receber (cobranças abertas mais verbas a reembolsar), atrasados e gráfico dos últimos 12 meses, com filtros por período, categoria e cliente.

**Critérios de Aceite**
- [ ] Verba adiantada nunca aparece como despesa nem como receita no lucro.
- [ ] A carteira Pessoal nunca soma no Painel nem em números do negócio.
- [ ] Despesa recorrente gera lançamento previsto todo mês.
- [ ] Marcar uma cobrança como paga cria a entrada correspondente uma única vez.

### 5.11 Cobranças

Geradas automaticamente a partir dos serviços (mensalidades e parcelas de pacotes) e das verbas adiantadas. Status: **Aberta**, **Paga**, **Atrasada**, **Cancelada**.

Ações de cada cobrança (nomes dos botões):
- **Gerar Pix:** QR Code e código copia e cola com valor e identificador, a partir dos dados Pix de Configurações (seção 8.5).
- **Enviar pelo WhatsApp:** abre a conversa do cliente com mensagem pronta (valor, vencimento e Pix copia e cola), a partir de um modelo editável.
- **Marcar como paga:** registra data e forma de pagamento.

Lembretes para você: 3 dias antes do vencimento, no dia e no primeiro dia de atraso.

**Critérios de Aceite**
- [ ] O QR Code é lido com o valor preenchido em pelo menos dois apps de banco diferentes.
- [ ] A mensagem do WhatsApp usa o modelo editável e o número do cliente.
- [ ] A cobrança vira Atrasada no dia seguinte ao vencimento.

### 5.12 Metas Mensais

Para cada mês: meta de faturamento (entradas pagas em Receita de Serviços) e meta de novos clientes (clientes criados ou propostas aceitas no mês). Cada meta mostra barra de progresso e projeção pelo ritmo atual até o fim do mês. O histórico mostra os meses anteriores e se a meta foi batida. É possível copiar as metas do mês anterior.

**Critérios de Aceite**
- [ ] O progresso atualiza ao registrar pagamento ou aceitar proposta.
- [ ] Sem meta definida, o bloco convida a definir.

### 5.13 Campanhas

Leitura das contas de Meta Ads e Google Ads vinculadas a cada cliente (sem editar campanhas). Métricas por campanha e por dia: investimento, impressões, alcance (Meta), cliques, CTR, CPC, leads, conversas iniciadas, conversões e valor de conversões. O custo por resultado usa o resultado principal definido na ficha do cliente.

**Faturamento Informado:** campo para lançar o faturamento que o cliente informar em cada período. O ROAS é faturamento ÷ investimento, usando o valor de conversão da plataforma quando existir e o faturamento informado quando não existir (clientes que vendem pelo WhatsApp ou no balcão).

**Visão por Cliente:** seletor de período (7, 14 e 30 dias, mês atual, mês anterior, personalizado), comparação com o período anterior, gráfico de investimento × resultados e tabela de campanhas.
**Visão Geral:** todos os clientes com investimento do mês e barra de verba consumida.

**Critérios de Aceite**
- [ ] Os números batem com o painel da plataforma no mesmo período, salvo arredondamento.
- [ ] O alcance de um período é buscado direto na API, nunca somando o alcance diário.
- [ ] Falha de conexão com a plataforma aparece na tela e em Configurações, com botão de reconectar.

### 5.14 Relatórios

Gerados para os clientes de tráfego conforme a frequência e o dia definidos na ficha. No dia certo, o Atlas cria o evento na agenda e a tarefa "Enviar relatório de [cliente]".

Conteúdo do relatório: capa com o logo da Continental MKT e o nome do cliente, período, KPIs com variação em relação ao período anterior, gráfico de investimento × resultados, tabela de campanhas, ROAS e dois campos escritos por você: análise e próximos passos. Saída em PDF com mensagem pronta para o WhatsApp. Cada cliente tem o histórico dos relatórios gerados.

**Critérios de Aceite**
- [ ] O relatório fica pronto (faltando só a análise escrita) em até 1 minuto.
- [ ] O PDF é legível na tela de um celular.
- [ ] Marcar como enviado conclui a tarefa e registra no histórico.

### 5.15 Alertas de Campanha

Regras por cliente, com limites definidos por você:

- **Verba Consumida:** o gasto do mês atingiu X% da verba planejada.
- **Custo Subindo:** o custo por resultado dos últimos 3 dias passou de R$ X ou ficou Y% acima da média dos 14 dias anteriores.
- **Sem Gasto:** conta com campanhas ativas e nenhum gasto nas últimas 24 horas (sinal de pagamento recusado ou anúncio reprovado).

A verificação roda depois de cada sincronização. Os avisos chegam por notificação e aparecem no Painel.

**Critérios de Aceite**
- [ ] Cada regra pode ser ligada ou desligada por cliente.
- [ ] O alerta mostra o valor atual, o limite e o atalho para a campanha no Atlas.
- [ ] O mesmo alerta não se repete no mesmo dia.

### 5.16 Notificações

Três canais: notificação no celular e no computador (web push do app instalado), e-mail para você e central de avisos (sino) dentro do Atlas. Preferências por tipo de aviso (eventos, tarefas, cobranças, alertas de campanha, leads novos, briefing respondido) e por canal, com horário de silêncio configurável.

**Critérios de Aceite**
- [ ] A notificação chega no Android com o app instalado e fechado.
- [ ] Tocar no aviso abre a tela correspondente.
- [ ] O horário de silêncio segura push e e-mail; a central continua registrando.

### 5.17 Configurações

- Dados da empresa: Continental MKT, CNPJ, endereço, telefone, e-mail e logo.
- Dados do Pix: chave, nome do recebedor e cidade.
- Fuso horário.
- Tema (Claro, Escuro, Azul, Vermelho) e fundo animado (Ligado, Economia, Desligado).
- Catálogo de serviços e pacotes.
- Modelos: contratos, propostas, briefings, checklists, tarefas recorrentes e mensagens de WhatsApp.
- Metas.
- Integrações: status, última sincronização, conectar e reconectar.
- Notificações e backup.

**Critérios de Aceite**
- [ ] Trocar o tema aplica na hora, sem recarregar, e fica salvo.
- [ ] O logo aparece no topo, nas propostas, nos contratos, nos relatórios e no briefing.

### 5.18 Importação, Exportação e Backup

**Importar Planilha** (Excel ou CSV) de clientes, lançamentos e leads: enviar o arquivo, ligar as colunas aos campos, ver a prévia com erros destacados e confirmar. **Exportar** qualquer lista para Excel ou CSV, respeitando os filtros. **Backup Completo** em um arquivo Excel (uma aba por tabela) e um JSON, com lembrete semanal para baixar.

**Critérios de Aceite**
- [ ] Linhas com erro não impedem as demais, e o resumo mostra o que entrou.
- [ ] Reimportar o mesmo arquivo não duplica registros (confere documento ou telefone).
- [ ] O backup inclui todas as tabelas.

---

## 6. Arquitetura e Tecnologia

Tudo em planos gratuitos.

| Camada | Tecnologia | Observação |
|---|---|---|
| Telas | React + Vite + TypeScript | App de página única, instalável no celular (PWA) |
| Estilo | CSS com variáveis de tema (seção 4) | Tailwind opcional, só para layout |
| Ícones | lucide-react | Traço 1.7 |
| Agenda (tela) | Componente próprio em CSS | Visões Mês, Semana e Lista, com o dia aberto em painel |
| Gráficos | SVG próprio (Recharts liberado a partir da Fase 4) | Painel, Campanhas, Financeiro |
| PDF | @react-pdf/renderer | Propostas, contratos e relatórios, gerados no navegador |
| Planilhas | SheetJS (carregado só quando usado) | Importação e exportação |
| QR Code | qrcode | Pix |
| App instalável e push | vite-plugin-pwa + Web Push (chaves VAPID) | Notificações no Android |
| Dados no aparelho | Dexie (IndexedDB) | Funciona sem internet; ver seção 17 |
| Banco, login, arquivos, tempo real | Supabase (Postgres, Auth, Storage, Realtime) | Plano gratuito |
| Funções no servidor | Supabase Edge Functions | Integrações, webhooks, e-mails e push |
| Rotinas agendadas | pg_cron + pg_net no Supabase | Chamam as Edge Functions |
| E-mail | Resend | Plano gratuito |
| Hospedagem | Cloudflare Pages | Publica sozinho a cada envio ao GitHub |
| Código | GitHub | Repositório privado |

Organização de pastas (como está no projeto):

```
continental-atlas/
  AGENTS.md                 regras para o agente (Antigravity e outros)
  .agents/rules/            regra sempre ativa do Antigravity
  CLAUDE.md                 aponta para o AGENTS.md
  README.md                 passo a passo de instalação, contas e próximas fases
  docs/especificacao-continental-atlas.md
  src/
    app/          rotas, layout, navegação, fundo animado, login, bloqueio
    modulos/      painel, clientes, agenda, tarefas, financeiro, cobrancas,
                  metas, configuracoes (e os das próximas fases)
    componentes/  botões, cards de vidro, campos, abas, modal, avisos
    tema/         tokens dos 4 temas e estilos-base
    lib/          banco local, sincronização, automações, pix, mensagens,
                  planilhas, backup, bloqueio, datas e moeda
  supabase/
    migrations/   0001_esquema.sql (todas as tabelas, RLS, gatilhos)
    functions/    (Fases 2 a 5) receber-lead, paginas-publicas, sync-meta,
                  sync-google-ads, sync-google-agenda, enviar-notificacoes,
                  rotina-diaria, publicar-conteudo, backup-drive
```

## 7. Modelo de Dados

Toda tabela tem `id` (uuid), `criado_em`, `atualizado_em`, `excluido` (exclusão lógica), `sincronizado_em` (hora em que o servidor gravou) e `dono_id` (padrão `auth.uid()`), com RLS ativo.

**A fonte da verdade é `supabase/migrations/0001_esquema.sql`**, que já cria as tabelas das cinco fases. Mudanças em relação à versão 1.0: a carteira virou um campo (`negocio` ou `pessoal`) em categorias e lançamentos, em vez de uma tabela; `aprova_posts` fica no cliente; cobranças, tarefas e lançamentos têm `referencia` para evitar duplicidade; e entraram as tabelas dos recursos da seção 16. A lista abaixo resume a versão 1.0.

| Tabela | Campos Principais |
|---|---|
| `configuracoes` | empresa_nome, cnpj, endereco, telefone, email, logo_url, pix_chave, pix_nome, pix_cidade, fuso_horario, tema, fundo_animado |
| `servicos` | nome, descricao, tipo_cobranca_padrao (mensal, pacote), preco_base, ativo |
| `pacotes` | nome, descricao, itens (jsonb: servico_id, valor), preco_total, ativo |
| `clientes` | tipo_pessoa, nome, nome_fantasia, documento, responsavel, telefone, whatsapp, email, endereco, cidade, uf, nicho, origem, status, observacoes, lead_id |
| `cliente_servicos` | cliente_id, servico_id, tipo_cobranca, valor, dia_vencimento, parcelas, inicio, fim, status |
| `cliente_trafego` | cliente_id, quem_paga_verba (cliente, continental), verba_mensal_planejada, resultado_principal, frequencia_relatorio, dia_relatorio |
| `contas_anuncio` | cliente_id, plataforma (meta, google), conta_externa_id, nome, ativa |
| `leads` | place_id (único, opcional), nome, telefone, endereco, cidade, nicho, nota_google, o_que_falta (jsonb), score, origem, etapa, motivo_perda, proximo_contato_em, cliente_id |
| `lead_interacoes` | lead_id, tipo (whatsapp, ligacao, reuniao, nota), texto, data |
| `propostas` | numero, lead_id, cliente_id, modo (pacote, modelo, zero), status, validade, desconto_tipo, desconto_valor, total_mensal, total_unico, condicoes, observacoes, pdf_url, enviada_em, respondida_em |
| `proposta_itens` | proposta_id, servico_id, descricao, tipo_cobranca, quantidade, valor |
| `contrato_modelos` | nome, servico_id (vazio = base), variante (mensal, pacote, verba_cliente, verba_continental), corpo, ordem |
| `contratos` | numero, cliente_id, proposta_id, status, vigencia_inicio, vigencia_fim, conteudo_final, pdf_url, pdf_assinado_url |
| `briefing_modelos` | nome, servico_id, perguntas (jsonb: id, tipo, texto, opcoes, obrigatoria) |
| `briefings` | modelo_id, cliente_id, lead_id, token (único), status, respostas (jsonb), expira_em, respondido_em |
| `eventos` | titulo, tipo, inicio, fim, dia_inteiro, local_link, cliente_id, lead_id, recorrencia, lembretes (jsonb), automatico, origem_tabela, origem_id, google_event_id, sync_pendente |
| `tarefas` | titulo, descricao, prazo, prioridade, status, cliente_id, origem (avulsa, checklist, recorrente), modelo_id, referencia_mes, concluida_em |
| `tarefa_modelos` | nome, tipo (checklist, recorrente), servico_id, itens (jsonb), dia_do_mes |
| `carteiras` | nome (Negócio, Pessoal) |
| `categorias` | carteira_id, nome, tipo (entrada, saida), especial (receita_servico, verba_adiantada) |
| `lancamentos` | carteira_id, categoria_id, tipo, descricao, valor, data, status, forma_pagamento, cliente_id, cobranca_id, recorrente, reembolsado_em |
| `cobrancas` | cliente_id, cliente_servico_id, lancamento_origem_id, descricao, valor, vencimento, status, pago_em, forma_pagamento, lancamento_id, pix_txid |
| `metas` | mes (AAAA-MM), faturamento_alvo, novos_clientes_alvo |
| `metricas_diarias` | conta_anuncio_id, data, campanha_externa_id, campanha_nome, investimento, impressoes, alcance, cliques, leads, conversas, conversoes, valor_conversoes (único por conta + data + campanha) |
| `faturamento_informado` | cliente_id, periodo_inicio, periodo_fim, valor |
| `relatorios` | cliente_id, periodo_inicio, periodo_fim, analise, proximos_passos, pdf_url, gerado_em, enviado_em |
| `alerta_regras` | cliente_id, tipo (verba_consumida, custo_subindo, sem_gasto), limite_valor, limite_percentual, ativa |
| `alertas` | regra_id, cliente_id, mensagem, valor_atual, criado_em, lido_em |
| `notificacoes` | tipo, titulo, corpo, link, criada_em, lida_em |
| `push_inscricoes` | endpoint, chave_p256dh, chave_auth, dispositivo |
| `integracoes` | provedor (google_agenda, meta, google_ads), status, ultimo_sync, ultimo_erro |
| `mensagem_modelos` | tipo (cobranca, proposta, relatorio, briefing, lead), texto |

CTR, CPC e custo por resultado são calculados na hora a partir dos totais, nunca guardados como média de médias. Tokens de integração não ficam em tabelas comuns (seção 10).

## 8. Integrações

### 8.1 Google Agenda

OAuth 2.0 com a sua conta Google, usando um projeto no Google Cloud com a Calendar API ativada. O Atlas cria na sua conta uma agenda própria chamada "Continental Atlas" e grava os eventos nela (sentido Atlas → Google), guardando o `google_event_id` para editar e apagar. Alterações entram numa fila e são reenviadas a cada 15 minutos em caso de falha. O token de atualização fica no servidor, nunca no navegador.

Atenção: publique o app OAuth como "Em produção" (uso pessoal, aceitando o aviso de app não verificado). No modo de teste, os tokens expiram em poucos dias e a sincronização para.

### 8.2 Meta Ads

App no Meta for Developers (tipo Business) com a Marketing API. No Gerenciador de Negócios, um usuário do sistema com permissão `ads_read` e acesso às contas dos clientes gera o token de longa duração, guardado como segredo. A função `sync-meta` consulta o endpoint de Insights de cada conta no nível de campanha, com incremento diário, pedindo `spend`, `impressions`, `reach`, `clicks`, `actions` e `action_values`. Os tipos de ação são mapeados para leads, conversas e compras (conferir os nomes atuais dos `action_type` na documentação no momento da implementação). Usar a versão estável mais recente da Graph API.

### 8.3 Google Ads

Conta de administrador (MCC) gratuita com as contas dos clientes vinculadas, token de desenvolvedor com acesso básico (pedido no Centro de API da MCC), cliente OAuth no Google Cloud e token de atualização. A função `sync-google-ads` faz consultas GAQL por campanha e dia com `metrics.cost_micros` (dividir por 1.000.000), `metrics.impressions`, `metrics.clicks`, `metrics.conversions` e `metrics.conversions_value`, enviando o ID da MCC no cabeçalho `login-customer-id`. Enquanto o acesso básico não é aprovado, testar com uma conta de teste. Usar a versão mais recente da API.

### 8.4 Sistema de Captação de Leads

O sistema de captação (n8n + Google Sheets) envia os leads com score **quente** para a Edge Function `receber-lead` por meio de um nó HTTP Request, com o cabeçalho `x-atlas-chave` contendo uma chave secreta.

```json
{
  "place_id": "ChIJ...",
  "nome": "Pizzaria Exemplo",
  "telefone": "5599999999999",
  "endereco": "Rua Exemplo, 100 - Centro",
  "cidade": "Cidade",
  "nicho": "pizzaria",
  "nota_google": 4.6,
  "o_que_falta": ["site", "google_meu_negocio_incompleto"],
  "score": "quente"
}
```

Regras: procurar lead existente pelo `place_id` e depois pelo telefone; lead existente é atualizado (score, nota, o que falta) sem mudar a etapa; lead novo entra em Novo Lead com origem Google Maps e gera notificação. Chave errada ou dados inválidos são recusados. Como o n8n roda no computador, os leads só chegam quando ele está ligado.

### 8.5 Pix

QR Code estático com valor no padrão BR Code do Banco Central, gerado no navegador, sem custo e sem intermediário: chave Pix, nome do recebedor (até 25 caracteres, sem acentos), cidade (até 15 caracteres, sem acentos), valor, identificador da transação (até 25 caracteres alfanuméricos) e CRC16 no final. Pix estático não avisa o pagamento, então a baixa é manual.

### 8.6 WhatsApp

Links no formato `https://wa.me/55DDDNUMERO?text=` com o texto codificado, montado a partir dos modelos editáveis e suas variáveis. O envio final é o seu toque (sem API paga).

### 8.7 E-mail

Resend chamado por Edge Function. Sem domínio próprio verificado, o plano gratuito envia apenas para o e-mail da sua conta, o que basta, já que os e-mails são lembretes para você.

## 9. Rotinas Automáticas

Horários no fuso configurado (o pg_cron trabalha em UTC, então é preciso converter).

| Rotina | Quando | O que faz |
|---|---|---|
| Sincronizar anúncios | 06:00 e 14:00 | Busca os últimos 7 dias no Meta e no Google (dados recentes mudam por causa da janela de atribuição) e grava as métricas |
| Verificar alertas | Após cada sincronização | Aplica as regras e cria os avisos |
| Rotina diária | 00:10 | Gera cobranças dos próximos 35 dias, marca atrasadas, cria tarefas recorrentes, agenda relatórios, expira propostas e briefings |
| Lembretes | A cada 5 minutos | Envia push e e-mail de eventos, tarefas e cobranças no horário certo |
| Fila do Google Agenda | Ao salvar e a cada 15 minutos | Envia alterações pendentes |
| Lembrete de backup | Semanal | Avisa para baixar o backup |

Todas as rotinas são idempotentes: rodar duas vezes não duplica nada.

## 10. Segurança

- Login com e-mail e senha (Supabase Auth). O cadastro público é desativado logo depois de criar a sua conta.
- RLS em todas as tabelas, liberando só registros com `dono_id = auth.uid()`.
- Tokens do Google e do Meta, chave privada VAPID, chave do webhook e chave do Resend ficam só como segredos das Edge Functions (ou no Vault do Supabase), nunca no código do navegador nem no GitHub.
- A página pública de briefing acessa dados apenas pela Edge Function `briefing-publico`, validando o token. Nenhuma tabela fica aberta ao público.
- O arquivo de backup contém dados pessoais dos clientes (LGPD): guardar em local seguro.
- Opção de sair de todos os dispositivos em Configurações.

## 11. Fases de Construção

Cada fase termina com o sistema utilizável. Ordem aprovada: todas as fases, nesta sequência.

**Fase 1 — Base (construída).** Projeto, login, bloqueio com PIN ou digital, quatro temas, fundo animado, navegação, app instalável, funcionamento sem internet com sincronização, Configurações, Catálogo de Serviços e Pacotes, Clientes, Agenda (sem Google), Tarefas e Checklists, Financeiro com carteiras e limite do MEI, Cobranças (geração automática, Pix, WhatsApp, multa e juros, baixa manual), Metas Mensais, Painel e Importação, Exportação e Backup. Cobranças e Metas foram antecipadas da Fase 2.

**Fase 2 — Vendas e Contratos.** Funil de Prospecção, recebimento automático dos leads quentes do sistema de captação do Google Maps, Propostas (três modos), Contratos (cancelamento, multa e juros, reajuste), aceite online e assinatura gov.br, Briefing do Cliente, modelos de mensagem editáveis, Indicações (16.7), Terceirizados (16.9), Horas e Lucro por Cliente (16.3) e Reajuste Anual (16.5).

**Fase 3 — Google, Avisos e Inteligência.** Sincronização com o Google Agenda, Agendamento Público (16.6), Notificações (push, e-mail e central), rotinas no servidor, Resumo Semanal (16.13), Recursos Inteligentes (16.12), Pesquisa de Satisfação (16.11) e Backup Automático no Google Drive (16.15).

**Fase 4 — Campanhas e Relatórios.** Integrações com Meta Ads e Google Ads, Campanhas, faturamento informado e ROAS, Diário de Otimizações e Metas por Cliente (16.10), Leads dos Formulários do Meta (16.16), Relatórios em PDF com melhores anúncios opcionais e Alertas de Campanha.

**Fase 5 — Conteúdo, Sites e Cofre.** Calendário de Conteúdo com datas comemorativas, aprovação de posts e criativos por link, publicação automática no Instagram e no Facebook (16.1), Projetos de Site, Domínios e Hospedagem (16.2) e Cofre de Acessos (16.4).

## 12. Preparação Antes de Começar

**Agora (Pode Levar Dias para Aprovar):**
- Criar a conta de administrador (MCC) do Google Ads, vincular as contas dos clientes e pedir o token de desenvolvedor com acesso básico.
- Criar o app no Meta for Developers e o usuário do sistema no Gerenciador de Negócios.

**Antes da Fase 1:**
- Node.js (versão LTS) e Git instalados.
- Contas gratuitas no GitHub, no Supabase e na Cloudflare.
- Logo da Continental MKT em SVG ou PNG com fundo transparente.

**Antes da Fase 2:**
- Dados do Pix (chave, nome do recebedor e cidade).
- Preços-base do catálogo.
- Texto-base dos contratos revisado por um advogado.

**Antes da Fase 3:**
- Conta gratuita no Resend.
- Calendar API e Drive API ativadas no projeto do Google Cloud.

**Antes da Fase 5:**
- App do Meta com as permissões de publicação no Instagram e na Página aprovadas na revisão do app (o agente confere na documentação atual quais são).
- Perfil do Instagram de cada cliente como conta profissional ligada a uma Página do Facebook.

## 13. Pontos de Atenção

- **Contratos:** o modelo-base precisa ser revisado por um advogado uma vez, incluindo a cláusula de não garantia de resultados. O cliente pode assinar o PDF gratuitamente pelo assinador do gov.br.
- **Plano Gratuito do Supabase:** projetos sem uso podem ser pausados e não há backup acessível no plano gratuito. O uso diário e o backup semanal resolvem.
- **Desempenho:** vidro com desfoque sobre fundo animado em todas as telas exige bastante do celular. Testar no seu Android desde a Fase 1; se travar, o modo Economia vira o padrão no celular.
- **Métricas:** as plataformas ajustam os dados dos últimos dias, por isso a sincronização reprocessa sempre 7 dias.
- **Pix Estático:** não confirma o pagamento sozinho; a baixa é manual.
- **Leads:** só chegam com o n8n rodando no computador.

## 14. Questões em Aberto

| Questão | Quem responde | Bloqueia |
|---|---|---|
| Arquivo do logo da Continental MKT | Alessandro | Fase 1 |
| Preços-base de cada serviço e pacotes iniciais | Alessandro | Fase 2 |
| Perguntas dos briefings de cada serviço (o agente propõe um modelo inicial para revisão) | Alessandro | Fase 2 |
| Revisar os checklists e tarefas mensais propostos (já cadastrados e editáveis em Tarefas → Modelos) | Alessandro | Nenhuma |
| Texto-base dos contratos revisado por advogado | Alessandro | Fase 2 |
| Limite anual do MEI vigente (padrão R$ 81.000, editável) | Alessandro | Nenhuma |

## 15. Como Usar no Antigravity

1. Descompacte o projeto e abra a pasta `continental-atlas` no Antigravity.
2. O agente lê sozinho o `AGENTS.md` e a regra em `.agents/rules/`. Eles apontam para esta especificação.
3. Siga o `README.md` para rodar o Atlas, ligar o Supabase e publicar.
4. Para cada fase, use o pedido pronto do README (seção "Próximas Fases"). O modelo é:

```
Leia AGENTS.md e docs/especificacao-continental-atlas.md. Vamos implementar
somente a Fase N. Antes de escrever código, me apresente o plano (telas,
tabelas usadas, funções no servidor) e o passo a passo, em linguagem
simples, das contas que eu preciso configurar. Depois de eu aprovar,
implemente módulo por módulo, rode npm run typecheck e npm run build,
teste no celular (390 px) e no computador, e confira os critérios de
aceite de cada módulo.
```

5. Ao concluir cada fase, peça para o agente conferir todos os critérios de aceite antes de passar para a próxima.

O mesmo projeto também funciona no Claude Code: o `CLAUDE.md` aponta para o `AGENTS.md`.

---

## 16. Recursos da Versão 2.0

Cada recurso indica a fase em que entra. As tabelas já existem no banco.

### 16.1 Conteúdo, Aprovação e Publicação (Fase 5)

Calendário de conteúdo por cliente, com posts em etapas (Ideia, Produção, Aprovação, Ajustes, Aprovado, Agendado, Publicado). O calendário sugere datas comemorativas conforme o nicho do cliente.

Clientes marcados com "Aprova posts e criativos" recebem um link único (sem login) onde veem os posts e os criativos de anúncios, em seções separadas, e respondem Aprovar ou Pedir ajustes com comentário. Se o cliente não responder, o item **fica esperando** e o Atlas avisa você para cobrar a resposta (sem aprovação automática). Criativo aprovado fica marcado como pronto para subir e gera uma tarefa, porque o Atlas não cria anúncios.

Posts aprovados e agendados são publicados sozinhos no Instagram e no Facebook na data marcada.

**Critérios de aceite:**
- O link de aprovação mostra só os itens daquele cliente e funciona no celular.
- Uma resposta de ajuste volta o post para Ajustes, com o comentário visível na ficha.
- Item em Aprovação há mais de 2 dias gera aviso para cobrar o cliente.
- Post agendado é publicado no horário (tolerância de 5 minutos); falha fica marcada como Erro, com o motivo, e gera aviso.

### 16.2 Projetos de Site, Domínios e Hospedagem (Fase 5)

Projetos de site e landing page com etapas (Briefing, Conteúdo, Layout, Desenvolvimento, Revisão, Publicação), prazo por etapa e limite de revisões por contrato. Cadastro de domínios e hospedagens com vencimentos na agenda e aviso 30 e 7 dias antes, indicando quem paga.

**Critérios de aceite:**
- Ao passar do limite de revisões, o Atlas avisa e sugere cobrar a revisão extra.
- O vencimento de domínio aparece na agenda e no Painel 30 dias antes.

### 16.3 Horas e Lucro por Cliente (Fase 2)

Registro de horas por cronômetro (iniciar e parar na ficha do cliente ou numa tarefa) e manual. Lucro por cliente = receitas do cliente − custos diretos (terceirizados e verbas não reembolsadas) − rateio igual das ferramentas entre os clientes ativos − horas × valor da hora (Configurações).

**Critérios de aceite:**
- O cronômetro continua contando se o app for fechado e reaberto.
- A ficha mostra o lucro do mês e dos últimos 12 meses, com a conta aberta item por item.

### 16.4 Cofre de Acessos (Fase 5)

Logins e senhas dos clientes (Meta, Google, hospedagem, redes) criptografados no aparelho com uma senha mestra (AES-GCM com chave derivada por PBKDF2). O banco guarda só texto cifrado. A senha mestra nunca é gravada; se for esquecida, os acessos não podem ser recuperados, e isso é avisado na criação.

**Critérios de aceite:**
- Nenhum valor legível aparece no banco ou no backup.
- O cofre se tranca sozinho após 2 minutos sem uso.

### 16.5 Reajuste Anual (Fase 2)

No aniversário do contrato, o Atlas sugere o reajuste (índice ou percentual fixo definido no contrato), gera a mensagem de aviso ao cliente com 30 dias de antecedência e, na data, atualiza o valor dos serviços e das cobranças futuras.

**Critérios de aceite:**
- Nenhum valor muda sem sua confirmação.
- O histórico de reajustes fica na ficha do cliente.

### 16.6 Agendamento Público (Fase 3)

Página pública com seu link, onde o lead ou cliente escolhe um horário livre (cruzando com o Google Agenda e com a agenda do Atlas). Também é possível marcar manualmente. A marcação cria o evento, o lead no funil (se for novo) e o aviso para você.

**Critérios de aceite:**
- Horário ocupado nunca aparece como livre.
- Respeita duração, antecedência mínima e janelas configuradas.

### 16.7 Indicações (Fase 2)

Cliente que indica ganha desconto na mensalidade (percentual ou valor, por quantos meses você definir). O desconto é aplicado nas próximas cobranças quando o indicado fecha.

**Critérios de aceite:** a cobrança mostra o desconto separado e a ficha do cliente lista as indicações feitas.

### 16.8 MEI (Fase 1, construído)

Lembrete do DAS todo dia 20 e da DASN-SIMEI até 31/05 na agenda; faturamento do ano contra o limite do MEI no Financeiro, com aviso acima de 80%. O contrato da Fase 2 usa os dados de MEI da empresa.

### 16.9 Terceirizados (Fase 2)

Cadastro de prestadores e serviços terceirizados por cliente, que viram contas a pagar no Financeiro e entram no lucro por cliente.

### 16.10 Diário de Otimizações e Metas por Cliente (Fase 4)

Registro rápido das otimizações feitas em cada campanha (data, campanha, o que foi feito). Metas de resultado por cliente (custo por lead, ROAS, quantidade de resultados, CPC). Os dois aparecem no relatório: as otimizações marcadas e a comparação meta × realizado.

### 16.11 Pesquisa de Satisfação (Fase 3)

Você escolhe a data de envio por cliente. O cliente responde nota de 0 a 10 e comentário por link. Nota baixa gera alerta de cliente em risco.

### 16.12 Recursos Inteligentes (Fase 3)

Todos funcionam por regras, sem IA paga, e aparecem como alertas no Painel.
- **Cliente em Risco:** atraso de pagamento, nota baixa na pesquisa, meta de resultado não batida por 2 meses ou aprovação parada.
- **Oportunidades de Venda:** serviços do catálogo que o cliente ainda não tem (ex.: tráfego sem landing page) e clientes com bons resultados há 3 meses.
- **Ata que Vira Tarefas:** depois de uma reunião, você escreve a ata; cada linha marcada como ação vira tarefa com prazo e cliente.
- **Aniversários:** aniversário do cliente e do contrato, com mensagem pronta no WhatsApp.

**Critérios de aceite:** o mesmo alerta não se repete (chave única) e cada alerta leva direto à ação.

### 16.13 Resumo Semanal (Fase 3)

Toda segunda às 7h, um resumo da semana por push e e-mail: agenda, cobranças, tarefas, alertas e metas.

### 16.14 Bloqueio com PIN ou Digital (Fase 1, construído)

PIN de 4 a 6 números e digital pelo leitor do aparelho, pedidos ao abrir e após 5 minutos em segundo plano. Vale por aparelho.

### 16.15 Backup Automático no Google Drive (Fase 3)

Toda semana, uma Edge Function gera o backup completo e salva numa pasta do seu Google Drive, mantendo as últimas 8 cópias. O backup manual da Fase 1 continua disponível.

### 16.16 Leads dos Formulários do Meta (Fase 4)

Opcional por cliente ("Puxar os leads dos formulários do Meta"). Os leads chegam por webhook, ficam na ficha do cliente e podem ir no relatório.

## 17. Funcionamento Sem Internet e Sincronização

O Atlas é "local primeiro": toda gravação vai para o banco do aparelho (IndexedDB, via Dexie) e entra numa fila de envio. Com internet, a fila é enviada ao Supabase e o que mudou em outros aparelhos é baixado.

- **Conflitos:** vence a edição mais recente (`atualizado_em`). O gatilho `atlas_antes_gravar` descarta gravações mais antigas e guarda a versão anterior em `historico_versoes`.
- **Registros automáticos** (cobranças, vencimentos, tarefas mensais, lembretes) usam ID determinístico: celular e computador geram o mesmo registro, sem duplicar. Eles nascem com data de atualização antiga, então qualquer edição sua sempre vence.
- **Recebimento:** por `sincronizado_em` (hora do servidor) + `id`, em páginas de 1.000, sem pular registros gravados no mesmo instante.
- **Exclusão:** sempre lógica (`excluido = true`).
- **Sem Supabase configurado:** modo local, com os dados só no aparelho. O backup e a restauração continuam funcionando.
- **Indicador:** o topo mostra Modo local, Sem internet, Sincronizando, Sincronizado ou Erro.
