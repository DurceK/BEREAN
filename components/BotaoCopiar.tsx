import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEstilos, useTema, type Cores } from '../lib/tema';

// Copia para a área de transferência. No celular usa o expo-clipboard, carregado só na hora:
// APKs gerados antes dele não têm a parte nativa, e importar no topo fecharia o app.
export async function copiar(texto: string) {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(texto);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carregar só na hora (ver acima)
  const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
  await Clipboard.setStringAsync(texto);
}

// Botão com o ícone de copiar: copia o texto e mostra um ✓ por um instante
// (ou um aviso, se o aparelho não deixar copiar)
export function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [copiado, setCopiado] = useState<'sim' | 'falhou' | null>(null);

  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(null), 1500);
    return () => clearTimeout(id);
  }, [copiado]);

  return (
    <Pressable
      style={estilos.botao}
      disabled={!texto}
      onPress={async () => {
        try {
          await copiar(texto);
          setCopiado('sim');
        } catch {
          setCopiado('falhou');
        }
      }}
      accessibilityLabel={copiado === 'sim' ? `${rotulo} copiada` : `Copiar ${rotulo}`}
      hitSlop={6}
    >
      <Ionicons
        name={copiado === 'sim' ? 'checkmark' : copiado === 'falhou' ? 'alert' : 'copy-outline'}
        size={18}
        color={copiado === 'sim' ? cores.destaque : copiado === 'falhou' ? cores.erro : cores.texto}
      />
    </Pressable>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    botao: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borda,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
