-- =====================================================================
-- MIGRATION INICIAL: o banco completo como estava em 12/10/2026 (patches 01 a 15)
-- =====================================================================
-- Junta, nesta ordem, o que antes ficava em database/schema.sql, database/rls.sql e
-- database/storage_policies.sql. Num projeto novo, `supabase db push` roda tudo de uma vez.
-- No banco da Camila (BEREAN) ela NÃO deve rodar: foi marcada como aplicada com
-- `supabase migration repair --status applied 20261012000000`.


-- ######################## 1. TABELAS ########################

-- Esquema
-- Usuários se inscrevem em categorias, que têm módulos, que têm aulas, que têm mídias.

-- 1. Usuários: uma linha por pessoa que faz login (mentor ou mentorado)
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  matricula text not null unique, -- cópia da matrícula de login (o login usa matricula@dominioLogin do cliente)
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


-- ######################## 2. REGRAS DE SEGURANÇA (RLS) ########################

-- Regras de segurança (Row Level Security)
--
-- Resumo das regras:
--   - Cada usuário edita só o próprio cadastro.
--   - O mentor cria/edita/apaga só o conteúdo das categorias dele.
--   - O mentorado só vê categorias em que está inscrito (e tudo que há dentro delas).
--   - O mentorado registra só o próprio progresso; o mentor vê o progresso no conteúdo dele.

alter table usuarios enable row level security;
alter table categorias enable row level security;
alter table inscricoes enable row level security;
alter table modulos enable row level security;
alter table aulas enable row level security;
alter table midias enable row level security;
alter table progresso enable row level security;
alter table progresso_midias enable row level security;

-- ===== Funções auxiliares =====
-- "security definer" faz a checagem enxergar as tabelas sem cair nas próprias regras
-- de segurança (o que geraria um loop).

create or replace function e_mentor()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from usuarios where id = auth.uid() and papel = 'mentor');
$$;

create or replace function e_dono_da_categoria(categoria uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from categorias where id = categoria and mentor_id = auth.uid());
$$;

create or replace function pode_ver_categoria(categoria uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select e_dono_da_categoria(categoria)
    or exists (
      select 1 from inscricoes where categoria_id = categoria and mentorado_id = auth.uid()
    );
$$;

create or replace function e_aluno_do_mentor(aluno uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from inscricoes i
    join categorias c on c.id = i.categoria_id
    where i.mentorado_id = aluno and c.mentor_id = auth.uid()
  );
$$;

create or replace function categoria_do_modulo(modulo uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select categoria_id from modulos where id = modulo;
$$;

create or replace function categoria_da_aula(aula uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select m.categoria_id from aulas a join modulos m on m.id = a.modulo_id where a.id = aula;
$$;

create or replace function categoria_da_midia(midia uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select categoria_da_aula(aula_id) from midias where id = midia;
$$;

-- ===== usuarios =====
create policy "ver o proprio cadastro ou o de mentores"
on usuarios for select to authenticated
using (auth.uid() = id or papel = 'mentor');

create policy "mentor ve seus alunos"
on usuarios for select to authenticated
using (e_aluno_do_mentor(id));

create policy "criar o proprio cadastro"
on usuarios for insert to authenticated
with check (auth.uid() = id);

create policy "editar o proprio cadastro"
on usuarios for update to authenticated
using (auth.uid() = id);

-- ===== categorias =====
create policy "ver categorias"
on categorias for select to authenticated
using (pode_ver_categoria(id));

create policy "mentor cria categorias"
on categorias for insert to authenticated
with check (mentor_id = auth.uid() and e_mentor());

create policy "mentor edita suas categorias"
on categorias for update to authenticated
using (mentor_id = auth.uid());

create policy "mentor apaga suas categorias"
on categorias for delete to authenticated
using (mentor_id = auth.uid());

-- ===== inscricoes =====
create policy "mentorado ve suas inscricoes"
on inscricoes for select to authenticated
using (mentorado_id = auth.uid());

create policy "mentor ve inscricoes de suas categorias"
on inscricoes for select to authenticated
using (e_dono_da_categoria(categoria_id));

create policy "mentor inscreve em suas categorias"
on inscricoes for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_id));

create policy "mentor remove inscricoes de suas categorias"
on inscricoes for delete to authenticated
using (e_dono_da_categoria(categoria_id));

-- ===== modulos =====
create policy "ver modulos"
on modulos for select to authenticated
using (pode_ver_categoria(categoria_id));

create policy "mentor cria modulos"
on modulos for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_id));

create policy "mentor edita modulos"
on modulos for update to authenticated
using (e_dono_da_categoria(categoria_id));

create policy "mentor apaga modulos"
on modulos for delete to authenticated
using (e_dono_da_categoria(categoria_id));

-- ===== aulas =====
create policy "ver aulas"
on aulas for select to authenticated
using (pode_ver_categoria(categoria_do_modulo(modulo_id)));

create policy "mentor cria aulas"
on aulas for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_do_modulo(modulo_id)));

create policy "mentor edita aulas"
on aulas for update to authenticated
using (e_dono_da_categoria(categoria_do_modulo(modulo_id)));

create policy "mentor apaga aulas"
on aulas for delete to authenticated
using (e_dono_da_categoria(categoria_do_modulo(modulo_id)));

-- ===== midias =====
create policy "ver midias"
on midias for select to authenticated
using (pode_ver_categoria(categoria_da_aula(aula_id)));

create policy "mentor cria midias"
on midias for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_da_aula(aula_id)));

create policy "mentor edita midias"
on midias for update to authenticated
using (e_dono_da_categoria(categoria_da_aula(aula_id)));

create policy "mentor apaga midias"
on midias for delete to authenticated
using (e_dono_da_categoria(categoria_da_aula(aula_id)));

-- ===== progresso =====
create policy "mentorado ve o proprio progresso"
on progresso for select to authenticated
using (mentorado_id = auth.uid());

create policy "mentor ve o progresso no seu conteudo"
on progresso for select to authenticated
using (e_dono_da_categoria(categoria_da_aula(aula_id)));

create policy "mentorado registra o proprio progresso"
on progresso for insert to authenticated
with check (mentorado_id = auth.uid());

create policy "mentorado atualiza o proprio progresso"
on progresso for update to authenticated
using (mentorado_id = auth.uid());

-- ===== progresso_midias =====
create policy "mentorado ve o proprio progresso nas midias"
on progresso_midias for select to authenticated
using (mentorado_id = auth.uid());

create policy "mentor ve o progresso nas midias do seu conteudo"
on progresso_midias for select to authenticated
using (e_dono_da_categoria(categoria_da_midia(midia_id)));

create policy "mentorado registra o proprio progresso nas midias"
on progresso_midias for insert to authenticated
with check (mentorado_id = auth.uid() and pode_ver_categoria(categoria_da_midia(midia_id)));

create policy "mentorado atualiza o proprio progresso nas midias"
on progresso_midias for update to authenticated
using (mentorado_id = auth.uid());

-- ===== Exercícios: questoes, alternativas, gabaritos, respostas =====
create or replace function categoria_da_questao(questao uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select categoria_da_midia(midia_id) from questoes where id = questao;
$$;

alter table questoes enable row level security;
alter table alternativas enable row level security;
alter table gabaritos enable row level security;
alter table respostas enable row level security;

create policy "ver questoes" on questoes for select to authenticated
using (pode_ver_categoria(categoria_da_midia(midia_id)));
create policy "mentor cria questoes" on questoes for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_da_midia(midia_id)));
create policy "mentor edita questoes" on questoes for update to authenticated
using (e_dono_da_categoria(categoria_da_midia(midia_id)));
create policy "mentor apaga questoes" on questoes for delete to authenticated
using (e_dono_da_categoria(categoria_da_midia(midia_id)));

create policy "ver alternativas" on alternativas for select to authenticated
using (pode_ver_categoria(categoria_da_questao(questao_id)));
create policy "mentor cria alternativas" on alternativas for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor edita alternativas" on alternativas for update to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor apaga alternativas" on alternativas for delete to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));

-- Gabarito: só o mentor dono (o aluno nunca lê)
create policy "mentor ve gabarito" on gabaritos for select to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor cria gabarito" on gabaritos for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor edita gabarito" on gabaritos for update to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor apaga gabarito" on gabaritos for delete to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));

-- Respostas: o aluno lê as próprias, o mentor lê as do seu conteúdo.
-- Ninguém grava direto: só pela função responder_questao.
create policy "mentorado ve suas respostas" on respostas for select to authenticated
using (mentorado_id = auth.uid());
create policy "mentor ve respostas do seu conteudo" on respostas for select to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));

create or replace function responder_questao(questao uuid, alternativa uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  certa uuid;
  texto_explicacao text;
begin
  if not pode_ver_categoria(categoria_da_questao(questao)) then
    raise exception 'sem acesso a esta questão';
  end if;
  if not exists (select 1 from alternativas where id = alternativa and questao_id = questao) then
    raise exception 'alternativa não pertence à questão';
  end if;

  select g.alternativa_id into certa from gabaritos g where g.questao_id = questao;
  select q.explicacao into texto_explicacao from questoes q where q.id = questao;

  -- grava só a primeira tentativa de cada aluno
  insert into respostas (mentorado_id, questao_id, alternativa_id, correta)
  values (auth.uid(), questao, alternativa, alternativa = certa)
  on conflict (mentorado_id, questao_id) do nothing;

  return json_build_object(
    'correta', alternativa = certa,
    'alternativa_correta', certa,
    'explicacao', texto_explicacao
  );
end;
$$;

revoke execute on function responder_questao(uuid, uuid) from public, anon;
grant execute on function responder_questao(uuid, uuid) to authenticated;


-- ######################## 3. ARQUIVOS (STORAGE) ########################

-- Bucket "midias" (arquivos das aulas) e suas políticas de acesso
-- (usa as funções pode_ver_categoria e categoria_da_aula, criadas acima).
--
-- Convenção de pastas dentro do bucket: {mentor_id}/{aula_id}/{arquivo}
-- O 1º pedaço restringe upload/edição/remoção ao mentor dono; o 2º restringe a leitura
-- a quem pode ver a categoria da aula.

-- Bucket privado; limites para economizar o plano gratuito: até 30 MB, só imagem e áudio
-- (vídeo vai pelo YouTube)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midias', 'midias', false, 31457280, array['image/jpeg', 'image/png', 'image/webp', 'audio/*'])
on conflict (id) do nothing;

create policy "ler arquivos das aulas que pode ver"
on storage.objects for select to authenticated
using (
  bucket_id = 'midias'
  and public.pode_ver_categoria(public.categoria_da_aula(((storage.foldername(name))[2])::uuid))
);

create policy "mentor envia arquivos em sua propria pasta"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'midias'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "mentor atualiza arquivos em sua propria pasta"
on storage.objects for update to authenticated
using (
  bucket_id = 'midias'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "mentor remove arquivos em sua propria pasta"
on storage.objects for delete to authenticated
using (
  bucket_id = 'midias'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ===== Bucket "avatares" (fotos de perfil) =====
-- Criado por SQL; pasta {usuario_id}/arquivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 1048576,array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Vê: a própria pessoa, qualquer mentor, e todos veem a foto dos mentores
create policy "ver avatares"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatares'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.e_mentor()
    or exists (
      select 1 from public.usuarios u
      where u.id::text = (storage.foldername(name))[1] and u.papel = 'mentor'
    )
  )
);

create policy "enviar o proprio avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "trocar o proprio avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "apagar o proprio avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
