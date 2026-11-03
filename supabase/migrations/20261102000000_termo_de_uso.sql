-- =====================================================================
-- Termo de uso e privacidade (LGPD): aceite no primeiro acesso do aluno
-- =====================================================================
-- O aluno só entra nas aulas depois de aceitar a versão atual do termo.
-- Aluno menor de idade: quem aceita é o pai, a mãe ou o responsável legal (LGPD art. 14),
-- informando o nome. Cada aceite fica registrado (quem, quando, qual versão) como prova.

-- Marcado pelo mentor no cadastro (ou depois, na lista de alunos)
alter table usuarios add column menor_de_idade boolean not null default false;

-- O próprio aluno não pode desmarcar "menor de idade" para fugir do aceite do responsável:
-- só o mentor muda, pela função definir_menor_de_idade.
create or replace function proteger_menor_de_idade()
returns trigger language plpgsql as $$
begin
  if new.menor_de_idade is distinct from old.menor_de_idade
     and current_user in ('authenticated', 'anon') then
    raise exception 'só o mentor pode mudar a marcação de menor de idade';
  end if;
  return new;
end;
$$;

create trigger proteger_menor_de_idade
before update on usuarios
for each row execute function proteger_menor_de_idade();

create or replace function definir_menor_de_idade(aluno uuid, menor boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (e_mentor() and e_aluno_do_mentor(aluno)) then
    raise exception 'só o mentor do aluno pode mudar esta marcação';
  end if;
  update usuarios set menor_de_idade = menor where id = aluno;
end;
$$;

revoke execute on function definir_menor_de_idade(uuid, boolean) from public, anon;
grant execute on function definir_menor_de_idade(uuid, boolean) to authenticated;

-- Um aceite por pessoa e por versão do termo. Não pode ser alterado nem apagado pelo app.
create table aceites_termo (
  usuario_id uuid not null references usuarios (id) on delete cascade,
  versao text not null,
  aceito_em timestamptz not null default now(),
  aceito_por_responsavel boolean not null default false,
  nome_responsavel text, -- obrigatório quando quem aceita é o responsável
  primary key (usuario_id, versao),
  check (not aceito_por_responsavel or length(btrim(coalesce(nome_responsavel, ''))) > 0)
);

alter table aceites_termo enable row level security;

create policy "cada um ve os proprios aceites"
on aceites_termo for select to authenticated
using (usuario_id = auth.uid());

create policy "mentor ve os aceites dos seus alunos"
on aceites_termo for select to authenticated
using (e_aluno_do_mentor(usuario_id));

-- Menor de idade só registra o aceite como "do responsável", com o nome dele
create policy "cada um registra o proprio aceite"
on aceites_termo for insert to authenticated
with check (
  usuario_id = auth.uid()
  and (
    aceito_por_responsavel
    or not (select u.menor_de_idade from usuarios u where u.id = auth.uid())
  )
);
