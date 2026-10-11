import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';
import { Marca } from '../components/Marca';

export default function Login() {
  const { entrar } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [ajudaSenha, setAjudaSenha] = useState(false);

  async function handleEntrar() {
    setErro(null);
    setCarregando(true);
    const { erro } = await entrar(matricula, senha);
    setCarregando(false);
    if (erro) setErro(erro);
  }

  return (
    <View style={estilos.container}>
      <View style={estilos.conteudo}>
        <Marca />

        <Text style={estilos.titulo}>Bem-vindo de volta</Text>
        <Text style={estilos.subtitulo}>Entre para continuar suas aulas</Text>

        <Text style={estilos.label}>Matrícula</Text>
        <TextInput
          style={estilos.input}
          value={matricula}
          onChangeText={setMatricula}
          autoCapitalize="none"
          placeholder="Sua matrícula"
          placeholderTextColor={cores.textoSuave}
        />

        <Text style={estilos.label}>Senha</Text>
        <TextInput
          style={estilos.input}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="Sua senha"
          placeholderTextColor={cores.textoSuave}
        />

        <Pressable style={estilos.esqueci} onPress={() => setAjudaSenha((atual) => !atual)}>
          <Text style={estilos.esqueciTexto}>Esqueci minha senha</Text>
        </Pressable>
        {ajudaSenha && (
          <Text style={estilos.ajuda}>
            Peça ao seu mentor para redefinir sua senha. Ele vai te passar uma senha provisória, e
            você escolhe uma nova ao entrar.
          </Text>
        )}

        {erro && <Text style={estilos.erro}>{erro}</Text>}

        <Pressable style={estilos.botao} onPress={handleEntrar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color={cores.sobrePrimaria} />
          ) : (
            <Text style={estilos.botaoTexto}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: c.fundo },
    conteudo: { width: '100%', maxWidth: 420, alignSelf: 'center' },
    titulo: { fontFamily: fontes.tituloLeve, fontSize: 20, color: c.texto, textAlign: 'center' },
    subtitulo: {
      fontFamily: fontes.texto,
      color: c.textoSuave,
      marginTop: 4,
      marginBottom: 24,
      textAlign: 'center',
    },
    label: { fontFamily: fontes.textoMedio, color: c.texto, marginBottom: 6, marginTop: 14 },
    input: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 12,
      color: c.texto,
      backgroundColor: c.superficie,
    },
    erro: { fontFamily: fontes.texto, color: c.erro, marginTop: 12 },
    esqueci: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 4 },
    esqueciTexto: { fontFamily: fontes.textoMedio, fontSize: 13, color: c.destaque },
    ajuda: { fontFamily: fontes.texto, fontSize: 13, color: c.textoSuave, lineHeight: 19, marginTop: 6 },
    botao: {
      backgroundColor: c.primaria,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 28,
    },
    botaoTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria, letterSpacing: 1 },
  });
