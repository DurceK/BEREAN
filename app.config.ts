/// <reference types="node" />
// Monta a configuração do app para o cliente escolhido em CLIENTE (no .env da raiz,
// gravado por `npm run cliente -- <pasta>`). O que é igual para todos fica no app.json;
// nome, ícone, cores e identificador vêm de clientes/<pasta>/cliente.json.
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const pasta = process.env.CLIENTE || 'berean';
const raiz = `./clientes/${pasta}`;
const arquivo = join(__dirname, 'clientes', pasta, 'cliente.json');
if (!existsSync(arquivo)) {
  throw new Error(`Cliente "${pasta}" não encontrado: falta ${arquivo}`);
}
const cliente = JSON.parse(readFileSync(arquivo, 'utf8'));

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: cliente.nome,
  slug: cliente.slug,
  scheme: cliente.scheme,
  icon: `${raiz}/icon.png`,
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
