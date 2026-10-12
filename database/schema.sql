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
--      'video'         -> vídeo enviado para o Storage (não é mais oferecido no app; os antigos continuam)
--      'youtube'       -> vídeo no YouTube; guarda só o link em url_externa
--      'exercicio'     -> exercício de múltipla escolha (perguntas na tabela questoes)
create table midias (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references aulas (id) on delete cascade,
  tipo text not null check (tipo in ('audio_gravado', 'audio_upload', 'audio_texto', 'imagem', 'video', 'youtube', 'exercicio')),
  url_externa text, -- link do vídeo quando tipo = 'youtube'
  titulo text, -- opcional, mostrado acima do conteúdo
  ordem integer not null default 0,
  caminho_storage text, -- caminho do arquivo no bucket 'midias'; nulo quando tipo = 'audio_texto'
  texto_origem text, -- só usado quando tipo = 'audio_texto'
  idioma text check (idioma in ('pt-BR', 'en-US')), -- voz do audio_texto; nulo = português
  duracao_segundos numeric,
  criado_em timestamptz not null default now()
);

-- 7. Progresso: liga um mentorado a uma aula e guarda o status
create table progresso (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references usuarios (id) on delete cascade,
  aula_id uuid not null references aulas (id) on delete cascade,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado', 'em_andamento', 'concluido')),
  atualizado_em timestamptz not null default now(),
  unique (mentorado_id, aula_id)
);

-- 8. Progresso nas mídias: ponto em que o aluno parou em cada áudio/vídeo e se já viu até o fim.
--    Permite retomar de onde parou e concluir a aula sozinha entre visitas e aparelhos.
create table progresso_midias (
  mentorado_id uuid not null references usuarios (id) on delete cascade,
  midia_id uuid not null references midias (id) on delete cascade,
  posicao_segundos numeric not null default 0,
  visto boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (mentorado_id, midia_id)
);

-- 9. Exercícios de múltipla escolha (midias.tipo = 'exercicio')
create table questoes (
  id uuid primary key default gen_random_uuid(),
  midia_id uuid not null references midias (id) on delete cascade,
  ordem integer not null default 0,
  enunciado text not null,
  explicacao text, -- opcional, mostrada depois que o aluno responde
  criado_em timestamptz not null default now()
);

create table alternativas (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references questoes (id) on delete cascade,
  ordem integer not null default 0,
  texto text not null
);

-- Gabarito separado: só o mentor dono lê (o aluno responde pela função responder_questao)
create table gabaritos (
  questao_id uuid primary key references questoes (id) on delete cascade,
  alternativa_id uuid not null references alternativas (id) on delete cascade
);

-- Respostas dos alunos: só a 1ª tentativa de cada pergunta
create table respostas (
  mentorado_id uuid not null references usuarios (id) on delete cascade,
  questao_id uuid not null references questoes (id) on delete cascade,
  alternativa_id uuid not null references alternativas (id) on delete cascade,
  correta boolean not null,
  respondido_em timestamptz not null default now(),
  primary key (mentorado_id, questao_id)
);
