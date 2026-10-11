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

-- ===== Bucket "avatares" (fotos de perfil) =====
-- Criado por SQL; pasta {usuario_id}/arquivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
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
