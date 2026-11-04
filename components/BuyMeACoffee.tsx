// "Buy Me a Coffee": apoio voluntário ao mentor por Pix.
// O aluno vê o botão; o mentor cadastra a chave. Contribuir é sempre opcional.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BotaoCopiar } from './BotaoCopiar';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';

// Cores da marca "Buy Me a Coffee" (amarelo e quase preto), iguais nos dois temas
const AMARELO = '#FFDD00';
const ESCURO = '#0D0C22';

export type ChaveDoMentor = { mentor: string; chave: string };

// Botão do aluno: xícara + "Buy Me a Coffee". Abre a janela com a(s) chave(s) Pix.
export function BotaoBuyMeACoffee({ chaves }: { chaves: ChaveDoMentor[] }) {
  const estilos = useEstilos(criarEstilos);
  const [aberto, setAberto] = useState(false);
  if (chaves.length === 0) return null;

  return (
    <>
      <Pressable
        style={estilos.botao}
        onPress={() => setAberto(true)}
        accessibilityLabel="Buy Me a Coffee: apoiar o curso com qualquer valor"
      >
        <Ionicons name="cafe" size={16} color={ESCURO} />
        <Text style={estilos.botaoTexto}>Buy Me a Coffee</Text>
      </Pressable>

      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={() => setAberto(false)}
      >
        <View style={estilos.fundo}>
          <View style={estilos.caixa}>
            <Ionicons name="cafe" size={36} color={AMARELO} style={estilos.xicara} />
            <Text style={estilos.titulo}>Buy Me a Coffee</Text>
            <Text style={[estilos.texto, estilos.destaqueGratuito]}>
              Este curso é gratuito e vai continuar assim para todos!!!
            </Text>
            <Text style={estilos.texto}>
              O <Text style={estilos.destaqueGratuito}>Buy me a Coffee</Text> é um convite a apoiar
              o curso, sem obrigação nenhuma.
            </Text>
            <Text style={estilos.texto}>
              Seja um <Text style={estilos.destaqueGratuito}>Mantenedor</Text> que contribui para
              que outros possam cumprir seu propósito.
            </Text>
            <Text style={estilos.texto}>Use a chave Pix abaixo.</Text>

            {chaves.map((c) => (
              <View key={c.chave} style={estilos.chave}>
                {chaves.length > 1 && <Text style={estilos.mentor}>{c.mentor}</Text>}
                <View style={estilos.linha}>
                  <Text style={estilos.chaveTexto} selectable numberOfLines={2}>
                    {c.chave}
                  </Text>
                  <BotaoCopiar texto={c.chave} rotulo="chave Pix" />
                </View>
              </View>
            ))}

            <Text style={estilos.textoSuave}>Obrigado por estudar! 🙏</Text>

            <Pressable onPress={() => setAberto(false)} style={estilos.fechar}>
              <Text style={estilos.fecharTexto}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Janela do mentor: cadastrar, trocar ou apagar a chave Pix (em branco = desliga o botão)
export function JanelaChavePix({
  valorInicial,
  onSalvar,
  onFechar,
}: {
  valorInicial: string;
  onSalvar: (chave: string | null) => Promise<string | null>;
  onFechar: () => void;
}) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [chave, setChave] = useState(valorInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const falha = await onSalvar(chave.trim() || null);
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={estilos.fundo}>
        <View style={estilos.caixa}>
          <Ionicons name="cafe" size={32} color={AMARELO} style={estilos.xicara} />
          <Text style={estilos.titulo}>Buy Me a Coffee</Text>
          <Text style={estilos.texto}>
            Seus alunos veem um botão para apoiar o curso por Pix, com qualquer valor. Use uma chave
            aleatória do seu banco, para não expor CPF ou telefone. Deixe em branco para esconder o
            botão.
          </Text>
          <TextInput
            style={estilos.input}
            value={chave}
            onChangeText={(t) => {
              setChave(t);
              setErro(null);
            }}
            placeholder="Chave Pix aleatória"
            placeholderTextColor={cores.textoSuave}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={140}
          />
          {erro && <Text style={estilos.erro}>{erro}</Text>}
          <View style={estilos.botoes}>
            <Pressable onPress={onFechar}>
              <Text style={estilos.cancelar}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={salvar} disabled={salvando}>
              <Text style={estilos.salvar}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    botao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      alignSelf: 'center',
      backgroundColor: AMARELO,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 14,
      marginTop: 12,
    },
    botaoTexto: { fontFamily: fontes.textoForte, fontSize: 13, color: ESCURO },
    fundo: {
      flex: 1,
      backgroundColor: c.sobreposicao,
      justifyContent: 'center',
      padding: 24,
    },
    caixa: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      backgroundColor: c.superficie,
      borderRadius: 16,
      padding: 20,
      gap: 10,
    },
    xicara: { alignSelf: 'center' },
    titulo: { fontFamily: fontes.tituloLeve, fontSize: 20, color: c.texto, textAlign: 'center' },
    texto: { fontFamily: fontes.texto, color: c.texto, lineHeight: 21, textAlign: 'center' },
    destaqueGratuito: { fontFamily: fontes.textoForte },
    textoSuave: {
      fontFamily: fontes.texto,
      fontSize: 13,
      color: c.textoSuave,
      textAlign: 'center',
    },
    chave: { gap: 4, marginTop: 6 },
    mentor: { fontFamily: fontes.textoMedio, fontSize: 12, color: c.textoSuave },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chaveTexto: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontes.textoForte,
      color: c.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 10,
    },
    input: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 12,
      color: c.texto,
      backgroundColor: c.fundo,
    },
    erro: { fontFamily: fontes.texto, color: c.erro },
    botoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 8 },
    cancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    salvar: { fontFamily: fontes.textoForte, color: c.destaque },
    fechar: { alignSelf: 'center', padding: 8, marginTop: 4 },
    fecharTexto: { fontFamily: fontes.textoForte, color: c.destaque },
  });
