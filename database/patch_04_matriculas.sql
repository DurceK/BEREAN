-- Patch 04: matrícula de mentorados em categorias
-- Antes, qualquer mentorado autenticado via TUDO de TODOS os mentores (simplificação
-- só aceitável enquanto existia um único mentor). Agora, um mentorado só vê o que
-- estiver dentro de uma categoria em que ele foi matriculado.
-- Rode no SQL Editor do Supabase.

create table matriculas (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references perfis (id) on delete cascade,
  categoria_id uuid not null references categorias (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (mentorado_id, categoria_id)
);

alter table matriculas enable row level security;

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

-- Aperta as políticas de leitura: agora exigem matrícula (ou ser o mentor dono)

drop policy "ver categorias" on categorias;
create policy "ver categorias"
on categorias for select to authenticated
using (
  mentor_id = auth.uid()
  or exists (select 1 from matriculas mt where mt.categoria_id = categorias.id and mt.mentorado_id = auth.uid())
);

drop policy "ver modulos" on modulos;
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

drop policy "ver sessoes" on sessoes;
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

drop policy "ver midias" on midias;
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

drop policy "ver transcricao" on transcricao_trechos;
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

-- Matricula a Cátia na categoria "Inglês" da Camila.
-- Se não retornar nenhuma linha afetada, confira se a categoria "Inglês" já existe
-- (criada via a tela "Editar categoria" logada como Camila).
insert into matriculas (mentorado_id, categoria_id)
select 'a0a7b9e2-4197-4e6f-89a3-3c7265e5f18b', id
from categorias
where nome = 'Inglês' and mentor_id = '7a81c82e-78a6-4024-aa0c-c2fd9f285ac9';
