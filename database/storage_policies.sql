-- Políticas de acesso do bucket de Storage "midias"
-- Rode no SQL Editor do Supabase DEPOIS de criar o bucket "midias"
-- (Storage > New bucket > nome "midias", Public bucket DESMARCADO).
--
-- Convenção de pastas dentro do bucket: {mentor_id}/{sessao_id}/{arquivo}
-- Isso permite restringir upload/edição/remoção ao próprio mentor dono do conteúdo.

create policy "ler arquivos de midias"
on storage.objects for select to authenticated
using (bucket_id = 'midias');

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
