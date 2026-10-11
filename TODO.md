# TODO — BEREAN

## Pendências

- [ ] **Esqueci a senha**
  O login usa matrícula convertida em e-mail fictício (`matricula@berean.app`), então o "recuperar senha por e-mail" padrão do Supabase não chega em ninguém.
  Caminho provável: o **mentor redefine a senha do mentorado** pelo app (gera senha provisória + marca `precisa_trocar_senha = true`). Isso exige a chave de administrador do Supabase, que nunca pode ficar no app — precisa de uma **Edge Function** no Supabase fazendo essa operação no servidor.

- [ ] **Tela do mentor para matricular alunos** (hoje é feito via SQL)

- [ ] **Tela do mentor para cadastrar novos mentorados** (hoje é feito manualmente no painel do Supabase + SQL)

- [ ] **Player de áudio/visualização de mídias para o mentorado** (hoje a tela só lista categorias/módulos/sessões)

- [ ] **Reordenar e remover mídias** de uma sessão

- [ ] **Migrar os scripts SQL para o Supabase CLI** (migrations versionadas) antes de vender para outras empresas

- [ ] **Atualizar pacotes do Expo** (`npx expo install --check` mostrou atualizações disponíveis)
