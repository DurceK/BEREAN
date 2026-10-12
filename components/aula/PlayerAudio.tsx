import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { fontes, useEstilos, type Cores } from '../../lib/tema';

export const VELOCIDADES = [0.75, 1, 1.25, 1.5];

type Props = {
  id: string;
  url: string;
  ativo: string | null;
  onAtivar: (id: string) => void;
  onTerminar?: (id: string) => void;
  posicaoInicial?: number; // segundos; retoma de onde o aluno parou
  onProgresso?: (id: string, segundos: number) => void;
};

// De quanto em quanto tempo (tocando) o ponto atual é salvo
const INTERVALO_SALVAR = 10;

function formatarTempo(segundos: number) {
  const total = Math.max(0, Math.floor(segundos || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function PlayerAudio({
  id,
  url,
  ativo,
  onAtivar,
  onTerminar,
  posicaoInicial = 0,
  onProgresso,
}: Props) {
  const estilos = useEstilos(criarEstilos);
  const player = useAudioPlayer(url, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [velocidade, setVelocidade] = useState(1);
  const [larguraBarra, setLarguraBarra] = useState(0);

  const retomou = useRef(false);
  const jaTocou = useRef(false);
  const ultimoSalvo = useRef(posicaoInicial);
  const tempoAtual = useRef(posicaoInicial);
  const avisar = useRef(onProgresso);

  useEffect(() => {
    avisar.current = onProgresso;
  }, [onProgresso]);

  // Ao carregar, pula para onde o aluno tinha parado (se não estava quase no fim)
  useEffect(() => {
    if (!status.isLoaded || retomou.current) return;
    retomou.current = true;
    if (posicaoInicial > 1 && posicaoInicial < status.duration - 2) player.seekTo(posicaoInicial);
  }, [status.isLoaded, status.duration, posicaoInicial, player]);

  // Salva o ponto a cada INTERVALO_SALVAR segundos tocando, e ao pausar.
  // Só depois do primeiro play: antes disso o áudio ainda pode estar no segundo 0,
  // a caminho do ponto salvo, e gravaria 0 por cima dele.
  useEffect(() => {
    tempoAtual.current = status.currentTime;
    if (status.playing) jaTocou.current = true;
    if (!jaTocou.current) return;
    const andou = Math.abs(status.currentTime - ultimoSalvo.current) >= INTERVALO_SALVAR;
    if (
      (status.playing && andou) ||
      (!status.playing && status.currentTime !== ultimoSalvo.current)
    ) {
      ultimoSalvo.current = status.currentTime;
      avisar.current?.(id, status.currentTime);
    }
  }, [status.currentTime, status.playing, id]);

  // Salva também ao sair da aula
  useEffect(
    () => () => {
      if (jaTocou.current && tempoAtual.current !== ultimoSalvo.current) {
        avisar.current?.(id, tempoAtual.current);
      }
    },
    [id]
  );

  // Só uma mídia toca por vez: se outra virou a ativa, este pausa.
  useEffect(() => {
    if (ativo !== id && status.playing) player.pause();
  }, [ativo, id, player, status.playing]);

  useEffect(() => {
    if (status.didJustFinish) onTerminar?.(id);
  }, [status.didJustFinish, id, onTerminar]);

  function alternar() {
    if (status.playing) {
      player.pause();
      return;
    }
    onAtivar(id);
    if (status.duration > 0 && status.currentTime >= status.duration - 0.5) player.seekTo(0);
    player.play();
  }

  function pular(segundos: number) {
    const destino = Math.min(Math.max(0, status.currentTime + segundos), status.duration || 0);
    player.seekTo(destino);
  }

  function irPara(posicaoX: number) {
    if (!larguraBarra || !status.duration) return;
    player.seekTo((posicaoX / larguraBarra) * status.duration);
  }

  function mudarVelocidade(valor: number) {
    setVelocidade(valor);
    player.setPlaybackRate(valor);
  }

  const progresso = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <View style={estilos.caixa}>
      <Pressable
        style={estilos.barra}
        onLayout={(e) => setLarguraBarra(e.nativeEvent.layout.width)}
        onPress={(e) => irPara(e.nativeEvent.locationX)}
        accessibilityLabel="Posição do áudio"
      >
        <View style={[estilos.barraPreenchida, { width: `${progresso * 100}%` }]} />
      </Pressable>
      <View style={estilos.tempos}>
        <Text style={estilos.tempo}>{formatarTempo(status.currentTime)}</Text>
        <Text style={estilos.tempo}>
          {status.isLoaded ? formatarTempo(status.duration) : '--:--'}
        </Text>
      </View>

      <View style={estilos.controles}>
        <Pressable
          style={estilos.pulo}
          onPress={() => pular(-10)}
          accessibilityLabel="Voltar 10 segundos"
        >
          <Text style={estilos.puloTexto}>−10s</Text>
        </Pressable>
        <Pressable
          style={[estilos.play, !status.isLoaded && estilos.desabilitado]}
          disabled={!status.isLoaded}
          onPress={alternar}
          accessibilityLabel={status.playing ? 'Pausar' : 'Tocar'}
        >
          <Text style={estilos.playTexto}>{status.playing ? '❚❚' : '▶'}</Text>
        </Pressable>
        <Pressable
          style={estilos.pulo}
          onPress={() => pular(10)}
          accessibilityLabel="Avançar 10 segundos"
        >
          <Text style={estilos.puloTexto}>+10s</Text>
        </Pressable>
      </View>

      <View style={estilos.velocidades}>
        {VELOCIDADES.map((valor) => (
          <Pressable
            key={valor}
            style={[estilos.chip, velocidade === valor && estilos.chipAtivo]}
            onPress={() => mudarVelocidade(valor)}
          >
            <Text style={[estilos.chipTexto, velocidade === valor && estilos.chipTextoAtivo]}>
              {String(valor).replace('.', ',')}x
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    caixa: { gap: 10 },
    barra: {
      height: 8,
      borderRadius: 4,
      backgroundColor: c.borda,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    // sem toque no preenchimento, para a posição do clique ser medida na barra inteira
    barraPreenchida: { height: '100%', backgroundColor: c.destaque, pointerEvents: 'none' },
    tempos: { flexDirection: 'row', justifyContent: 'space-between' },
    tempo: {
      fontFamily: fontes.textoMedio,
      fontSize: 12,
      color: c.textoSuave,
      fontVariant: ['tabular-nums'],
    },
    controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
    pulo: { padding: 8 },
    puloTexto: { fontFamily: fontes.textoForte, color: c.texto },
    play: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primaria,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playTexto: { color: c.sobrePrimaria, fontSize: 20 },
    desabilitado: { opacity: 0.4 },
    velocidades: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borda,
    },
    chipAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
    chipTexto: { fontFamily: fontes.textoMedio, fontSize: 13, color: c.texto },
    chipTextoAtivo: { color: c.sobrePrimaria },
  });
