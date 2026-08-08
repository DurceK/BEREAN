import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/auth';

export default function MentoradoInicio() {
  const { perfil, sair } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.saudacao}>Olá, {perfil?.nome}</Text>
      <Text style={styles.aviso}>Tela do mentorado ainda em construção.</Text>

      <Pressable onPress={sair} style={styles.sair}>
        <Text style={styles.sairTexto}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 24 },
  saudacao: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  aviso: { color: '#999' },
  sair: { marginTop: 32 },
  sairTexto: { color: '#f66' },
});
