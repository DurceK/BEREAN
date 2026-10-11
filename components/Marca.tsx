import { View, Text, Image, StyleSheet } from 'react-native';
import { fontes, useEstilos, type Cores } from '../lib/tema';

const logo = require('../assets/logo.png');

export function Marca() {
  const estilos = useEstilos(criarEstilos);

  return (
    <View style={estilos.marca}>
      <Image source={logo} style={estilos.logo} resizeMode="contain" accessibilityLabel="Logo BEREAN" />
      <Text style={estilos.estrelas}>★ ★ ★</Text>
      <Text style={estilos.nome}>BEREAN</Text>
      <View style={estilos.filete} />
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    marca: { alignItems: 'center', gap: 6, marginBottom: 32 },
    // proporção do escudo recortado (389 x 512)
    logo: { width: 104, height: 137, marginBottom: 12 },
    estrelas: { color: c.destaque, fontSize: 12, letterSpacing: 6 },
    nome: { fontFamily: fontes.titulo, fontSize: 40, color: c.texto, letterSpacing: 4 },
    filete: { width: 64, height: 1, backgroundColor: c.destaque },
  });
