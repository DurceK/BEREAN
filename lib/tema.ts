import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

const marca = {
  esmeralda: '#0D3B2E',
  floresta: '#07241C',
  marfim: '#F5F2EB',
  ouro: '#C8A86B',
};

export type Cores = {
  fundo: string;
  superficie: string;
  borda: string;
  texto: string;
  textoSuave: string;
  primaria: string;
  sobrePrimaria: string;
  destaque: string;
  erro: string;
  sobreposicao: string;
};

const claro: Cores = {
  fundo: marca.marfim,
  superficie: '#FFFDF8',
  borda: '#DED6C4',
  texto: marca.floresta,
  textoSuave: '#56685F',
  primaria: marca.esmeralda,
  sobrePrimaria: marca.marfim,
  // o ouro puro some sobre o marfim; em texto usamos um tom mais escuro dele
  destaque: '#8A6A2C',
  erro: '#A3392A',
  sobreposicao: 'rgba(7, 36, 28, 0.55)',
};

const escuro: Cores = {
  fundo: marca.floresta,
  superficie: marca.esmeralda,
  borda: '#24594A',
  texto: marca.marfim,
  textoSuave: '#B5C2BA',
  primaria: marca.ouro,
  sobrePrimaria: marca.floresta,
  destaque: marca.ouro,
  erro: '#E8846F',
  sobreposicao: 'rgba(0, 0, 0, 0.6)',
};

export const fontes = {
  titulo: 'Cinzel_700Bold',
  tituloLeve: 'Cinzel_600SemiBold',
  texto: 'Montserrat_400Regular',
  textoMedio: 'Montserrat_500Medium',
  textoForte: 'Montserrat_600SemiBold',
};

export type Tema = { cores: Cores; escuro: boolean };

export function useTema(): Tema {
  const esquema = useColorScheme();
  return esquema === 'dark' ? { cores: escuro, escuro: true } : { cores: claro, escuro: false };
}

export function useEstilos<T>(fabrica: (cores: Cores) => T): T {
  const { cores } = useTema();
  return useMemo(() => fabrica(cores), [cores, fabrica]);
}
