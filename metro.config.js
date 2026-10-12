// "@cliente/..." aponta para a pasta do cliente escolhido em CLIENTE (ver app.config.ts).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const pastaDoCliente = path.join(__dirname, 'clientes', process.env.CLIENTE || 'berean');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const nome = moduleName.startsWith('@cliente/')
    ? path.join(pastaDoCliente, moduleName.slice('@cliente/'.length))
    : moduleName;
  return context.resolveRequest(context, nome, platform);
};

module.exports = config;
