-- Patch 05: guarda a matrícula de login numa coluna própria em perfis
-- Antes, a matrícula só existia "escondida" no e-mail de login (260801@berean.app),
-- na tabela interna auth.users. Esta coluna é uma cópia pra facilitar consultas.
-- O login continua usando o e-mail: quem cadastrar um novo usuário precisa
-- preencher os dois (e-mail no Authentication e matricula aqui).
-- Rode no SQL Editor do Supabase.

alter table perfis add column matricula text;

-- Preenche a partir do e-mail de quem já existe
update perfis p
set matricula = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.id;

alter table perfis alter column matricula set not null;
alter table perfis add constraint perfis_matricula_unica unique (matricula);

-- Conferência
select matricula, nome, papel from perfis order by papel, nome;
