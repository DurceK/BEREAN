-- Bootstrap das primeiras contas do BEREAN (já executado no projeto atual)
-- Rode no SQL Editor do Supabase. Cada pessoa já precisa ter sido criada
-- em Authentication > Users > Add user (o UID abaixo vem de lá).

-- Mentora: Camila Durce (matrícula 0001 -> 0001@berean.app)
insert into usuarios (id, matricula, nome, papel)
values ('7a81c82e-78a6-4024-aa0c-c2fd9f285ac9', '0001', 'Camila Durce', 'mentor');

-- Mentorada (aluna): Cátia Faustino (matrícula 260801 -> 260801@berean.app)
insert into usuarios (id, matricula, nome, papel)
values ('a0a7b9e2-4197-4e6f-89a3-3c7265e5f18b', '260801', 'Cátia Faustino', 'mentorado');


-- ===== Redefinir a senha de um mentor que esqueceu =====
-- Não há tela no app para isso: quem administra o Supabase resolve por aqui.
-- Tire os "-- " das linhas de comando, troque MATRICULA e SENHA_PROVISORIA e rode.
-- O 1º comando troca a senha; o 2º obriga o mentor a criar uma nova no próximo acesso.
-- (Alunos não precisam disso: o mentor redefine pela tela Alunos.)
--
-- update auth.users
-- set encrypted_password = extensions.crypt('SENHA_PROVISORIA', extensions.gen_salt('bf'))
-- where email = 'MATRICULA@berean.app';
--
-- update usuarios set precisa_trocar_senha = true
-- where id = (select id from auth.users where email = 'MATRICULA@berean.app');
