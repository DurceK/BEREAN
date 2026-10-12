// Versão para o navegador: o player do YouTube fica num iframe da própria página.
// A conversa com o player (tocou, terminou, tempo atual, pausar) é feita por mensagens (postMessage).
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  id: string;
  videoId: string;
  ativo: string | null;
  onAtivar: (id: string) => void;
  onTerminar?: (id: string) => void;
  posicaoInicial?: number; // segundos; retoma de onde o aluno parou
  onProgresso?: (id: string, segundos: number) => void;
};

// Estados do player do YouTube
const TERMINOU = 0;
const TOCANDO = 1;
const PAUSADO = 2;
// De quanto em quanto tempo (tocando) o ponto atual é salvo
const INTERVALO_SALVAR = 10;

export function PlayerYoutube({
  id,
  videoId,
  ativo,
  onAtivar,
  onTerminar,
  posicaoInicial = 0,
  onProgresso,
}: Props) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const tocando = useRef(false);
  const jaTocou = useRef(false);
  const tempoAtual = useRef(posicaoInicial);
  const ultimoSalvo = useRef(posicaoInicial);
  const avisar = useRef(onProgresso);
  // O ponto de início é lido só uma vez: mudar o endereço do iframe recarregaria o vídeo
  const [inicio] = useState(() => Math.floor(posicaoInicial));

  useEffect(() => {
    avisar.current = onProgresso;
  }, [onProgresso]);

  function enviar(mensagem: Record<string, unknown>) {
    quadro.current?.contentWindow?.postMessage(JSON.stringify(mensagem), '*');
  }

  function salvar() {
    if (!jaTocou.current || tempoAtual.current === ultimoSalvo.current) return;
    ultimoSalvo.current = tempoAtual.current;
    avisar.current?.(id, tempoAtual.current);
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
        const info = dados.info as { playerState?: number; currentTime?: number } | undefined;
        if (typeof info?.playerState === 'number') estado = info.playerState;
        if (typeof info?.currentTime === 'number') {
          tempoAtual.current = info.currentTime;
          if (
            tocando.current &&
            Math.abs(info.currentTime - ultimoSalvo.current) >= INTERVALO_SALVAR
          ) {
            salvar();
          }
        }
      }
      if (estado === undefined) return;

      tocando.current = estado === TOCANDO;
      if (estado === TOCANDO) {
        jaTocou.current = true;
        onAtivar(id);
      }
      if (estado === PAUSADO) salvar();
      if (estado === TERMINOU) onTerminar?.(id);
    }

    window.addEventListener('message', aoReceber);
    return () => {
      window.removeEventListener('message', aoReceber);
      salvar(); // ao sair da aula
    };
    // salvar() só usa refs e o id, que já está na lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, onAtivar, onTerminar]);

  // Só uma mídia toca por vez
  useEffect(() => {
    if (ativo !== id && tocando.current) enviar({ event: 'command', func: 'pauseVideo', args: [] });
  }, [ativo, id]);

  const origem = encodeURIComponent(window.location.origin);
  const comeco = inicio > 1 ? `&start=${inicio}` : '';
  const endereco = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&origin=${origem}${comeco}`;

  return (
    <View style={estilos.caixa}>
      <iframe
        ref={quadro}
        src={endereco}
        title="Vídeo da aula"
        // avisa o player que queremos receber os eventos (tocou, pausou, terminou, tempo)
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
