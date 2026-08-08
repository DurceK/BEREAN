import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { entrar } = useAuth();
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleEntrar() {
    setErro(null);
    setCarregando(true);
    const { erro } = await entrar(matricula, senha);
    setCarregando(false);
    if (erro) setErro(erro);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Bem-vindo de volta</Text>
      <Text style={styles.subtitulo}>Entre para continuar suas sessões</Text>

      <Text style={styles.label}>Matrícula</Text>
      <TextInput
        style={styles.input}
        value={matricula}
        onChangeText={setMatricula}
        autoCapitalize="none"
        placeholder="Sua matrícula"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Senha</Text>
      <TextInput
        style={styles.input}
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        placeholder="Sua senha"
        placeholderTextColor="#666"
      />

      {erro && <Text style={styles.erro}>{erro}</Text>}

      <Pressable style={styles.botao} onPress={handleEntrar} disabled={carregando}>
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoTexto}>Entrar</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#121212' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitulo: { color: '#999', marginBottom: 24 },
  label: { color: '#ccc', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    backgroundColor: '#1a1a1a',
  },
  erro: { color: '#f66', marginTop: 12 },
  botao: {
    backgroundColor: '#1db954',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  botaoTexto: { color: '#fff', fontWeight: 'bold' },
});
