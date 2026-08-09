-- Patch 03: substitui "um áudio por sessão" por uma lista ordenada de mídias
-- (áudio, foto ou vídeo), permitindo múltiplos itens por sessão em qualquer ordem.
-- Rode no SQL Editor do Supabase.

-- 1. Remove as colunas antigas de áudio em sessoes (ficam obsoletas)
alter table sessoes drop column if exists origem_audio;
alter table sessoes drop column if exists audio_url;
alter table sessoes drop column if exists texto_origem;
alter table sessoes drop column if exists duracao_segundos;

-- 2. Tabela midias: cada linha é um item de conteúdo (áudio/foto/vídeo) de uma sessão
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

alter table midias enable row level security;

create policy "ver midias"
on midias for select to authenticated
using (true);

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

-- 3. transcricao_trechos passa a pertencer a uma mídia específica (um áudio),
--    não à sessão inteira, já que agora pode haver mais de um áudio por sessão.
drop policy if exists "ver transcricao" on transcricao_trechos;
drop policy if exists "mentor gerencia transcricao de suas sessoes (insert)" on transcricao_trechos;
drop policy if exists "mentor gerencia transcricao de suas sessoes (update)" on transcricao_trechos;
drop policy if exists "mentor gerencia transcricao de suas sessoes (delete)" on transcricao_trechos;

alter table transcricao_trechos drop column sessao_id;
alter table transcricao_trechos add column midia_id uuid not null references midias (id) on delete cascade;

create policy "ver transcricao"
on transcricao_trechos for select to authenticated
using (true);

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
