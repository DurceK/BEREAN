// Dados do cliente para quem o app foi gerado (nome, logo, cores, domínio de login).
// "@cliente/" aponta para clientes/<pasta> escolhida em CLIENTE (ver metro.config.js).
import dados from '@cliente/cliente.json';
import fontes from '@cliente/fontes';
import type { Cores } from './tema';

type Cliente = {
  nome: string;
  dominioLogin: string; // o login usa o e-mail fictício matricula@dominioLogin
  site?: string; // endereço do app na internet (vai na mensagem de acesso para o aluno)
  enfeite?: string; // detalhe opcional mostrado acima do nome na tela de login
  cores: { claro: Cores; escuro: Cores };
};

export const cliente: Cliente = dados;

export const logoDoCliente = require('@cliente/logo.png');

// Ícone do app (no site, vira o ícone de "Adicionar à Tela de Início")
export const iconeDoCliente = require('@cliente/icon.png');

// Arquivos de fonte de cada papel (titulo, tituloLeve, texto, textoMedio, textoForte)
export const fontesDoCliente = fontes;
