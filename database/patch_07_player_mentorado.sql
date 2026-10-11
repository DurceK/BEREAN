-- Patch 07: preparação para o player do mentorado
-- Rode no SQL Editor do Supabase.

-- 1. Idioma da voz nos textos lidos em voz alta (audio_texto).
--    Sem isso o celular lê inglês com voz de português. Textos antigos sem idioma
--    são lidos em português.
alter table midias add column idioma text check (idioma in ('pt-BR', 'en-US'));

-- 2. Arquivos de mídia: só lê quem pode ver a categoria da aula (dono ou inscrito).
--    Antes, qualquer usuário logado lia qualquer arquivo do bucket.
--    Os arquivos ficam em {mentor_id}/{aula_id}/{arquivo}; o 2º pedaço é a aula.
drop policy if exists "ler arquivos de midias" on storage.objects;

create policy "ler arquivos das aulas que pode ver"
on storage.objects for select to authenticated
using (
  bucket_id = 'midias'
  and public.pode_ver_categoria(public.categoria_da_aula(((storage.foldername(name))[2])::uuid))
);
