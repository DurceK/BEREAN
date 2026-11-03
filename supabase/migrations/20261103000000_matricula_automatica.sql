-- =====================================================================
-- Matrícula automática para aluno novo: AAMM + sequencial (ex: 261101, 261102...)
-- =====================================================================
-- O app sugere a próxima matrícula ao abrir o cadastro de aluno. O cálculo fica no banco
-- porque só ele enxerga as matrículas de todos os mentores (cada mentor vê só os seus
-- alunos), evitando dois mentores gerarem o mesmo número.
-- O sequencial tem pelo menos 2 dígitos; passando de 99 no mês, cresce (2611100).
-- A coluna matricula já é única: se dois cadastros pegarem o mesmo número ao mesmo tempo,
-- o segundo dá erro e o mentor só precisa abrir o cadastro de novo.

create or replace function proxima_matricula()
returns text language sql security definer stable set search_path = public as $$
  with prefixo as (
    select to_char(now() at time zone 'America/Sao_Paulo', 'YYMM') as aamm
  )
  select prefixo.aamm || lpad(
    (coalesce(max(substr(u.matricula, 5)::int), 0) + 1)::text, 2, '0')
  from prefixo
  left join usuarios u on u.matricula ~ ('^' || prefixo.aamm || '[0-9]{2,}$')
  group by prefixo.aamm;
$$;

-- Só mentores pedem matrícula nova (o aluno não precisa disso)
revoke execute on function proxima_matricula() from public, anon;
grant execute on function proxima_matricula() to authenticated;
