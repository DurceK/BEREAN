# Clientes

Cada pasta aqui é um cliente: o mesmo app com a marca de quem comprou.
O app usa o cliente ativo, escolhido com:

```
npm run cliente -- berean
npx expo start -c
```

## O que vai na pasta de um cliente

| Arquivo | O que é | Vai para o GitHub? |
|---|---|---|
| `cliente.json` | Nome, identificador do app, domínio de login, cores (claro e escuro) | Sim |
| `icon.png` | Ícone do app e da tela de abertura (1024 x 1024) | Sim |
| `android-icon-foreground.png` | Ícone do Android (desenho sem fundo) | Sim |
| `favicon.png` | Ícone da aba do navegador | Sim |
| `logo.png` | Logo da tela de login | Sim |
| `fontes.ts` | Qual fonte usar em cada papel (título, texto...) | Sim |
| `.env` | Endereço e chave pública do Supabase do cliente | **Não** (fica só no PC) |

O `.env` do cliente tem só estas duas linhas, copiadas do painel do Supabase dele
(Project Settings > API):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Campos do cliente.json

- `nome`: aparece na tela de login e embaixo do ícone no celular.
- `slug`: nome técnico do projeto no Expo (sem espaços).
- `scheme`: usado para links que abrem o app (`scheme://`).
- `identificador`: id do app nas lojas (ex: `com.durcek.berean`). **Não pode mudar depois de publicado.**
- `dominioLogin`: domínio do e-mail fictício de login (`matricula@dominioLogin`). Tem que ser igual
  ao segredo `DOMINIO_LOGIN` da Edge Function no Supabase do cliente. **Não mudar depois que houver
  contas**, senão ninguém consegue entrar.
- `enfeite`: detalhe opcional acima do nome no login (ex: `★ ★ ★`). Pode apagar a linha.
- `corDeFundo`: cor da tela de abertura e do fundo do ícone no Android.
- `cores.claro` e `cores.escuro`: as cores do app nos dois temas.

## Fontes

O `fontes.ts` liga cada papel do app a um arquivo de fonte do Google Fonts. Para outra fonte:
`npm install @expo-google-fonts/<nome-da-fonte>` e troque os imports do `fontes.ts` do cliente.
Os papéis são `titulo`, `tituloLeve`, `texto`, `textoMedio` e `textoForte`, e os cinco precisam existir.

## Cliente novo, passo a passo

1. Copie a pasta `berean` com outro nome (ex: `musica-danilo`) e troque as imagens e o `cliente.json`.
2. Crie um projeto novo no Supabase para o cliente e monte o `.env` dele.
3. Crie o banco do cliente:
   ```
   npx.cmd supabase link --project-ref <id do projeto do cliente>
   npx.cmd supabase db push
   ```
4. Publique a Edge Function e defina o domínio de login:
   ```
   npx.cmd supabase functions deploy admin-usuarios --no-verify-jwt --use-api
   npx.cmd supabase secrets set DOMINIO_LOGIN=<o mesmo dominioLogin do cliente.json>
   ```
5. Crie a conta do mentor (Authentication > Users > Add user, com `matricula@dominioLogin`) e a
   linha dele em `usuarios` (modelo em `database/bootstrap_contas.sql`).
6. `npm run cliente -- musica-danilo` e teste.
7. No fim, volte o `supabase link` para o projeto em que for trabalhar em seguida.
