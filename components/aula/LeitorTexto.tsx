import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';
import { VELOCIDADES, criarEstilos as criarEstilosPlayer } from './PlayerAudio';

type Props = {
  id: string;
  texto: string;
  idioma: string | null;
  ativo: string | null;
  onAtivar: (id: string) => void;
  onTerminar?: (id: string) => void;
};

// Separa o texto em [antes, palavra sendo lida, depois] a partir da posição informada pela voz.
function dividirNaPalavra(texto: string, inicio: number) {
  if (inicio < 0 || inicio >= texto.length) return null;
  const resto = texto.slice(inicio);
  const fim = resto.search(/\s/);
  const tamanho = fim === -1 ? resto.length : fim;
  return [
    texto.slice(0, inicio),
    texto.slice(inicio, inicio + tamanho),
    texto.slice(inicio + tamanho),
  ];
}

export function LeitorTexto({ id, texto, idioma, ativo, onAtivar, onTerminar }: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const estilosPlayer = useEstilos(criarEstilosPlayer);
  const [falando, setFalando] = useState(false);
  const [posicao, setPosicao] = useState(-1);
  const [velocidade, setVelocidade] = useState(1);

  useEffect(() => {
    if (ativo !== id && falando) Speech.stop();
  }, [ativo, id, falando]);

  useEffect(() => () => void Speech.stop(), []);

  function terminar() {
    setFalando(false);
    setPosicao(-1);
  }

  async function alternar() {
    if (falando) {
      await Speech.stop();
      terminar();
      return;
    }
    onAtivar(id);
    await Speech.stop();
    setFalando(true);
    Speech.speak(texto, {
      language: idioma ?? 'pt-BR',
      rate: velocidade,
      onBoundary: ((evento: { charIndex: number }) =>
        setPosicao(evento.charIndex)) as Speech.SpeechOptions['onBoundary'],
      // onDone: leu até o fim (conta como visto); onStopped: alguém parou no meio (não conta)
      onDone: () => {
        terminar();
        onTerminar?.(id);
      },
      onStopped: terminar,
    });
  }

  const partes = falando ? dividirNaPalavra(texto, posicao) : null;

  return (
    <View style={estilos.caixa}>
      <Text style={estilos.texto}>
        {partes ? (
          <>
            {partes[0]}
            <Text
              style={[estilos.palavra, { backgroundColor: cores.destaque, color: cores.fundo }]}
            >
              {partes[1]}
            </Text>
            {partes[2]}
          </>
        ) : (
          texto
        )}
      </Text>

      <View style={estilosPlayer.controles}>
        <Pressable
          style={estilosPlayer.play}
          onPress={alternar}
          accessibilityLabel={falando ? 'Parar leitura' : 'Ouvir texto'}
        >
          <Text style={estilosPlayer.playTexto}>{falando ? '■' : '▶'}</Text>
        </Pressable>
      </View>

      <View style={estilosPlayer.velocidades}>
        {VELOCIDADES.map((valor) => (
          <Pressable
            key={valor}
            style={[estilosPlayer.chip, velocidade === valor && estilosPlayer.chipAtivo]}
            onPress={() => setVelocidade(valor)}
          >
            <Text
              style={[
                estilosPlayer.chipTexto,
                velocidade === valor && estilosPlayer.chipTextoAtivo,
              ]}
            >
              {String(valor).replace('.', ',')}x
            </Text>
          </Pressable>
        ))}
      </View>
      {falando && (
        <Text style={estilos.nota}>A velocidade nova vale a partir da próxima leitura.</Text>
      )}
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    caixa: { gap: 14 },
    texto: { fontFamily: fontes.texto, fontSize: 17, lineHeight: 28, color: c.texto },
    palavra: { borderRadius: 3 },
    nota: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave, textAlign: 'center' },
  });
