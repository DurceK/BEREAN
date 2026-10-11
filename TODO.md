# TODO — BEREAN

## Pendências

- [ ] **Esqueci a senha**
      O login usa matrícula convertida em e-mail fictício (`matricula@berean.app`), então o "recuperar senha por e-mail" padrão do Supabase não chega em ninguém.
      Caminho provável: o **mentor redefine a senha do mentorado** pelo app (gera senha provisória + marca `precisa_trocar_senha = true`). Isso exige a chave de administrador do Supabase, que nunca pode ficar no app — precisa de uma **Edge Function** no Supabase fazendo essa operação no servidor.

- [ ] **Tela do mentor para cadastrar novos mentorados** (hoje é feito manualmente no painel do Supabase + SQL)

- [ ] **Player de áudio/visualização de mídias para o mentorado** (hoje a tela só lista categorias/módulos/aulas)

- [ ] **Reordenar e remover mídias** de uma aula

- [ ] **Versão por cliente (ícone, nome e cores)**
      Hoje ícone e nome ficam fixos no `app.json` e as cores no `lib/tema.ts`. Para trocar por cliente sem editar à mão a cada vez: trocar o `app.json` por um `app.config.ts` que lê uma pasta por cliente (ex: `clientes/berean-ingles/` com ícone, nome e paleta) e escolhe qual usar na hora de gerar o app.

- [ ] **Migrar os scripts SQL para o Supabase CLI** (migrations versionadas) antes de vender para outras empresas

- [x] **Atualizar pacotes do Expo** (SDK 57: expo 57.0.11 → 57.0.27 e demais pacotes)

- [ ] **Revisar alertas de segurança do npm** (`npm audit` aponta 32, sendo 1 crítico). Avaliar quais afetam o app de verdade antes de rodar `npm audit fix`, que pode quebrar dependências.
