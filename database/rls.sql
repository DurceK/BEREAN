-- Regras de segurança (Row Level Security) do BEREAN
-- Rode este arquivo DEPOIS do schema.sql, no SQL Editor do painel do Supabase.
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
