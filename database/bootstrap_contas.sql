-- Bootstrap das primeiras contas do BEREAN (já executado no projeto atual)
-- Rode no SQL Editor do Supabase. Cada pessoa já precisa ter sido criada
-- em Authentication > Users > Add user (o UID abaixo vem de lá).

-- Mentora: Camila Durce (matrícula 0001 -> 0001@berean.app)
insert into usuarios (id, matricula, nome, papel)
values ('7a81c82e-78a6-4024-aa0c-c2fd9f285ac9', '0001', 'Camila Durce', 'mentor');

-- Mentorada (aluna): Cátia Faustino (matrícula 260801 -> 260801@berean.app)
insert into usuarios (id, matricula, nome, papel)
values ('a0a7b9e2-4197-4e6f-89a3-3c7265e5f18b', '260801', 'Cátia Faustino', 'mentorado');
