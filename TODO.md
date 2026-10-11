# TODO — BEREAN

## Pendências

- [ ] **Painel de administração online para o mentor (pelo PC)**
  A Camila acessa pelo navegador do computador para montar e manter o curso. Deve permitir:
  - [x] Editar e apagar categorias, módulos e aulas (apagar também remove os arquivos do Storage)
  - [x] Adicionar, reordenar e remover mídias de uma aula
  - [ ] Cadastrar mentorados e inscrevê-los em categorias (precisa de Edge Function)
  - [ ] Redefinir senha de mentorado (ver "Esqueci a senha")
  - [ ] Publicar o painel num endereço na internet (decidido: é a área do mentor do próprio app; falta escolher a hospedagem)

- [ ] **Esqueci a senha**
      O login usa matrícula convertida em e-mail fictício (`matricula@berean.app`), então o "recuperar senha por e-mail" padrão do Supabase não chega em ninguém.
      Caminho provável: o **mentor redefine a senha do mentorado** pelo app (gera senha provisória + marca `precisa_trocar_senha = true`). Isso exige a chave de administrador do Supabase, que nunca pode ficar no app — precisa de uma **Edge Function** no Supabase fazendo essa operação no servidor.

- [x] **Tela da aula para o mentorado**: player de áudio (±10s, velocidade), vídeo, foto, texto lido em voz com destaque da palavra, progresso (em andamento ao abrir, concluída pelo botão)
  - [ ] Transcrição sincronizada para áudio gravado/enviado (a tabela `transcricoes` existe, mas ainda não há como cadastrar os trechos)
  - [ ] Mini-player fixo para continuar ouvindo ao navegar entre telas (do briefing)
  - [ ] Guardar a posição do áudio pra "continuar de onde parou" (coluna `progresso.posicao_segundos` existe, ainda não é usada)

- [ ] **Versão por cliente (ícone, nome e cores)**
      Hoje ícone e nome ficam fixos no `app.json` e as cores no `lib/tema.ts`. Para trocar por cliente sem editar à mão a cada vez: trocar o `app.json` por um `app.config.ts` que lê uma pasta por cliente (ex: `clientes/berean-ingles/` com ícone, nome e paleta) e escolhe qual usar na hora de gerar o app.

- [ ] **Migrar os scripts SQL para o Supabase CLI** (migrations versionadas) antes de vender para outras empresas

- [x] **Atualizar pacotes do Expo** (SDK 57: expo 57.0.11 → 57.0.27 e demais pacotes)

- [ ] **Revisar alertas de segurança do npm** (`npm audit` aponta 32, sendo 1 crítico). Avaliar quais afetam o app de verdade antes de rodar `npm audit fix`, que pode quebrar dependências.
