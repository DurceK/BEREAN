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

-- 2b. Matrículas: liga um mentorado a uma categoria específica.
--     Um mentorado só vê o conteúdo de categorias em que está matriculado.
create table matriculas (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references perfis (id) on delete cascade,
  categoria_id uuid not null references categorias (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (mentorado_id, categoria_id)
);

-- 3. Módulos: agrupam sessões dentro de uma categoria (ex: "Past simple")
create table modulos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

-- 4. Sessões: a unidade de conteúdo (o "episódio"). O conteúdo em si
--    (áudio/foto/vídeo) mora na tabela midias, não aqui.
create table sessoes (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references modulos (id) on delete cascade,
  titulo text not null,
  ordem integer not null default 0,
  data_liberacao timestamptz, -- funcionalidade futura: liberar a sessão só a partir dessa data
  criado_em timestamptz not null default now()
);

-- 5. Mídias: lista ordenada de itens de conteúdo de uma sessão (áudio, foto ou vídeo).
--    tipo indica a origem/natureza do item:
--      'audio_gravado' -> mentor gravou pelo próprio app
--      'audio_upload'  -> mentor enviou um arquivo de áudio do dispositivo
--      'audio_texto'   -> mentor escreveu um texto e o app lê em voz alta (voz nativa do celular, sem custo)
--      'imagem'        -> foto enviada
--      'video'         -> vídeo enviado
create table midias (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes (id) on delete cascade,
  tipo text not null check (tipo in ('audio_gravado', 'audio_upload', 'audio_texto', 'imagem', 'video')),
  ordem integer not null default 0,
  caminho_storage text, -- caminho do arquivo no bucket 'midias'; nulo quando tipo = 'audio_texto'
  texto_origem text, -- só usado quando tipo = 'audio_texto'
  duracao_segundos numeric,
  criado_em timestamptz not null default now()
);

-- 6. Trechos de transcrição: cada frase com o segundo em que começa/termina no áudio,
--    usado para destacar a frase certa enquanto o áudio toca (efeito "karaokê").
--    Pertence a uma mídia específica (um áudio), já que uma sessão pode ter mais de um.
create table transcricao_trechos (
  id uuid primary key default gen_random_uuid(),
  midia_id uuid not null references midias (id) on delete cascade,
  ordem integer not null,
  texto text not null,
  inicio_segundos numeric not null,
  fim_segundos numeric not null
);

-- 7. Conteúdo extra: campo flexível por sessão (fórmula, quiz, prática de pronúncia...)
create table conteudo_extra (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes (id) on delete cascade,
  tipo text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

-- 8. Progresso: liga um mentorado a uma sessão e guarda o status/posição
create table progresso (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references perfis (id) on delete cascade,
  sessao_id uuid not null references sessoes (id) on delete cascade,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado', 'em_andamento', 'concluido')),
  posicao_segundos numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (mentorado_id, sessao_id)
);
