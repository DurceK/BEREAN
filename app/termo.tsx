import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../lib/auth';
import { textoDoTermo } from '../lib/termo';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';

// Primeiro acesso do aluno: lê o termo e aceita. Se for menor de idade, quem aceita é o
// responsável, informando o próprio nome (LGPD art. 14).
export default function Termo() {
  const { usuario, aceitarTermo, sair } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const insets = useSafeAreaInsets();
  const [marcado, setMarcado] = useState(false);
  const [responsavel, setResponsavel] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const menor = !!usuario?.menorDeIdade;
  const pronto = marcado && (!menor || responsavel.trim().length >= 3);

  async function aceitar() {
    if (!pronto) return;
    setErro(null);
    setEnviando(true);
    const { erro } = await aceitarTermo(menor ? responsavel.trim() : null);
    setEnviando(false);
    if (erro) setErro(erro);
  }

  return (
    <ScrollView
      style={estilos.fundo}
      contentContainerStyle={[estilos.container, { paddingTop: insets.top + 24 }]}
    >
      <Text style={estilos.titulo}>Antes de começar</Text>
      <Text style={estilos.subtitulo}>
        {menor
          ? `Peça para o seu pai, mãe ou responsável ler com você e autorizar.`
          : 'Leia como usamos os seus dados e aceite para continuar.'}
      </Text>

      <View style={estilos.cartao}>
        {textoDoTermo().map((secao) => (
          <View key={secao.titulo} style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>{secao.titulo}</Text>
            <Text style={estilos.secaoTexto}>{secao.texto}</Text>
          </View>
        ))}
      </View>

      {menor && (
        <>
          <Text style={estilos.label}>Nome completo do responsável</Text>
          <TextInput
            style={estilos.input}
            value={responsavel}
            onChangeText={setResponsavel}
            placeholder="Ex: Maria da Silva"
            placeholderTextColor={cores.textoSuave}
            autoCapitalize="words"
          />
        </>
      )}

      <Pressable
        style={estilos.aceite}
        onPress={() => setMarcado((m) => !m)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcado }}
      >
        <Ionicons
          name={marcado ? 'checkbox' : 'square-outline'}
          size={24}
          color={marcado ? cores.destaque : cores.textoSuave}
        />
        <Text style={estilos.aceiteTexto}>
          {menor
            ? `Sou pai, mãe ou responsável legal por ${usuario?.nome} e autorizo o uso dos dados como descrito acima.`
            : 'Li e aceito o uso dos meus dados como descrito acima.'}
        </Text>
      </Pressable>

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      <Pressable
        style={[estilos.botao, (!pronto || enviando) && estilos.desabilitado]}
        disabled={!pronto || enviando}
        onPress={aceitar}
      >
        {enviando ? (
          <ActivityIndicator color={cores.sobrePrimaria} />
        ) : (
          <Text style={estilos.botaoTexto}>Aceitar e continuar</Text>
        )}
      </Pressable>

      <Pressable onPress={sair} style={estilos.sair}>
        <Text style={estilos.sairTexto}>Agora não (sair)</Text>
      </Pressable>
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: { padding: 24, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
    titulo: { fontFamily: fontes.titulo, fontSize: 24, color: c.texto, textAlign: 'center' },
    subtitulo: {
      fontFamily: fontes.texto,
      color: c.textoSuave,
      textAlign: 'center',
      lineHeight: 20,
    },
    cartao: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      padding: 16,
      gap: 14,
    },
    secao: { gap: 4 },
    secaoTitulo: { fontFamily: fontes.textoForte, color: c.destaque },
    secaoTexto: { fontFamily: fontes.texto, color: c.texto, lineHeight: 21 },
    label: { fontFamily: fontes.textoMedio, color: c.texto, marginTop: 4 },
    input: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 12,
      color: c.texto,
      backgroundColor: c.superficie,
    },
    aceite: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    aceiteTexto: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontes.textoMedio,
      color: c.texto,
      lineHeight: 21,
    },
    erro: { fontFamily: fontes.texto, color: c.erro },
    botao: {
      backgroundColor: c.primaria,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    botaoTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria, letterSpacing: 1 },
    desabilitado: { opacity: 0.4 },
    sair: { alignSelf: 'center', padding: 8 },
    sairTexto: { fontFamily: fontes.textoMedio, color: c.textoSuave },
  });
