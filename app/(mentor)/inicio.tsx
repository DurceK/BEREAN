import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { fontes, useEstilos, type Cores } from '../../lib/tema';

export default function MentorInicio() {
  const { usuario, sair } = useAuth();
  const estilos = useEstilos(criarEstilos);

  return (
    <ScrollView style={estilos.fundo} contentContainerStyle={estilos.container}>
      <Text style={estilos.rotulo}>Área do mentor</Text>
      <Text style={estilos.saudacao}>Olá, {usuario?.nome}</Text>

      <Link href="/(mentor)/editar-categoria" asChild>
        <Pressable style={estilos.card}>
          <Text style={estilos.cardTitulo}>Categorias</Text>
          <Text style={estilos.cardDescricao}>
            Crie e organize categorias, módulos e aulas, e adicione o conteúdo de cada aula.
          </Text>
        </Pressable>
      </Link>

      <Pressable onPress={sair} style={estilos.sair}>
        <Text style={estilos.sairTexto}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: { padding: 24, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
    rotulo: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    saudacao: { fontFamily: fontes.titulo, fontSize: 24, color: c.texto, marginBottom: 8 },
    card: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: c.borda,
      gap: 6,
    },
    cardTitulo: { fontFamily: fontes.tituloLeve, fontSize: 18, color: c.texto },
    cardDescricao: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    sair: { marginTop: 16, alignSelf: 'flex-start' },
    sairTexto: { fontFamily: fontes.textoMedio, color: c.erro },
  });
