-- Patch 06: nomes de tabelas mais simples
--   perfis              -> usuarios
--   matriculas          -> inscricoes   (pra não confundir com a matrícula de login)
--   sessoes             -> aulas        (e a coluna sessao_id vira aula_id)
--   transcricao_trechos -> transcricoes
--   conteudo_extra      -> apagada (não era usada)
-- Os dados são preservados: só os nomes mudam.
--
-- COMO RODAR (no SQL Editor do Supabase):
--   1. Este arquivo.
--   2. Logo em seguida, o rls.sql inteiro (recria as regras de segurança com os nomes novos).
--   Entre um e outro o app fica sem acesso aos dados (as regras foram apagadas e as tabelas
--   estão trancadas), então rode os dois na sequência.

begin;

-- O patch 05 (coluna matricula em perfis) precisa ter sido rodado antes
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfis' and column_name = 'matricula'
  ) then
    raise exception 'Rode o patch_05_matricula_em_perfis.sql antes deste.';
  end if;
end $$;

-- Apaga todas as regras de segurança antigas (o rls.sql recria com os nomes novos)
do $$
declare
  regra record;
begin
  for regra in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', regra.policyname, regra.tablename);
  end loop;
end $$;

drop function if exists is_mentor();

drop table if exists conteudo_extra;

alter table perfis rename to usuarios;
alter table matriculas rename to inscricoes;
alter table sessoes rename to aulas;
alter table transcricao_trechos rename to transcricoes;

alter table midias rename column sessao_id to aula_id;
alter table progresso rename column sessao_id to aula_id;

commit;
