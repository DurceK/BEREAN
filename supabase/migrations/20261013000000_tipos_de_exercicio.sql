-- =====================================================================
-- Novos tipos de pergunta nos exercícios (além da múltipla escolha)
-- =====================================================================
--   digitar  -> o aluno digita a resposta (copiar, completar, traduzir)
--   ordenar  -> o aluno toca nas palavras embaralhadas na ordem certa
--   ligar    -> o aluno liga cada item da esquerda ao seu par da direita
--   livre    -> o aluno escreve um texto; sem correção automática, o mentor lê na ficha
-- O gabarito de todos os tipos fica em tabelas que só o mentor dono lê. O aluno responde
-- pela função responder_exercicio, que confere no servidor e grava a 1ª tentativa.

alter table questoes add column tipo text not null default 'multipla_escolha'
  check (tipo in ('multipla_escolha', 'digitar', 'ordenar', 'ligar', 'livre'));

-- Nas perguntas de ligar, cada alternativa é um item da coluna da esquerda ou da direita.
-- Nas de ordenar, as alternativas são as palavras, já guardadas embaralhadas.
alter table alternativas add column lado text check (lado in ('esquerda', 'direita'));

-- Respostas aceitas (digitar e ordenar). A de menor ordem é a mostrada ao aluno depois.
create table respostas_aceitas (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references questoes (id) on delete cascade,
  ordem integer not null default 0,
  texto text not null
);
create index respostas_aceitas_questao on respostas_aceitas (questao_id);

-- Pares certos (ligar): cada item da esquerda e o item da direita que combina com ele
create table pares_corretos (
  esquerda_id uuid primary key references alternativas (id) on delete cascade,
  direita_id uuid not null references alternativas (id) on delete cascade,
  questao_id uuid not null references questoes (id) on delete cascade
);
create index pares_corretos_questao on pares_corretos (questao_id);

-- Respostas: só a múltipla escolha aponta para uma alternativa; a resposta livre não tem
-- certo/errado; o texto digitado fica guardado para o mentor ver.
alter table respostas alter column alternativa_id drop not null;
alter table respostas alter column correta drop not null;
alter table respostas add column texto text;

alter table respostas_aceitas enable row level security;
alter table pares_corretos enable row level security;

-- Só o mentor dono lê e edita (o aluno nunca lê)
create policy "mentor ve respostas aceitas" on respostas_aceitas for select to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor cria respostas aceitas" on respostas_aceitas for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor edita respostas aceitas" on respostas_aceitas for update to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor apaga respostas aceitas" on respostas_aceitas for delete to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));

create policy "mentor ve pares corretos" on pares_corretos for select to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor cria pares corretos" on pares_corretos for insert to authenticated
with check (e_mentor() and e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor edita pares corretos" on pares_corretos for update to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));
create policy "mentor apaga pares corretos" on pares_corretos for delete to authenticated
using (e_dono_da_categoria(categoria_da_questao(questao_id)));

-- Compara respostas digitadas sem ligar para maiúsculas, pontuação e espaços a mais.
-- Apóstrofo curvo vira reto; hífen vira espaço ("check-in" = "check in"). Acentos contam.
-- (O app tem uma cópia desta regra em lib/exercicios.ts, usada na pré-visualização.)
create or replace function normalizar_resposta(t text)
returns text language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(coalesce(t, '')), '[’‘`´]', '''', 'g'),
      '[.,!?;:"“”¡¿…()/-]+', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

create or replace function responder_exercicio(
  questao uuid,
  alternativa uuid default null,
  resposta text default null,
  pares jsonb default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_tipo text;
  v_explicacao text;
  v_correta boolean;
  v_certa uuid;
  v_aceita text;
  v_pares json;
  v_total integer;
  v_acertos integer;
begin
  if not pode_ver_categoria(categoria_da_questao(questao)) then
    raise exception 'sem acesso a esta questão';
  end if;
  select q.tipo, q.explicacao into v_tipo, v_explicacao from questoes q where q.id = questao;

  if v_tipo = 'multipla_escolha' then
    if alternativa is null
       or not exists (select 1 from alternativas a where a.id = alternativa and a.questao_id = questao) then
      raise exception 'alternativa não pertence à questão';
    end if;
    select g.alternativa_id into v_certa from gabaritos g where g.questao_id = questao;
    v_correta := alternativa = v_certa;

  elsif v_tipo in ('digitar', 'ordenar') then
    v_correta := exists (
      select 1 from respostas_aceitas r
      where r.questao_id = questao
        and normalizar_resposta(r.texto) = normalizar_resposta(resposta)
    );
    select r.texto into v_aceita from respostas_aceitas r
    where r.questao_id = questao order by r.ordem limit 1;

  elsif v_tipo = 'ligar' then
    select count(*) into v_total from pares_corretos pc where pc.questao_id = questao;
    select count(*) into v_acertos
    from jsonb_array_elements(coalesce(pares, '[]'::jsonb)) e
    join pares_corretos pc
      on pc.questao_id = questao
     and pc.esquerda_id::text = e ->> 'esquerda'
     and pc.direita_id::text = e ->> 'direita';
    v_correta := v_total > 0 and v_acertos = v_total
      and jsonb_array_length(coalesce(pares, '[]'::jsonb)) = v_total;
    select json_agg(json_build_object('esquerda', pc.esquerda_id, 'direita', pc.direita_id))
    into v_pares from pares_corretos pc where pc.questao_id = questao;

  else
    v_correta := null; -- resposta livre: o mentor lê na ficha do aluno
  end if;

  -- grava só a primeira tentativa de cada aluno
  insert into respostas (mentorado_id, questao_id, alternativa_id, correta, texto)
  values (
    auth.uid(),
    questao,
    case when v_tipo = 'multipla_escolha' then alternativa end,
    v_correta,
    case when v_tipo in ('digitar', 'ordenar', 'livre') then left(resposta, 2000) end
  )
  on conflict (mentorado_id, questao_id) do nothing;

  return json_build_object(
    'correta', v_correta,
    'alternativa_correta', v_certa,
    'resposta_certa', v_aceita,
    'pares_corretos', v_pares,
    'explicacao', v_explicacao
  );
end;
$$;

revoke execute on function responder_exercicio(uuid, uuid, text, jsonb) from public, anon;
grant execute on function responder_exercicio(uuid, uuid, text, jsonb) to authenticated;
