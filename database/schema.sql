-- Esquema inicial do BEREAN
-- Rode este arquivo no SQL Editor do painel do Supabase (Supabase Dashboard > SQL Editor > New query).

-- 1. Perfis: uma linha por pessoa que faz login (mentor ou mentorado)
create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('mentor', 'mentorado')),
  avatar_url text,
  precisa_trocar_senha boolean not null default false,
  criado_em timestamptz not null default now()
);

-- 2. Categorias: agrupamento de mais alto nível (ex: Inglês, Vendas, Provérbios)
create table categorias (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references perfis (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

-- 3. Módulos: agrupam sessões dentro de uma categoria (ex: "Past simple")
create table modulos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

-- 4. Sessões: a unidade de conteúdo (o "episódio" com áudio)
--    origem_audio indica como o áudio foi produzido:
--      'gravacao'  -> mentor gravou pelo próprio app
--      'upload'    -> mentor enviou um arquivo do dispositivo
--      'texto_voz' -> mentor escreveu um texto e o app lê em voz alta (voz nativa do celular, sem custo)
create table sessoes (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references modulos (id) on delete cascade,
  titulo text not null,
  ordem integer not null default 0,
  origem_audio text check (origem_audio in ('gravacao', 'upload', 'texto_voz')), -- nulo até o mentor adicionar o conteúdo de áudio
  audio_url text, -- preenchido quando origem_audio é 'gravacao' ou 'upload'; nulo quando é 'texto_voz'
  texto_origem text, -- preenchido quando origem_audio é 'texto_voz'
  duracao_segundos integer, -- nulo quando a duração ainda não é conhecida (ex: texto_voz antes de tocar)
  data_liberacao timestamptz, -- funcionalidade futura: liberar a sessão só a partir dessa data
  criado_em timestamptz not null default now()
);

-- 5. Trechos de transcrição: cada frase com o segundo em que começa/termina no áudio,
--    usado para destacar a frase certa enquanto o áudio toca (efeito "karaokê").
--    Só se aplica a sessões com áudio de verdade (gravacao/upload) — sessões do tipo
--    texto_voz destacam a palavra em tempo real usando o texto_origem direto, sem precisar desta tabela.
create table transcricao_trechos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes (id) on delete cascade,
  ordem integer not null,
  texto text not null,
  inicio_segundos numeric not null,
  fim_segundos numeric not null
);

-- 6. Conteúdo extra: campo flexível por sessão (fórmula, imagem, quiz, prática de pronúncia...)
create table conteudo_extra (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes (id) on delete cascade,
  tipo text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

-- 7. Progresso: liga um mentorado a uma sessão e guarda o status/posição
create table progresso (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references perfis (id) on delete cascade,
  sessao_id uuid not null references sessoes (id) on delete cascade,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado', 'em_andamento', 'concluido')),
  posicao_segundos numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (mentorado_id, sessao_id)
);
