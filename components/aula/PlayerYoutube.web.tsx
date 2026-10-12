// Versão para o navegador: o player do YouTube fica num iframe da própria página.
// A conversa com o player (tocou, terminou, pausar) é feita por mensagens (postMessage).
import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  id: string;
  videoId: string;
  ativo: string | null;
  onAtivar: (id: string) => void;
  onTerminar?: (id: string) => void;
};

// Estados do player do YouTube
const TERMINOU = 0;
const TOCANDO = 1;

export function PlayerYoutube({ id, videoId, ativo, onAtivar, onTerminar }: Props) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const tocando = useRef(false);

  function enviar(mensagem: Record<string, unknown>) {
    quadro.current?.contentWindow?.postMessage(JSON.stringify(mensagem), '*');
  }

  useEffect(() => {
    function aoReceber(evento: MessageEvent) {
      if (evento.source !== quadro.current?.contentWindow) return;
      let dados: { event?: string; info?: unknown };
      try {
        dados = typeof evento.data === 'string' ? JSON.parse(evento.data) : evento.data;
      } catch {
        return;
      }

      let estado: number | undefined;
      if (dados?.event === 'onStateChange' && typeof dados.info === 'number') estado = dados.info;
      if (dados?.event === 'infoDelivery') {
        const info = dados.info as { playerState?: number } | undefined;
        if (typeof info?.playerState === 'number') estado = info.playerState;
      }
      if (estado === undefined) return;

      tocando.current = estado === TOCANDO;
      if (estado === TOCANDO) onAtivar(id);
      if (estado === TERMINOU) onTerminar?.(id);
    }

    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [id, onAtivar, onTerminar]);

  // Só uma mídia toca por vez
  useEffect(() => {
    if (ativo !== id && tocando.current) enviar({ event: 'command', func: 'pauseVideo', args: [] });
  }, [ativo, id]);

  const origem = encodeURIComponent(window.location.origin);
  const endereco = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&origin=${origem}`;

  return (
    <View style={estilos.caixa}>
      <iframe
        ref={quadro}
        src={endereco}
        title="Vídeo da aula"
        // avisa o player que queremos receber os eventos (tocou, pausou, terminou)
        onLoad={() => enviar({ event: 'listening', id, channel: 'widget' })}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        style={{ border: 0, width: '100%', height: '100%' }}
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
});
