-- =====================================================================
-- "Buy Me a Coffee": chave Pix do mentor para apoio voluntário dos alunos
-- =====================================================================
-- O mentor cadastra (ou apaga) a chave Pix dele. Os alunos dele veem um botão
-- "Buy Me a Coffee" que mostra a chave para quem quiser contribuir com qualquer valor.
-- A contribuição é sempre opcional: nada no app depende dela.
-- Use uma chave ALEATÓRIA do banco, para não expor CPF, telefone ou e-mail.
-- Os alunos já conseguem ler o cadastro dos mentores (regra "ver usuarios"), então
-- não é preciso nenhuma regra nova; cada um só edita o próprio cadastro.

alter table usuarios add column chave_pix text
  check (chave_pix is null or length(chave_pix) between 1 and 140);
