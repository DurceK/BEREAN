// Dados do cliente para quem o app foi gerado (nome, logo, cores, domínio de login).
// "@cliente/" aponta para clientes/<pasta> escolhida em CLIENTE (ver metro.config.js).
import dados from '@cliente/cliente.json';
import type { Cores } from './tema';

type Cliente = {
  nome: string;
  dominioLogin: string; // o login usa o e-mail fictício matricula@dominioLogin
  enfeite?: string; // detalhe opcional mostrado acima do nome na tela de login
  cores: { claro: Cores; escuro: Cores };
};

export const cliente: Cliente = dados;

export const logoDoCliente = require('@cliente/logo.png');
