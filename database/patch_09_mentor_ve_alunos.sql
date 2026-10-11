-- Patch 09: o mentor passa a ver o cadastro dos alunos inscritos nas categorias dele
-- (antes cada mentorado só era visível para si mesmo, e a tela "Alunos" ficaria vazia).
-- Rode no SQL Editor do Supabase.

create or replace function e_aluno_do_mentor(aluno uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from inscricoes i
    join categorias c on c.id = i.categoria_id
    where i.mentorado_id = aluno and c.mentor_id = auth.uid()
  );
$$;

create policy "mentor ve seus alunos"
on usuarios for select to authenticated
using (e_aluno_do_mentor(id));
