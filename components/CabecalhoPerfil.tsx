import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { fontes, useEstilos, type Cores } from '../lib/tema';
import { Avatar } from './Avatar';

const TAMANHO_FOTO = 108;

type Estatistica = { valor: number | string; rotulo: string };

type Props = {
  area: string; // texto pequeno no canto da faixa (ex: "Minhas aulas")
  papel: string; // texto abaixo do nome (ex: "Aluna")
  estatisticas: Estatistica[];
  botao?: { texto: string; onPress: () => void };
};

// Topo das telas iniciais: faixa colorida, foto grande no centro, nome, números e um botão.
export function CabecalhoPerfil({ area, papel, estatisticas, botao }: Props) {
  const { usuario, sair } = useAuth();
  const estilos = useEstilos(criarEstilos);
  const insets = useSafeAreaInsets();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <View>
      <View style={[estilos.faixa, { paddingTop: insets.top + 16 }]}>
        <View style={estilos.faixaConteudo}>
          <Text style={estilos.area}>{area}</Text>
          <Pressable onPress={sair} accessibilityLabel="Sair da conta">
            <Text style={estilos.sair}>Sair</Text>
          </Pressable>
        </View>
      </View>

      <View style={estilos.corpo}>
        <View style={estilos.foto}>
          <Avatar tamanho={TAMANHO_FOTO} onErro={setErro} />
        </View>
        {erro && <Text style={estilos.erro}>{erro}</Text>}

        <Text style={estilos.nome}>{usuario?.nome}</Text>
        <Text style={estilos.papel}>{papel}</Text>

        <View style={estilos.numeros}>
          {estatisticas.map((item) => (
            <View key={item.rotulo} style={estilos.numero}>
              <Text style={estilos.valor}>{item.valor}</Text>
              <Text style={estilos.rotulo}>{item.rotulo}</Text>
            </View>
          ))}
        </View>

        {botao && (
          <Pressable style={estilos.botao} onPress={botao.onPress}>
            <Text style={estilos.botaoTexto}>{botao.texto}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    faixa: { backgroundColor: c.faixa, paddingBottom: TAMANHO_FOTO / 2 + 16, paddingHorizontal: 24 },
    faixaConteudo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    area: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.sobreFaixa,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    sair: { fontFamily: fontes.textoMedio, fontSize: 14, color: c.sobreFaixa, opacity: 0.85 },
    corpo: { alignItems: 'center', paddingHorizontal: 24 },
    foto: { marginTop: -TAMANHO_FOTO / 2, padding: 4, borderRadius: TAMANHO_FOTO, backgroundColor: c.fundo },
    erro: { fontFamily: fontes.texto, color: c.erro, marginTop: 8, textAlign: 'center' },
    nome: {
      fontFamily: fontes.titulo,
      fontSize: 24,
      color: c.texto,
      marginTop: 12,
      textAlign: 'center',
    },
    papel: { fontFamily: fontes.texto, color: c.textoSuave, marginTop: 2 },
    numeros: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 40,
      marginTop: 20,
      width: '100%',
      maxWidth: 420,
    },
    numero: { alignItems: 'center', minWidth: 64 },
    valor: {
      fontFamily: fontes.tituloLeve,
      fontSize: 22,
      color: c.destaque,
      fontVariant: ['tabular-nums'],
    },
    rotulo: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave, marginTop: 2 },
    botao: {
      marginTop: 20,
      backgroundColor: c.primaria,
      borderRadius: 24,
      paddingVertical: 12,
      paddingHorizontal: 32,
    },
    botaoTexto: {
      fontFamily: fontes.textoForte,
      color: c.sobrePrimaria,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      fontSize: 13,
    },
  });
