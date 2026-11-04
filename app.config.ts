/// <reference types="node" />
// Monta a configuração do app para o cliente escolhido em CLIENTE (no .env da raiz,
// gravado por `npm run cliente -- <pasta>`). O que é igual para todos fica no app.json;
// nome, ícone, cores e identificador vêm de clientes/<pasta>/cliente.json.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const pasta = process.env.CLIENTE || 'berean';
const raiz = `./clientes/${pasta}`;
const arquivo = join(__dirname, 'clientes', pasta, 'cliente.json');
if (!existsSync(arquivo)) {
  throw new Error(`Cliente "${pasta}" não encontrado: falta ${arquivo}`);
}
const cliente = JSON.parse(readFileSync(arquivo, 'utf8'));

// Site: gera public/manifest.webmanifest e public/icone-app.png a partir do cliente, para o
// iPhone e o Android abrirem o site "instalado" na tela de início como app, em tela cheia.
// São arquivos gerados (estão no .gitignore): mudam junto com o cliente escolhido.
function gerarArquivosDoSite() {
  const publico = join(__dirname, 'public');
  mkdirSync(publico, { recursive: true });
  copyFileSync(join(__dirname, 'clientes', pasta, 'icon.png'), join(publico, 'icone-app.png'));
  const manifest = {
    name: cliente.nome,
    short_name: cliente.nome,
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: cliente.cores.escuro.fundo,
    theme_color: cliente.cores.escuro.fundo,
    icons: [{ src: '/icone-app.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
  };
  const conteudo = JSON.stringify(manifest, null, 2) + '\n';
  const destino = join(publico, 'manifest.webmanifest');
  if (!existsSync(destino) || readFileSync(destino, 'utf8') !== conteudo) {
    writeFileSync(destino, conteudo);
  }
}
gerarArquivosDoSite();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: cliente.nome,
  slug: cliente.slug,
  scheme: cliente.scheme,
  icon: `${raiz}/icon.png`,
  // Cada cliente tem o próprio projeto no Expo (builds, site e atualizações separados)
  owner: cliente.dono,
  extra: { ...config.extra, eas: { projectId: cliente.projetoExpo } },
  updates: { url: `https://u.expo.dev/${cliente.projetoExpo}` },
  ios: { ...config.ios, bundleIdentifier: cliente.identificador },
  android: {
    ...config.android,
    package: cliente.identificador,
    adaptiveIcon: {
      backgroundColor: cliente.corDeFundo,
      foregroundImage: `${raiz}/android-icon-foreground.png`,
    },
  },
  web: { ...config.web, favicon: `${raiz}/favicon.png` },
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-splash-screen',
      { backgroundColor: cliente.corDeFundo, image: `${raiz}/icon.png`, imageWidth: 220 },
    ],
  ],
});
