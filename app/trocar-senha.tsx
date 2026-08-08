import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';

export default function TrocarSenha() {
  const { trocarSenha } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleTrocar() {
    if (novaSenha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não são iguais.');
      return;
    }

    setErro(null);
    setCarregando(true);
    const { erro } = await trocarSenha(novaSenha);
    setCarregando(false);
    if (erro) setErro(erro);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crie sua senha</Text>
      <Text style={styles.subtitulo}>
        Você entrou com uma senha provisória. Escolha uma nova senha antes de continuar.
      </Text>

      <Text style={styles.label}>Nova senha</Text>
      <TextInput
        style={styles.input}
        value={novaSenha}
        onChangeText={setNovaSenha}
        secureTextEntry
        placeholder="Nova senha"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Confirmar senha</Text>
      <TextInput
        style={styles.input}
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        secureTextEntry
        placeholder="Confirme a nova senha"
        placeholderTextColor="#666"
      />

      {erro && <Text style={styles.erro}>{erro}</Text>}

      <Pressable style={styles.botao} onPress={handleTrocar} disabled={carregando}>
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoTexto}>Salvar senha</Text>
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
