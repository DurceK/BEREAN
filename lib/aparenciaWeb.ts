// No site (navegador), ajusta a página à marca do cliente e ao tema claro/escuro:
// - cor de fundo da página e "theme-color": o Safari do iPhone pinta as barras dele com essa
//   cor (antes ficavam brancas, porque a página por baixo do app era branca);
// - nome e ícone usados quando o aluno faz "Adicionar à Tela de Início".
// No celular (APK) não faz nada.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { cliente, iconeDoCliente } from './cliente';
import { useTema } from './tema';

function definirMeta(nome: string, conteudo: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${nome}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = nome;
    document.head.appendChild(meta);
  }
  meta.content = conteudo;
}

function definirLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

// Endereço da imagem no site (o require de imagem vira um endereço ou { uri })
function enderecoDaImagem(modulo: unknown) {
  if (typeof modulo === 'string') return modulo;
  return (
    (modulo as { uri?: string; default?: string })?.uri ?? (modulo as { default?: string })?.default
  );
}

export function useAparenciaWeb() {
  const { cores } = useTema();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.backgroundColor = cores.fundo;
    document.body.style.backgroundColor = cores.fundo;
    definirMeta('theme-color', cores.fundo);
  }, [cores.fundo]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = cliente.nome;
    definirMeta('apple-mobile-web-app-title', cliente.nome);
    const icone = enderecoDaImagem(iconeDoCliente);
    if (icone) definirLink('apple-touch-icon', icone);
  }, []);
}
