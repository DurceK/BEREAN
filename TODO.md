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
  - [ ] Apagar aluno (hoje só pelo painel do Supabase: Authentication → Users)
  - [ ] Publicar o painel num endereço na internet (decidido: é a área do mentor do próprio app; falta escolher a hospedagem)

- [x] **Esqueci a senha**: o link na tela de login orienta a pedir ao mentor, que redefine pela tela Alunos (senha provisória + troca obrigatória no próximo acesso). O "recuperar por e-mail" não serve porque o login usa e-mail fictício (`matricula@berean.app`).
  - [ ] Senha esquecida do próprio mentor: hoje só pelo painel do Supabase (Authentication → Users)

- [x] **Tela da aula para o mentorado**: player de áudio (±10s, velocidade), vídeo, foto, texto lido em voz com destaque da palavra, progresso (em andamento ao abrir, concluída pelo botão)
  - [x] Vídeos por link do YouTube no lugar de envio de vídeo (economiza o Storage)
  - [ ] Testar o vídeo do YouTube no app instalado no celular (Expo Go): no navegador já funciona
  - [ ] Transcrição sincronizada para áudio gravado/enviado (a tabela `transcricoes` existe, mas ainda não há como cadastrar os trechos)
  - [ ] Mini-player fixo para continuar ouvindo ao navegar entre telas (do briefing)
  - [x] Continuar de onde parou: posição de cada áudio e vídeo do YouTube e o que já foi visto ficam em `progresso_midias` (vale entre aparelhos); "Continuar aula" abre a última aula vista
  - [ ] Coluna `progresso.posicao_segundos` ficou sem uso (o ponto agora fica por mídia em `progresso_midias`); pode ser removida numa limpeza futura

- [ ] **Versão por cliente (ícone, nome e cores)**
      Hoje ícone e nome ficam fixos no `app.json`, o logo da tela de login em `assets/logo.png` (escudo recortado do ícone) e as cores no `lib/tema.ts`. Para trocar por cliente sem editar à mão a cada vez: trocar o `app.json` por um `app.config.ts` que lê uma pasta por cliente (ex: `clientes/berean-ingles/` com ícone, nome e paleta) e escolhe qual usar na hora de gerar o app.

- [ ] **Migrar os scripts SQL para o Supabase CLI** (migrations versionadas) antes de vender para outras empresas

- [x] **Atualizar pacotes do Expo** (SDK 57: expo 57.0.11 → 57.0.27 e demais pacotes)

- [ ] **Revisar alertas de segurança do npm** (`npm audit` aponta 32, sendo 1 crítico). Avaliar quais afetam o app de verdade antes de rodar `npm audit fix`, que pode quebrar dependências.
