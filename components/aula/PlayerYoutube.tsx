// Versão para o celular: o player do YouTube roda numa página web dentro do app (WebView).
// No navegador o Expo usa PlayerYoutube.web.tsx no lugar deste arquivo.
import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  id: string;
  videoId: string;
  ativo: string | null;
  onAtivar: (id: string) => void;
  onTerminar?: (id: string) => void;
};

// O YouTube exige que o player tenha uma origem https; usamos o domínio fictício do app
const ORIGEM = 'https://berean.app';
const TERMINOU = 0;
const TOCANDO = 1;

function pagina(videoId: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000}#player{width:100%;height:100%}</style>
</head><body><div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: '${videoId}',
    playerVars: { playsinline: 1, rel: 0, origin: '${ORIGEM}' },
    events: {
      onStateChange: function (e) { window.ReactNativeWebView.postMessage(String(e.data)); }
    }
  });
}
</script></body></html>`;
}

export function PlayerYoutube({ id, videoId, ativo, onAtivar, onTerminar }: Props) {
  const navegador = useRef<WebView>(null);
  const tocando = useRef(false);

  // Só uma mídia toca por vez
  useEffect(() => {
    if (ativo !== id && tocando.current) {
      navegador.current?.injectJavaScript('player && player.pauseVideo(); true;');
    }
  }, [ativo, id]);

  return (
    <View style={estilos.caixa}>
      <WebView
        ref={navegador}
        source={{ html: pagina(videoId), baseUrl: ORIGEM }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        onMessage={(evento) => {
          const estado = Number(evento.nativeEvent.data);
          tocando.current = estado === TOCANDO;
          if (estado === TOCANDO) onAtivar(id);
          if (estado === TERMINOU) onTerminar?.(id);
        }}
        style={estilos.web}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  web: { flex: 1, backgroundColor: '#000' },
});
