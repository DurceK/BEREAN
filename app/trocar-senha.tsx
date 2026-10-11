import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';
import { Marca } from '../components/Marca';

export default function TrocarSenha() {
  const { trocarSenha } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
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
    <View style={estilos.container}>
      <View style={estilos.conteudo}>
        <Marca />

        <Text style={estilos.titulo}>Crie sua senha</Text>
        <Text style={estilos.subtitulo}>
          Você entrou com uma senha provisória. Escolha uma nova senha antes de continuar.
        </Text>

        <Text style={estilos.label}>Nova senha</Text>
        <TextInput
          style={estilos.input}
          value={novaSenha}
          onChangeText={setNovaSenha}
          secureTextEntry
          placeholder="Nova senha"
          placeholderTextColor={cores.textoSuave}
        />

        <Text style={estilos.label}>Confirmar senha</Text>
        <TextInput
          style={estilos.input}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          secureTextEntry
          placeholder="Confirme a nova senha"
          placeholderTextColor={cores.textoSuave}
        />

        {erro && <Text style={estilos.erro}>{erro}</Text>}

        <Pressable style={estilos.botao} onPress={handleTrocar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color={cores.sobrePrimaria} />
          ) : (
            <Text style={estilos.botaoTexto}>Salvar senha</Text>
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
      lineHeight: 20,
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
    botao: {
      backgroundColor: c.primaria,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 28,
    },
    botaoTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria, letterSpacing: 1 },
  });
