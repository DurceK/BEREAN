-- Esquema do BEREAN
-- Usuários se inscrevem em categorias, que têm módulos, que têm aulas, que têm mídias.
-- Rode este arquivo no SQL Editor do painel do Supabase (Supabase Dashboard > SQL Editor > New query).

-- 1. Usuários: uma linha por pessoa que faz login (mentor ou mentorado)
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  matricula text not null unique, -- cópia da matrícula de login (o login usa matricula@berean.app)
  nome text not null,
  papel text not null check (papel in ('mentor', 'mentorado')),
  avatar_url text, -- caminho da foto no bucket "avatares" ({usuario_id}/arquivo)
  precisa_trocar_senha boolean not null default false,
  criado_em timestamptz not null default now()
);

-- 2. Categorias: agrupamento de mais alto nível (ex: Inglês, Vendas, Provérbios)
create table categorias (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references usuarios (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

-- 3. Inscrições: liga um mentorado a uma categoria.
--    Um mentorado só vê o conteúdo das categorias em que está inscrito.
create table inscricoes (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references usuarios (id) on delete cascade,
  categoria_id uuid not null references categorias (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (mentorado_id, categoria_id)
);

-- 4. Módulos: agrupam aulas dentro de uma categoria (ex: "Past simple")
create table modulos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

-- 5. Aulas: a unidade de conteúdo. O conteúdo em si (áudio/foto/vídeo) fica em midias.
create table aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references modulos (id) on delete cascade,
  titulo text not null,
  ordem integer not null default 0,
  data_liberacao timestamptz, -- funcionalidade futura: liberar a aula só a partir dessa data
  criado_em timestamptz not null default now()
);

-- 6. Mídias: lista ordenada de itens de uma aula (áudio, foto ou vídeo).
--    tipo indica a origem/natureza do item:
--      'audio_gravado' -> mentor gravou pelo próprio app
--      'audio_upload'  -> mentor enviou um arquivo de áudio do dispositivo
--      'audio_texto'   -> mentor escreveu um texto e o app lê em voz alta (voz nativa do celular, sem custo)
--      'imagem'        -> foto enviada
--      'video'         -> vídeo enviado
create table midias (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references aulas (id) on delete cascade,
  tipo text not null check (tipo in ('audio_gravado', 'audio_upload', 'audio_texto', 'imagem', 'video')),
  ordem integer not null default 0,
  caminho_storage text, -- caminho do arquivo no bucket 'midias'; nulo quando tipo = 'audio_texto'
  texto_origem text, -- só usado quando tipo = 'audio_texto'
  idioma text check (idioma in ('pt-BR', 'en-US')), -- voz do audio_texto; nulo = português
  duracao_segundos numeric,
  criado_em timestamptz not null default now()
);

-- 7. Transcrições: cada linha é um trecho do áudio com o segundo em que começa e termina,
--    usado para destacar a frase certa enquanto o áudio toca (efeito "karaokê").
--    Pertence a uma mídia (um áudio), já que uma aula pode ter mais de um.
create table transcricoes (
  id uuid primary key default gen_random_uuid(),
  midia_id uuid not null references midias (id) on delete cascade,
  ordem integer not null,
  texto text not null,
  inicio_segundos numeric not null,
  fim_segundos numeric not null
);

-- 8. Progresso: liga um mentorado a uma aula e guarda o status/posição
create table progresso (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references usuarios (id) on delete cascade,
  aula_id uuid not null references aulas (id) on delete cascade,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado', 'em_andamento', 'concluido')),
  posicao_segundos numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (mentorado_id, aula_id)
);
