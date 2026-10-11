import { useEffect, useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { fontes, useEstilos, type Cores } from '../lib/tema';
import { iniciais } from './Avatar';

type Props = { nome: string; caminho: string | null; tamanho?: number };

// Foto de outra pessoa (só leitura). Sem foto, mostra as iniciais.
export function FotoPessoa({ nome, caminho, tamanho = 44 }: Props) {
  const estilos = useEstilos(criarEstilos);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!caminho) return;
    let cancelado = false;
    supabase.storage
      .from('avatares')
      .createSignedUrl(caminho, 4 * 3600)
      .then(({ data }) => {
        if (!cancelado) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelado = true;
    };
  }, [caminho]);

  const forma = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };

  return (
    <View style={[estilos.circulo, forma]}>
      {caminho && url ? (
        <Image source={{ uri: url }} style={forma} accessibilityLabel={`Foto de ${nome}`} />
      ) : (
        <Text style={[estilos.iniciais, { fontSize: tamanho * 0.36 }]}>{iniciais(nome)}</Text>
      )}
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    circulo: {
      backgroundColor: c.primaria,
      borderWidth: 2,
      borderColor: c.destaque,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    iniciais: { fontFamily: fontes.titulo, color: c.sobrePrimaria },
  });
