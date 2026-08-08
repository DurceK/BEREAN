-- Patch 01: torna origem_audio opcional em sessoes
-- Motivo: a tela "Editar categoria" cria a sessão só com o título; a origem do áudio
-- (gravação/upload/texto) é escolhida depois, numa tela futura de adicionar conteúdo.
--
-- Rode este arquivo no SQL Editor do Supabase (você já rodou o schema.sql original,
-- que exigia esse campo — este patch corrige isso no banco que já existe).

alter table sessoes alter column origem_audio drop not null;
