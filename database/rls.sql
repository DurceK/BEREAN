-- Regras de segurança (Row Level Security) do BEREAN
-- Rode este arquivo DEPOIS do schema.sql, no SQL Editor do painel do Supabase.

-- Liga a segurança em todas as tabelas
alter table perfis enable row level security;
alter table categorias enable row level security;
alter table modulos enable row level security;
alter table sessoes enable row level security;
alter table matriculas enable row level security;
alter table midias enable row level security;
alter table transcricao_trechos enable row level security;
alter table conteudo_extra enable row level security;
alter table progresso enable row level security;

-- Função auxiliar: verifica se o usuário logado é um mentor.
-- "security definer" evita o problema de a própria checagem gerar um loop de segurança.
create or replace function is_mentor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from perfis where id = auth.uid() and papel = 'mentor'
  );
$$;

-- ===== perfis =====
create policy "ver o proprio perfil ou perfis de mentores"
on perfis for select to authenticated
using (auth.uid() = id or papel = 'mentor');

create policy "criar o proprio perfil"
on perfis for insert to authenticated
with check (auth.uid() = id);

create policy "editar o proprio perfil"
on perfis for update to authenticated
using (auth.uid() = id);

-- ===== matriculas =====
create policy "mentorado ve suas matriculas"
on matriculas for select to authenticated
using (mentorado_id = auth.uid());

create policy "mentor ve matriculas de suas categorias"
on matriculas for select to authenticated
using (
  exists (select 1 from categorias c where c.id = categoria_id and c.mentor_id = auth.uid())
);

create policy "mentor matricula em suas categorias"
on matriculas for insert to authenticated
with check (
  is_mentor() and exists (select 1 from categorias c where c.id = categoria_id and c.mentor_id = auth.uid())
);

create policy "mentor remove matricula de suas categorias"
on matriculas for delete to authenticated
using (
  exists (select 1 from categorias c where c.id = categoria_id and c.mentor_id = auth.uid())
);

-- ===== categorias =====
-- Visível pro mentor dono, ou pro mentorado matriculado nela
create policy "ver categorias"
on categorias for select to authenticated
using (
  mentor_id = auth.uid()
  or exists (select 1 from matriculas mt where mt.categoria_id = categorias.id and mt.mentorado_id = auth.uid())
);

create policy "mentor cria categorias"
on categorias for insert to authenticated
with check (mentor_id = auth.uid() and is_mentor());

create policy "mentor edita suas categorias"
on categorias for update to authenticated
using (mentor_id = auth.uid());

create policy "mentor remove suas categorias"
on categorias for delete to authenticated
using (mentor_id = auth.uid());

-- ===== modulos =====
create policy "ver modulos"
on modulos for select to authenticated
using (
  exists (
    select 1 from categorias c
    where c.id = categoria_id
      and (
        c.mentor_id = auth.uid()
        or exists (select 1 from matriculas mt where mt.categoria_id = c.id and mt.mentorado_id = auth.uid())
      )
  )
);

create policy "mentor cria modulos em suas categorias"
on modulos for insert to authenticated
with check (
  is_mentor() and exists (
    select 1 from categorias c where c.id = categoria_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor edita modulos de suas categorias"
on modulos for update to authenticated
using (
  exists (
    select 1 from categorias c where c.id = categoria_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor remove modulos de suas categorias"
on modulos for delete to authenticated
using (
  exists (
    select 1 from categorias c where c.id = categoria_id and c.mentor_id = auth.uid()
  )
);

-- ===== sessoes =====
create policy "ver sessoes"
on sessoes for select to authenticated
using (
  exists (
    select 1 from modulos m
    join categorias c on c.id = m.categoria_id
    where m.id = modulo_id
      and (
        c.mentor_id = auth.uid()
        or exists (select 1 from matriculas mt where mt.categoria_id = c.id and mt.mentorado_id = auth.uid())
      )
  )
);

create policy "mentor cria sessoes em seus modulos"
on sessoes for insert to authenticated
with check (
  is_mentor() and exists (
    select 1 from modulos m
    join categorias c on c.id = m.categoria_id
    where m.id = modulo_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor edita sessoes de seus modulos"
on sessoes for update to authenticated
using (
  exists (
    select 1 from modulos m
    join categorias c on c.id = m.categoria_id
    where m.id = modulo_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor remove sessoes de seus modulos"
on sessoes for delete to authenticated
using (
  exists (
    select 1 from modulos m
    join categorias c on c.id = m.categoria_id
    where m.id = modulo_id and c.mentor_id = auth.uid()
  )
);

-- ===== midias =====
create policy "ver midias"
on midias for select to authenticated
using (
  exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id
      and (
        c.mentor_id = auth.uid()
        or exists (select 1 from matriculas mt where mt.categoria_id = c.id and mt.mentorado_id = auth.uid())
      )
  )
);

create policy "mentor gerencia midias de suas sessoes (insert)"
on midias for insert to authenticated
with check (
  is_mentor() and exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor gerencia midias de suas sessoes (update)"
on midias for update to authenticated
using (
  exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor gerencia midias de suas sessoes (delete)"
on midias for delete to authenticated
using (
  exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id and c.mentor_id = auth.uid()
  )
);

-- ===== transcricao_trechos =====
create policy "ver transcricao"
on transcricao_trechos for select to authenticated
using (
  exists (
    select 1 from midias md
    join sessoes s on s.id = md.sessao_id
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where md.id = midia_id
      and (
        c.mentor_id = auth.uid()
        or exists (select 1 from matriculas mt where mt.categoria_id = c.id and mt.mentorado_id = auth.uid())
      )
  )
);

create policy "mentor gerencia transcricao de suas midias (insert)"
on transcricao_trechos for insert to authenticated
with check (
  is_mentor() and exists (
    select 1 from midias md
    join sessoes s on s.id = md.sessao_id
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where md.id = midia_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor gerencia transcricao de suas midias (update)"
on transcricao_trechos for update to authenticated
using (
  exists (
    select 1 from midias md
    join sessoes s on s.id = md.sessao_id
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where md.id = midia_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor gerencia transcricao de suas midias (delete)"
on transcricao_trechos for delete to authenticated
using (
  exists (
    select 1 from midias md
    join sessoes s on s.id = md.sessao_id
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where md.id = midia_id and c.mentor_id = auth.uid()
  )
);

-- ===== conteudo_extra =====
create policy "ver conteudo extra"
on conteudo_extra for select to authenticated
using (true);

create policy "mentor gerencia conteudo extra de suas sessoes (insert)"
on conteudo_extra for insert to authenticated
with check (
  is_mentor() and exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor gerencia conteudo extra de suas sessoes (update)"
on conteudo_extra for update to authenticated
using (
  exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id and c.mentor_id = auth.uid()
  )
);

create policy "mentor gerencia conteudo extra de suas sessoes (delete)"
on conteudo_extra for delete to authenticated
using (
  exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id and c.mentor_id = auth.uid()
  )
);

-- ===== progresso =====
create policy "mentorado ve o proprio progresso"
on progresso for select to authenticated
using (mentorado_id = auth.uid());

create policy "mentor ve progresso dos mentorados em seu conteudo"
on progresso for select to authenticated
using (
  exists (
    select 1 from sessoes s
    join modulos m on m.id = s.modulo_id
    join categorias c on c.id = m.categoria_id
    where s.id = sessao_id and c.mentor_id = auth.uid()
  )
);

create policy "mentorado registra o proprio progresso"
on progresso for insert to authenticated
with check (mentorado_id = auth.uid());

create policy "mentorado atualiza o proprio progresso"
on progresso for update to authenticated
using (mentorado_id = auth.uid());
