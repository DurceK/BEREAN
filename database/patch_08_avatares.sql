-- Patch 08: foto de perfil (avatar)
-- Rode no SQL Editor do Supabase.
-- A foto fica no bucket privado "avatares", na pasta {usuario_id}/, e o caminho
-- dela vai na coluna usuarios.avatar_url (que já existia, sem uso).

-- 1. Bucket privado, só imagens, até 5 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 2. Quem vê: a própria pessoa, qualquer mentor, e todos veem a foto dos mentores
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

-- 3. Cada pessoa envia, troca e apaga só a própria foto
create policy "enviar o proprio avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "trocar o proprio avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "apagar o proprio avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
