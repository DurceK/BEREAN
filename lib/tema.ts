import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { cliente } from './cliente';

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
  faixa: string; // faixa de destaque no topo do perfil
  sobreFaixa: string;
};

// As cores vêm do cliente (clientes/<pasta>/cliente.json), com versão clara e escura
const { claro, escuro } = cliente.cores;

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
