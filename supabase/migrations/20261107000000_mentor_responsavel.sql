-- =====================================================================
-- Mentor responsável pelo aluno
-- =====================================================================
-- Até aqui o aluno só "era" de um mentor pela inscrição em algum curso dele. Sem nenhum
-- curso, o aluno sumia da lista e o mentor não conseguia revincular nem excluir.
-- Agora o cadastro guarda o mentor responsável (quem cadastrou). O mentor vê os alunos
-- dos seus cursos E os de que é responsável, mesmo sem curso. Um mentor nunca vê o
-- aluno sem curso de outro mentor.

alter table usuarios add column mentor_responsavel uuid references usuarios (id) on delete set null;

-- Alunos que já existem: o responsável é o mentor do curso em que entraram primeiro
update usuarios u
set mentor_responsavel = (
  select c.mentor_id
  from inscricoes i
  join categorias c on c.id = i.categoria_id
  where i.mentorado_id = u.id
  order by i.criado_em
  limit 1
)
where u.papel = 'mentorado';

-- O próprio aluno não pode trocar o mentor responsável (só o servidor, pela função de usuários)
create or replace function proteger_mentor_responsavel()
returns trigger language plpgsql as $$
begin
  if new.mentor_responsavel is distinct from old.mentor_responsavel
     and current_user in ('authenticated', 'anon') then
    raise exception 'o mentor responsável não pode ser alterado pelo app';
  end if;
  return new;
end;
$$;

create trigger proteger_mentor_responsavel
before update on usuarios
for each row execute function proteger_mentor_responsavel();

-- "É aluno deste mentor": inscrito num curso dele OU sob a responsabilidade dele
create or replace function e_aluno_do_mentor(aluno uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from inscricoes i
    join categorias c on c.id = i.categoria_id
    where i.mentorado_id = aluno and c.mentor_id = auth.uid()
  ) or exists (
    select 1 from usuarios u
    where u.id = aluno and u.papel = 'mentorado' and u.mentor_responsavel = auth.uid()
  );
$$;
