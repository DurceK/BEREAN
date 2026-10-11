-- Políticas de acesso do bucket de Storage "midias"
-- Rode no SQL Editor do Supabase DEPOIS de criar o bucket "midias"
-- (Storage > New bucket > nome "midias", Public bucket DESMARCADO) e DEPOIS do rls.sql
-- (usa as funções pode_ver_categoria e categoria_da_aula).
--
-- Convenção de pastas dentro do bucket: {mentor_id}/{aula_id}/{arquivo}
-- O 1º pedaço restringe upload/edição/remoção ao mentor dono; o 2º restringe a leitura
-- a quem pode ver a categoria da aula.

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
