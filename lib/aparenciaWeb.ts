// No site (navegador), ajusta a página à marca do cliente e ao tema claro/escuro:
// - cor de fundo da página e "theme-color": o Safari do iPhone pinta as barras dele com essa
//   cor (antes ficavam brancas, porque a página por baixo do app era branca);
// - nome usado quando o aluno faz "Adicionar à Tela de Início" (o ícone e o manifest são
//   gerados pelo app.config.ts em public/).
// No celular (APK) não faz nada.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { cliente } from './cliente';
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
  }, []);
}
