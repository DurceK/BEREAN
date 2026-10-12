# TODO — BEREAN

## Pendências

- [ ] **Painel de administração online para o mentor (pelo PC)**
  A Camila acessa pelo navegador do computador para montar e manter o curso. Deve permitir:
  - [x] Criar, renomear e apagar categorias, módulos e aulas direto na tela inicial do mentor, em árvore que abre e fecha (apagar também remove os arquivos do Storage)
  - [x] Pré-visualização da aula como o aluno vê, sem registrar progresso
  - [x] Adicionar, reordenar e remover mídias de uma aula
  - [x] Cadastrar mentorados e inscrevê-los em categorias (Edge Function `admin-usuarios`)
  - [x] Redefinir senha de mentorado
  - [x] Foto de perfil e cabeçalho de perfil nas telas iniciais
  - [x] Ficha do aluno: progresso geral e por categoria, situação e data de cada aula, última atividade
  - [x] Apagar aluno: decidido não ter no app por segurança, por enquanto; continua só pelo painel do Supabase (Authentication → Users)
  - [ ] Publicar o painel num endereço na internet (decidido: é a área do mentor do próprio app; falta escolher a hospedagem)

- [x] **Esqueci a senha**: o link na tela de login orienta a pedir ao mentor, que redefine pela tela Alunos (senha provisória + troca obrigatória no próximo acesso). O "recuperar por e-mail" não serve porque o login usa e-mail fictício (`matricula@berean.app`).
  - [x] Senha esquecida do próprio mentor: decidido resolver direto no banco (quem administra o Supabase redefine); não terá tela no app

- [x] **Tela da aula para o mentorado**: player de áudio (±10s, velocidade), vídeo, foto, texto lido em voz com destaque da palavra, progresso (em andamento ao abrir, concluída pelo botão)
  - [x] Vídeos por link do YouTube no lugar de envio de vídeo (economiza o Storage)
  - [x] Fotos reduzidas e comprimidas antes de enviar (aula ≤1280 px, perfil 256 px) e limite de 30 MB por áudio, reforçado no bucket (patch 14)
  - [x] Exercícios de múltipla escolha: perguntas com 2 a 6 alternativas e explicação, correção na hora pelo servidor (gabarito escondido do aluno), pode refazer, ficha mostra a 1ª tentativa
  - [x] Continuar de onde parou: posição de cada áudio e vídeo do YouTube e o que já foi visto ficam em `progresso_midias` (vale entre aparelhos); "Continuar aula" abre a última aula vista
  - [x] Limpeza do banco: removidas a tabela `transcricoes` e a coluna `progresso.posicao_segundos`, que ficaram sem uso (patch 15)

- [ ] **Nome do software (by DurceK)**: definir quando houver contrato formal (BEREAN é a marca da Camila, a 1ª cliente)
  - Direção: um acrônimo baseado na função do produto
  - Descartados: "Parakletos" (já pedido no INPI na classe 41, educação) e "Mentora" (parecido com Mentorh)
  - [ ] Checar o nome escolhido no INPI (classes 9, 41 e 42) e ver se o domínio está livre
  - [x] O "berean" que sobrou por dentro do código não atrapalha: o domínio de login virou configuração por cliente (`dominioLogin`), e cada app tem o próprio armazenamento no celular

- [x] **Versão por cliente (ícone, nome e cores)**: pasta `clientes/<cliente>/` com `cliente.json`, imagens e `.env`; trocar com `npm run cliente -- <pasta>` (passo a passo em `clientes/LEIAME.md`)
  - [ ] Fontes por cliente (hoje Cinzel e Montserrat valem para todos)

- [x] **Banco em migrations do Supabase CLI**: `supabase/migrations/` (a inicial junta os patches 01 a 15); mudança nova = arquivo novo + `npx.cmd supabase db push`
  - [x] Marcar a migration inicial como aplicada no banco da Camila (`migration repair`)
  - [ ] Testar a migration inicial num projeto Supabase vazio de teste

- [x] **Atualizar pacotes do Expo** (SDK 57: expo 57.0.11 → 57.0.27 e demais pacotes)

- [ ] **Revisar alertas de segurança do npm** (`npm audit` aponta 32, sendo 1 crítico). Avaliar quais afetam o app de verdade antes de rodar `npm audit fix`, que pode quebrar dependências.
