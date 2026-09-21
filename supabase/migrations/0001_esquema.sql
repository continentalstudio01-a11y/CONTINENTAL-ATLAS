-- =====================================================================
-- Continental Atlas — esquema completo do banco (todas as fases)
-- Rode inteiro no SQL Editor do Supabase (ou com `supabase db push`).
-- Pode rodar de novo sem quebrar: tudo usa "if not exists".
--
-- Regras gerais (ver AGENTS.md):
--  * Toda tabela tem dono_id, criado_em, atualizado_em, excluido e sincronizado_em
--    (acrescentados pelo bloco "Colunas comuns" no fim deste arquivo).
--  * RLS em todas: cada linha só é visível para o dono (auth.uid()).
--  * Exclusão é lógica (excluido = true) para a sincronização offline funcionar.
--  * "Último a editar vence": o gatilho atlas_antes_gravar descarta gravações com
--    atualizado_em mais antigo e guarda a versão anterior em historico_versoes.
--  * Chaves estrangeiras só apontam para tabelas que sincronizam ANTES
--    (ordem em src/lib/db.ts → TABELAS_SYNC). Referências cruzadas ficam sem FK.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Histórico de versões (para desfazer conflitos de sincronização)
-- ---------------------------------------------------------------------
create table if not exists historico_versoes (
  id bigint generated always as identity primary key,
  dono_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tabela text not null,
  registro_id uuid not null,
  dados jsonb not null,
  guardado_em timestamptz not null default now()
);
create index if not exists historico_versoes_registro on historico_versoes (dono_id, tabela, registro_id, guardado_em desc);
alter table historico_versoes enable row level security;
drop policy if exists dono on historico_versoes;
create policy dono on historico_versoes for all to authenticated using (dono_id = auth.uid()) with check (dono_id = auth.uid());

create or replace function atlas_antes_gravar() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.atualizado_em < old.atualizado_em then
      return null; -- gravação mais antiga perde: o registro fica como está
    end if;
    if new.atualizado_em > old.atualizado_em then
      insert into historico_versoes (dono_id, tabela, registro_id, dados)
      values (old.dono_id, tg_table_name, old.id, to_jsonb(old));
    end if;
    new.dono_id := old.dono_id;
  end if;
  new.sincronizado_em := clock_timestamp();
  return new;
end $$;

-- =====================================================================
-- FASE 1 — BASE
-- =====================================================================
create table if not exists configuracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_nome text not null default '',
  responsavel_nome text not null default '',
  cnpj text not null default '',
  endereco text not null default '',
  telefone text not null default '',
  email text not null default '',
  logo_url text,
  pix_chave text not null default '',
  pix_nome text not null default '',
  pix_cidade text not null default '',
  fuso_horario text not null default 'America/Sao_Paulo',
  valor_hora numeric(12,2) not null default 0,
  mei boolean not null default true,
  limite_mei numeric(12,2) not null default 81000,
  multa_padrao numeric(6,2) not null default 2,
  juros_padrao numeric(6,2) not null default 1
);

create table if not exists servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  chave text not null default 'outro' check (chave in ('trafego','site','social','gmn','outro')),
  descricao text not null default '',
  tipo_cobranca_padrao text not null default 'mensal' check (tipo_cobranca_padrao in ('mensal','pacote')),
  preco_base numeric(12,2) not null default 0,
  ativo boolean not null default true
);

create table if not exists pacotes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  itens jsonb not null default '[]',
  preco_total numeric(12,2) not null default 0,
  tipo_cobranca text not null default 'mensal' check (tipo_cobranca in ('mensal','pacote')),
  ativo boolean not null default true
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  tipo_pessoa text not null default 'PJ' check (tipo_pessoa in ('PF','PJ')),
  nome text not null,
  nome_fantasia text not null default '',
  documento text not null default '',
  responsavel text not null default '',
  telefone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  endereco text not null default '',
  cidade text not null default '',
  uf text not null default '',
  nicho text not null default '',
  origem text not null default '',
  indicado_por_id uuid,
  status text not null default 'ativo' check (status in ('ativo','pausado','encerrado')),
  observacoes text not null default '',
  aniversario date,
  multa_ativa boolean not null default false,
  multa_percentual numeric(6,2) not null default 2,
  juros_mensal numeric(6,2) not null default 1,
  aprova_posts boolean not null default false,
  lead_id uuid
);

create table if not exists cliente_servicos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  servico_id uuid not null references servicos(id),
  descricao text not null default '',
  tipo_cobranca text not null default 'mensal' check (tipo_cobranca in ('mensal','pacote')),
  valor numeric(12,2) not null default 0,
  dia_vencimento int not null default 10 check (dia_vencimento between 1 and 31),
  parcelas int not null default 1 check (parcelas >= 1),
  primeiro_vencimento date,
  inicio date not null default current_date,
  fim date,
  status text not null default 'ativo' check (status in ('ativo','encerrado'))
);

create table if not exists cliente_trafego (
  id uuid primary key default gen_random_uuid(), -- igual ao cliente_id
  cliente_id uuid not null references clientes(id) on delete cascade,
  quem_paga_verba text not null default 'cliente' check (quem_paga_verba in ('cliente','continental')),
  verba_mensal_planejada numeric(12,2) not null default 0,
  resultado_principal text not null default 'leads' check (resultado_principal in ('leads','conversas','compras','cliques')),
  frequencia_relatorio text not null default 'mensal' check (frequencia_relatorio in ('semanal','quinzenal','mensal','nenhuma')),
  dia_relatorio int not null default 5,
  puxar_leads_formularios boolean not null default false
);

create table if not exists contas_anuncio (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  plataforma text not null check (plataforma in ('meta','google')),
  conta_externa_id text not null,
  nome text not null default '',
  ativa boolean not null default true
);

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  carteira text not null check (carteira in ('negocio','pessoal')),
  nome text not null,
  tipo text not null check (tipo in ('entrada','saida')),
  especial text check (especial in ('receita_servico','verba_adiantada','imposto'))
);

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  carteira text not null check (carteira in ('negocio','pessoal')),
  categoria_id uuid references categorias(id),
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null default '',
  valor numeric(12,2) not null check (valor >= 0),
  data date not null,
  status text not null default 'pago' check (status in ('previsto','pago')),
  forma_pagamento text not null default '',
  cliente_id uuid references clientes(id),
  cobranca_id uuid,            -- sem FK: cobranças sincronizam depois
  recorrente boolean not null default false,
  recorrencia_origem_id uuid,  -- sem FK: autorreferência gerada offline
  referencia text,
  reembolsado_em date
);

create table if not exists cobrancas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  cliente_servico_id uuid references cliente_servicos(id),
  lancamento_origem_id uuid,   -- verba adiantada que originou o reembolso
  descricao text not null default '',
  valor numeric(12,2) not null check (valor >= 0),
  vencimento date not null,
  status text not null default 'aberta' check (status in ('aberta','paga','atrasada','cancelada')),
  pago_em date,
  valor_pago numeric(12,2),
  forma_pagamento text not null default '',
  lancamento_id uuid,
  referencia text
);

create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'reuniao' check (tipo in ('reuniao','prazo','vencimento','relatorio','pessoal','conteudo')),
  inicio timestamptz not null,
  fim timestamptz,
  dia_inteiro boolean not null default false,
  local_link text not null default '',
  descricao text not null default '',
  cliente_id uuid references clientes(id),
  lead_id uuid,
  recorrencia text not null default 'nenhuma' check (recorrencia in ('nenhuma','semanal','mensal')),
  lembretes jsonb not null default '[]',
  automatico boolean not null default false,
  origem_tabela text,
  origem_id text,
  google_event_id text,
  sync_pendente boolean not null default true
);

create table if not exists tarefa_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('checklist','recorrente')),
  servico_id uuid references servicos(id),
  itens jsonb not null default '[]',
  dia_do_mes int not null default 1
);

create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  prazo date,
  prioridade text not null default 'media' check (prioridade in ('alta','media','baixa')),
  status text not null default 'aberta' check (status in ('aberta','concluida')),
  cliente_id uuid references clientes(id),
  origem text not null default 'avulsa' check (origem in ('avulsa','checklist','recorrente','sistema')),
  modelo_id uuid references tarefa_modelos(id),
  referencia text,
  ordem int not null default 0,
  concluida_em timestamptz
);

create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  faturamento_alvo numeric(12,2) not null default 0,
  novos_clientes_alvo int not null default 0
);

-- =====================================================================
-- FASE 2 — VENDAS, CONTRATOS E COBRANÇA
-- =====================================================================
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa text not null default '',
  telefone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  cidade text not null default '',
  nicho text not null default '',
  origem text not null default '',
  etapa text not null default 'novo' check (etapa in ('novo','contato','reuniao','proposta','fechado','perdido')),
  valor_estimado numeric(12,2) not null default 0,
  motivo_perda text,
  pontuacao int,
  chave_externa text,           -- id do lead no sistema de captação (idempotência do webhook)
  dados_externos jsonb not null default '{}',
  proximo_contato date,
  observacoes text not null default '',
  cliente_id uuid
);
create unique index if not exists leads_chave_externa on leads (chave_externa) where chave_externa is not null;

create table if not exists lead_interacoes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  tipo text not null default 'nota',
  descricao text not null default '',
  data timestamptz not null default now()
);

create table if not exists mensagem_modelos (
  id uuid primary key default gen_random_uuid(),
  chave text not null,          -- cobranca_a_vencer, cobranca_atrasada, proposta, relatorio, pesquisa...
  nome text not null,
  texto text not null
);

create table if not exists propostas (
  id uuid primary key default gen_random_uuid(),
  numero text not null default '',
  lead_id uuid references leads(id),
  cliente_id uuid references clientes(id),
  modo text not null default 'pacote' check (modo in ('pacote','modelo','livre')),
  titulo text not null default '',
  itens jsonb not null default '[]',
  desconto numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  validade date,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aceita','recusada','expirada')),
  aprovacao text not null default 'online' check (aprovacao in ('online','govbr')),
  token_publico text unique,
  aceite_nome text, aceite_documento text, aceite_em timestamptz, aceite_ip text,
  pdf_path text
);

create table if not exists contrato_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  servico_chave text,
  clausulas jsonb not null default '[]'
);

create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  numero text not null default '',
  cliente_id uuid not null references clientes(id),
  proposta_id uuid references propostas(id),
  aditivo_de uuid,
  clausulas jsonb not null default '[]',
  fidelidade_meses int not null default 0,
  aviso_previo_dias int not null default 30,
  multa_rescisoria numeric(12,2) not null default 0,
  reajuste_indice text not null default 'nenhum' check (reajuste_indice in ('nenhum','ipca','igpm','fixo')),
  reajuste_percentual numeric(6,2),
  data_inicio date, data_fim date,
  status text not null default 'rascunho' check (status in ('rascunho','enviado','assinado','encerrado')),
  aprovacao text not null default 'online' check (aprovacao in ('online','govbr')),
  token_publico text unique,
  assinado_em timestamptz,
  assinatura_dados jsonb,
  pdf_path text, pdf_assinado_path text
);

create table if not exists briefing_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  servico_chave text,
  perguntas jsonb not null default '[]'
);

create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  lead_id uuid references leads(id),
  modelo_id uuid references briefing_modelos(id),
  token_publico text unique,
  respostas jsonb not null default '{}',
  status text not null default 'rascunho' check (status in ('rascunho','enviado','respondido')),
  enviado_em timestamptz, respondido_em timestamptz
);

create table if not exists indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicador_cliente_id uuid not null references clientes(id),
  indicado_cliente_id uuid references clientes(id),
  lead_id uuid references leads(id),
  desconto_tipo text not null default 'percentual' check (desconto_tipo in ('percentual','valor')),
  desconto_valor numeric(12,2) not null default 0,
  meses int not null default 1,
  status text not null default 'pendente' check (status in ('pendente','aplicada','cancelada')),
  aplicada_em date
);

create table if not exists prestadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  especialidade text not null default '',
  telefone text not null default '',
  pix_chave text not null default '',
  observacoes text not null default ''
);

create table if not exists servicos_terceirizados (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references prestadores(id),
  cliente_id uuid references clientes(id),
  descricao text not null default '',
  valor numeric(12,2) not null default 0,
  vencimento date,
  status text not null default 'aberto' check (status in ('aberto','pago','cancelado')),
  lancamento_id uuid
);

create table if not exists registros_horas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  tarefa_id uuid,
  descricao text not null default '',
  inicio timestamptz,
  fim timestamptz,
  minutos int not null default 0,
  origem text not null default 'manual' check (origem in ('cronometro','manual'))
);

create table if not exists reajustes (
  id uuid primary key default gen_random_uuid(),
  cliente_servico_id uuid not null references cliente_servicos(id),
  valor_anterior numeric(12,2) not null,
  valor_novo numeric(12,2) not null,
  percentual numeric(6,2),
  indice text,
  aplicar_em date not null,
  status text not null default 'previsto' check (status in ('previsto','comunicado','aplicado','cancelado')),
  comunicado_em timestamptz
);

-- =====================================================================
-- FASE 3 — GOOGLE, AVISOS E RECURSOS INTELIGENTES
-- =====================================================================
create table if not exists integracoes (
  id uuid primary key default gen_random_uuid(),
  provedor text not null check (provedor in ('google','meta','google_ads','resend')),
  conta text not null default '',
  escopos text not null default '',
  expira_em timestamptz,
  estado jsonb not null default '{}'
);

-- Segredos (tokens OAuth). RLS ligado e SEM política: só as Edge Functions
-- (service_role) leem e gravam. O navegador nunca vê um token.
create table if not exists integracoes_segredos (
  integracao_id uuid primary key references integracoes(id) on delete cascade,
  dono_id uuid not null references auth.users(id) on delete cascade,
  token_acesso text,
  token_renovacao text,
  atualizado_em timestamptz not null default now()
);
alter table integracoes_segredos enable row level security;

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  corpo text not null default '',
  link text,
  tipo text not null default 'aviso',
  canais jsonb not null default '["interno"]',
  enviar_em timestamptz not null default now(),
  enviada_em timestamptz,
  lida boolean not null default false,
  chave text                     -- idempotência (não repetir o mesmo aviso)
);
create unique index if not exists notificacoes_chave on notificacoes (chave) where chave is not null;

create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  chaves jsonb not null,
  aparelho text not null default ''
);

create table if not exists agendamento_config (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null default 'Reunião com a Continental MKT',
  duracao_min int not null default 30,
  antecedencia_horas int not null default 12,
  janelas jsonb not null default '[]',   -- [{dia_semana:1, inicio:"09:00", fim:"12:00"}, ...]
  ativo boolean not null default true
);

create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null, email text not null default '', telefone text not null default '',
  inicio timestamptz not null, fim timestamptz not null,
  evento_id uuid, lead_id uuid,
  status text not null default 'confirmado' check (status in ('confirmado','cancelado'))
);

create table if not exists atas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid,
  cliente_id uuid references clientes(id),
  texto text not null default '',
  acoes jsonb not null default '[]',     -- itens de ação que viram tarefas
  processada boolean not null default false
);

create table if not exists alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('cliente_risco','oportunidade','aniversario','campanha','sistema')),
  cliente_id uuid references clientes(id),
  titulo text not null,
  detalhe jsonb not null default '{}',
  gravidade text not null default 'media' check (gravidade in ('baixa','media','alta')),
  status text not null default 'novo' check (status in ('novo','visto','resolvido')),
  chave text
);
create unique index if not exists alertas_chave on alertas (chave) where chave is not null;

create table if not exists backups (
  id uuid primary key default gen_random_uuid(),
  arquivo_drive_id text,
  tamanho_bytes bigint,
  status text not null default 'ok'
);

-- =====================================================================
-- FASE 4 — CAMPANHAS E RELATÓRIOS
-- =====================================================================
create table if not exists metricas_diarias (
  id uuid primary key default gen_random_uuid(),
  conta_anuncio_id uuid not null references contas_anuncio(id),
  cliente_id uuid not null references clientes(id),
  data date not null,
  campanha_id text not null,
  campanha_nome text not null default '',
  investimento numeric(12,2) not null default 0,
  impressoes bigint not null default 0,
  alcance bigint not null default 0,
  cliques bigint not null default 0,
  resultados numeric(12,2) not null default 0,
  conversoes numeric(12,2) not null default 0,
  valor_conversoes numeric(12,2) not null default 0,
  dados jsonb not null default '{}',
  unique (conta_anuncio_id, data, campanha_id)
);

create table if not exists faturamento_informado (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  mes text not null,
  valor numeric(12,2) not null default 0,
  unique (cliente_id, mes)
);

create table if not exists metas_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  metrica text not null check (metrica in ('custo_resultado','roas','resultados','cpc','ctr')),
  alvo numeric(12,4) not null,
  vigente_desde date not null default current_date
);

create table if not exists otimizacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  data date not null default current_date,
  campanha text not null default '',
  categoria text not null default 'ajuste',
  descricao text not null,
  mostrar_no_relatorio boolean not null default true
);

create table if not exists leads_anuncios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  formulario_id text not null default '',
  leadgen_id text not null unique,
  dados jsonb not null default '{}',
  recebido_em timestamptz not null default now()
);

create table if not exists relatorios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  periodo_inicio date not null,
  periodo_fim date not null,
  incluir_melhores_anuncios boolean not null default false,
  anuncios_escolhidos jsonb not null default '[]',
  pdf_path text,
  status text not null default 'rascunho' check (status in ('rascunho','gerado','enviado')),
  enviado_em timestamptz
);

create table if not exists alerta_regras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  metrica text not null,
  condicao text not null check (condicao in ('maior','menor','sem_gasto','verba_acabando')),
  valor numeric(12,4),
  ativa boolean not null default true
);

create table if not exists pesquisas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  data_envio date not null,
  token_publico text unique,
  nota int check (nota between 0 and 10),
  comentario text,
  respondida_em timestamptz
);

-- =====================================================================
-- FASE 5 — CONTEÚDO, SITES E COFRE
-- =====================================================================
create table if not exists conteudos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  titulo text not null default '',
  legenda text not null default '',
  midias jsonb not null default '[]',   -- caminhos no Storage (bucket "midias")
  formato text not null default 'feed' check (formato in ('feed','carrossel','reels','story')),
  rede text not null default 'instagram' check (rede in ('instagram','facebook','ambos')),
  agendado_para timestamptz,
  status text not null default 'ideia' check (status in ('ideia','producao','aprovacao','ajustes','aprovado','agendado','publicado','erro')),
  data_comemorativa text,
  publicado_em timestamptz,
  id_externo text,
  erro text
);

create table if not exists criativos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  titulo text not null default '',
  midias jsonb not null default '[]',
  texto text not null default '',
  plataforma text not null default 'meta' check (plataforma in ('meta','google')),
  status text not null default 'aprovacao' check (status in ('producao','aprovacao','ajustes','aprovado','no_ar')),
  aprovado_em timestamptz
);

create table if not exists aprovacao_links (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  token_publico text not null unique,
  ativo boolean not null default true
);

create table if not exists aprovacao_respostas (
  id uuid primary key default gen_random_uuid(),
  item_tabela text not null check (item_tabela in ('conteudos','criativos')),
  item_id uuid not null,
  decisao text not null check (decisao in ('aprovado','ajustes')),
  comentario text,
  respondido_em timestamptz not null default now()
);

create table if not exists datas_comemorativas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  nome text not null,
  nichos text[] not null default '{}'
);

create table if not exists projetos_site (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  nome text not null,
  tipo text not null default 'site' check (tipo in ('site','landing')),
  etapa_atual text not null default 'briefing',
  limite_revisoes int not null default 2,
  revisoes_usadas int not null default 0,
  prazo date,
  status text not null default 'andamento' check (status in ('andamento','pausado','entregue','cancelado'))
);

create table if not exists projeto_etapas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos_site(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  prazo date,
  concluida_em timestamptz
);

create table if not exists dominios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  dominio text not null,
  registrador text not null default '',
  hospedagem text not null default '',
  vence_dominio date,
  vence_hospedagem date,
  quem_paga text not null default 'cliente' check (quem_paga in ('cliente','continental')),
  valor numeric(12,2) not null default 0,
  observacoes text not null default ''
);

-- Cofre: tudo é criptografado NO APARELHO (AES-GCM com chave derivada da senha
-- mestra por PBKDF2). O banco só guarda texto cifrado.
create table if not exists cofre_itens (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  servico text not null default '',
  url text not null default '',
  cifrado text not null,          -- JSON {login, senha, notas} cifrado, em base64
  iv text not null
);

-- =====================================================================
-- Colunas comuns, RLS, gatilhos e tempo real (vale para todas as tabelas acima)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'configuracoes','servicos','pacotes','clientes','cliente_servicos','cliente_trafego','contas_anuncio',
    'categorias','lancamentos','cobrancas','eventos','tarefa_modelos','tarefas','metas',
    'leads','lead_interacoes','mensagem_modelos','propostas','contrato_modelos','contratos','briefing_modelos','briefings',
    'indicacoes','prestadores','servicos_terceirizados','registros_horas','reajustes',
    'integracoes','notificacoes','push_inscricoes','agendamento_config','agendamentos','atas','alertas','backups',
    'metricas_diarias','faturamento_informado','metas_cliente','otimizacoes','leads_anuncios','relatorios','alerta_regras','pesquisas',
    'conteudos','criativos','aprovacao_links','aprovacao_respostas','datas_comemorativas','projetos_site','projeto_etapas','dominios','cofre_itens'
  ] loop
    execute format('alter table %I add column if not exists dono_id uuid not null default auth.uid() references auth.users(id) on delete cascade', t);
    execute format('alter table %I add column if not exists criado_em timestamptz not null default now()', t);
    execute format('alter table %I add column if not exists atualizado_em timestamptz not null default now()', t);
    execute format('alter table %I add column if not exists excluido boolean not null default false', t);
    execute format('alter table %I add column if not exists sincronizado_em timestamptz not null default clock_timestamp()', t);
    execute format('create index if not exists %I on %I (dono_id, sincronizado_em, id)', t || '_sync', t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dono on %I', t);
    execute format('create policy dono on %I for all to authenticated using (dono_id = auth.uid()) with check (dono_id = auth.uid())', t);
    execute format('drop trigger if exists antes_gravar on %I', t);
    execute format('create trigger antes_gravar before insert or update on %I for each row execute function atlas_antes_gravar()', t);
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when others then null; -- já estava na publicação
    end;
  end loop;
end $$;

create unique index if not exists metas_mes on metas (dono_id, mes) where not excluido;
create index if not exists cobrancas_cliente on cobrancas (dono_id, cliente_id, vencimento);
create index if not exists lancamentos_data on lancamentos (dono_id, carteira, data);
create index if not exists eventos_inicio on eventos (dono_id, inicio);
create index if not exists tarefas_prazo on tarefas (dono_id, status, prazo);

-- ---------------------------------------------------------------------
-- Armazenamento de arquivos (PDFs de propostas/contratos/relatórios e mídias dos posts)
-- Cada arquivo fica numa pasta com o id do dono: <dono_id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('midias', 'midias', false) on conflict (id) do nothing;

drop policy if exists atlas_arquivos_dono on storage.objects;
create policy atlas_arquivos_dono on storage.objects for all to authenticated
  using (bucket_id in ('documentos','midias') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('documentos','midias') and (storage.foldername(name))[1] = auth.uid()::text);
