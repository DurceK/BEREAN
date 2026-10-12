// Versão para o celular: o player do YouTube roda numa página web dentro do app (WebView).
// No navegador o Expo usa PlayerYoutube.web.tsx no lugar deste arquivo.
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { cliente } from '../../lib/cliente';

type Props = {
  id: string;
  videoId: string;
  ativo: string | null;
  onAtivar: (id: string) => void;
  onTerminar?: (id: string) => void;
  posicaoInicial?: number; // segundos; retoma de onde o aluno parou
  onProgresso?: (id: string, segundos: number) => void;
};

// O YouTube exige que o player tenha uma origem https; usamos o domínio fictício do app
const ORIGEM = `https://${cliente.dominioLogin}`;
const TERMINOU = 0;
const TOCANDO = 1;
const PAUSADO = 2;
const INTERVALO_SALVAR = 10;

// A página avisa o app com mensagens { estado, tempo } quando o estado muda,
// e a cada 5 segundos enquanto toca ({ tempo }).
function pagina(videoId: string, inicio: number) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000}#player{width:100%;height:100%}</style>
</head><body><div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player;
function avisar(dados) { window.ReactNativeWebView.postMessage(JSON.stringify(dados)); }
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: '${videoId}',
    playerVars: { playsinline: 1, rel: 0, origin: '${ORIGEM}', start: ${inicio} },
    events: {
      onStateChange: function (e) { avisar({ estado: e.data, tempo: player.getCurrentTime() }); }
    }
  });
  setInterval(function () {
    if (player && player.getPlayerState && player.getPlayerState() === 1) {
      avisar({ tempo: player.getCurrentTime() });
    }
  }, 5000);
}
</script></body></html>`;
}

export function PlayerYoutube({
  id,
  videoId,
  ativo,
  onAtivar,
  onTerminar,
  posicaoInicial = 0,
  onProgresso,
}: Props) {
  const navegador = useRef<WebView>(null);
  const tocando = useRef(false);
  const jaTocou = useRef(false);
  const tempoAtual = useRef(posicaoInicial);
  const ultimoSalvo = useRef(posicaoInicial);
  const avisar = useRef(onProgresso);
  // A página é montada só uma vez: trocar o HTML recarregaria o vídeo
  const [html] = useState(() =>
    pagina(videoId, posicaoInicial > 1 ? Math.floor(posicaoInicial) : 0)
  );

  useEffect(() => {
    avisar.current = onProgresso;
  }, [onProgresso]);

  function salvar() {
    if (!jaTocou.current || tempoAtual.current === ultimoSalvo.current) return;
    ultimoSalvo.current = tempoAtual.current;
    avisar.current?.(id, tempoAtual.current);
  }

  // Salva ao sair da aula
  useEffect(
    () => () => salvar(),
    // salvar() só usa refs e o id
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

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
        source={{ html, baseUrl: ORIGEM }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        onMessage={(evento) => {
          let dados: { estado?: number; tempo?: number };
          try {
            dados = JSON.parse(evento.nativeEvent.data);
          } catch {
            return;
          }
          if (typeof dados.tempo === 'number') tempoAtual.current = dados.tempo;

          if (dados.estado === undefined) {
            if (
              tocando.current &&
              Math.abs(tempoAtual.current - ultimoSalvo.current) >= INTERVALO_SALVAR
            ) {
              salvar();
            }
            return;
          }
          tocando.current = dados.estado === TOCANDO;
          if (dados.estado === TOCANDO) {
            jaTocou.current = true;
            onAtivar(id);
          }
          if (dados.estado === PAUSADO) salvar();
          if (dados.estado === TERMINOU) onTerminar?.(id);
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
