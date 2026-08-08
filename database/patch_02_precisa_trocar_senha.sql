-- Patch 02: obriga troca de senha no primeiro login de quem recebeu senha genérica
-- Rode no SQL Editor do Supabase.

alter table perfis add column precisa_trocar_senha boolean not null default false;

-- Cátia recebeu uma senha genérica da Camila; marcar para trocar no primeiro login.
update perfis set precisa_trocar_senha = true
where id = 'a0a7b9e2-4197-4e6f-89a3-3c7265e5f18b';
