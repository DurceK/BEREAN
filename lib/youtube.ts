// Padrões de link do YouTube. Feito com expressões em vez de `new URL()` porque o URL do
// React Native no celular não implementa tudo (ex: searchParams).
const PADROES = [
  /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})(?:[&#].*)?$/,
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/,
  /^(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/,
];

// Aceita os formatos comuns de link do YouTube e devolve o código do vídeo (11 caracteres),
// ou null se não for um link de vídeo do YouTube.
//   youtube.com/watch?v=ID · youtu.be/ID · youtube.com/shorts/ID · /embed/ID · /live/ID
export function extrairIdYoutube(link: string): string | null {
  const texto = link.trim();
  for (const padrao of PADROES) {
    const achado = texto.match(padrao);
    if (achado) return achado[1];
  }
  return null;
}

export function linkYoutube(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
