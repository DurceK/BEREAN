import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';

export default function MentorInicio() {
  const { perfil, sair } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.saudacao}>Olá, {perfil?.nome}</Text>

      <Link href="/(mentor)/editar-categoria" asChild>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitulo}>Editar categoria</Text>
          <Text style={styles.cardDescricao}>Gerenciar categorias, módulos e sessões</Text>
        </Pressable>
      </Link>

      <Pressable onPress={sair} style={styles.sair}>
        <Text style={styles.sairTexto}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 24 },
  saudacao: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardDescricao: { color: '#999' },
  sair: { marginTop: 32 },
  sairTexto: { color: '#f66' },
});
