import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import Ionicons from '@expo/vector-icons/Ionicons';
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

// Texto com várias linhas vira uma lista de frases, cada uma com seu botão de ouvir.
// A numeração no começo da linha ("1. Hello!") é só para o mentor e some na tela e na voz.
function separarLinhas(texto: string) {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim().replace(/^\d+[.)]\s+/, ''))
    .filter(Boolean);
  return linhas.length > 1 ? linhas : null;
}

// Em qual linha está a posição informada pela voz (as linhas são lidas separadas por "\n")
function linhaDaPosicao(linhas: string[], posicao: number) {
  let inicio = 0;
  for (let i = 0; i < linhas.length; i++) {
    const fim = inicio + linhas[i].length;
    if (posicao <= fim) return i;
    inicio = fim + 1;
  }
  return -1;
}

export function LeitorTexto({ id, texto, idioma, ativo, onAtivar, onTerminar }: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const estilosPlayer = useEstilos(criarEstilosPlayer);
  const [falando, setFalando] = useState(false);
  const [posicao, setPosicao] = useState(-1);
  // Linha tocando sozinha (pelo botão da própria frase); -1 = nenhuma
  const [linhaSozinha, setLinhaSozinha] = useState(-1);
  const [velocidade, setVelocidade] = useState(1);
  // Frases já ouvidas uma a uma: ouvir todas também conta como texto visto
  const ouvidas = useRef(new Set<number>());

  const linhas = separarLinhas(texto);
  const textoFalado = linhas ? linhas.join('\n') : texto;

  useEffect(() => {
    if (ativo !== id && falando) Speech.stop();
  }, [ativo, id, falando]);

  useEffect(() => () => void Speech.stop(), []);

  function terminar() {
    setFalando(false);
    setPosicao(-1);
    setLinhaSozinha(-1);
  }

  async function falar(conteudo: string, linha: number, aoTerminar: () => void) {
    onAtivar(id);
    await Speech.stop();
    setFalando(true);
    setPosicao(-1);
    setLinhaSozinha(linha);
    Speech.speak(conteudo, {
      language: idioma ?? 'pt-BR',
      rate: velocidade,
      onBoundary: ((evento: { charIndex: number }) =>
        setPosicao(evento.charIndex)) as Speech.SpeechOptions['onBoundary'],
      // onDone: leu até o fim; onStopped: alguém parou no meio (não conta)
      onDone: () => {
        terminar();
        aoTerminar();
      },
      onStopped: terminar,
    });
  }

  async function alternarTudo() {
    if (falando) {
      await Speech.stop();
      terminar();
      return;
    }
    falar(textoFalado, -1, () => onTerminar?.(id));
  }

  async function ouvirLinha(i: number) {
    if (falando && linhaSozinha === i) {
      await Speech.stop();
      terminar();
      return;
    }
    falar(linhas![i], i, () => {
      ouvidas.current.add(i);
      if (ouvidas.current.size === linhas!.length) onTerminar?.(id);
    });
  }

  // Linha em destaque: a que toca sozinha ou, lendo tudo, a que a voz está lendo agora
  const linhaAtual = !falando
    ? -1
    : linhaSozinha >= 0
      ? linhaSozinha
      : linhas
        ? linhaDaPosicao(linhas, posicao)
        : -1;
  const partes = falando && !linhas ? dividirNaPalavra(texto, posicao) : null;

  const controles = (
    <View style={estilos.controles}>
      <Pressable
        style={estilosPlayer.play}
        onPress={alternarTudo}
        accessibilityLabel={falando ? 'Parar leitura' : 'Ouvir texto'}
      >
        <Ionicons name={falando ? 'stop' : 'play'} size={24} color={cores.sobrePrimaria} />
      </Pressable>
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

  if (linhas) {
    return (
      <View style={estilos.caixa}>
        <View style={estilos.lista}>
          {linhas.map((linha, i) => (
            <View key={i} style={[estilos.linha, i > 0 && estilos.linhaSeparada]}>
              <Text style={[estilos.linhaTexto, linhaAtual === i && { color: cores.destaque }]}>
                {linha}
              </Text>
              <Pressable
                style={[estilos.ouvir, linhaAtual === i && estilos.ouvirAtivo]}
                onPress={() => ouvirLinha(i)}
                accessibilityLabel={`Ouvir: ${linha}`}
                hitSlop={6}
              >
                <Ionicons
                  name={linhaSozinha === i ? 'stop' : 'volume-medium'}
                  size={18}
                  color={linhaAtual === i ? cores.sobrePrimaria : cores.destaque}
                />
              </Pressable>
            </View>
          ))}
        </View>
        {controles}
      </View>
    );
  }

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
      {controles}
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    caixa: { gap: 16 },
    texto: { fontFamily: fontes.texto, fontSize: 17, lineHeight: 28, color: c.texto },
    palavra: { borderRadius: 3 },
    controles: { alignItems: 'center', gap: 12 },
    nota: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave, textAlign: 'center' },
    lista: {},
    linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    linhaSeparada: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borda },
    linhaTexto: { flex: 1, minWidth: 0, fontFamily: fontes.texto, fontSize: 17, color: c.texto },
    ouvir: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.borda,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ouvirAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
  });
