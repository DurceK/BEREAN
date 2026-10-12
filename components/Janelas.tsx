// Janelas (modais) reaproveitáveis. Funcionam também no navegador, onde os alertas
// nativos do celular não aparecem.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from 'react-native';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';

// Cada ação devolve uma mensagem de erro, ou null quando deu certo (a janela fecha).
type Acao<T extends unknown[]> = (...args: T) => Promise<string | null>;

export function JanelaNome({
  titulo,
  valorInicial = '',
  placeholder = 'Nome',
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  valorInicial?: string;
  placeholder?: string;
  onConfirmar: Acao<[nome: string]>;
  onFechar: () => void;
}) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [nome, setNome] = useState(valorInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    const falha = await onConfirmar(nome.trim());
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={estilos.fundo}>
        <View style={estilos.caixa}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <TextInput
            style={estilos.input}
            value={nome}
            onChangeText={setNome}
            onSubmitEditing={confirmar}
            placeholder={placeholder}
            placeholderTextColor={cores.textoSuave}
            autoFocus
          />
          {erro && <Text style={estilos.erro}>{erro}</Text>}
          <View style={estilos.botoes}>
            <Pressable onPress={onFechar}>
              <Text style={estilos.cancelar}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={confirmar} disabled={salvando}>
              <Text style={estilos.confirmar}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function JanelaConfirmar({
  titulo,
  aviso,
  textoConfirmar = 'Apagar',
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  aviso: string;
  textoConfirmar?: string;
  onConfirmar: Acao<[]>;
  onFechar: () => void;
}) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    if (trabalhando) return;
    setTrabalhando(true);
    const falha = await onConfirmar();
    setTrabalhando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={estilos.fundo}>
        <View style={estilos.caixa}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Text style={estilos.aviso}>{aviso}</Text>
          {erro && <Text style={estilos.erro}>{erro}</Text>}
          <View style={estilos.botoes}>
            <Pressable onPress={onFechar}>
              <Text style={estilos.cancelar}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={confirmar} disabled={trabalhando}>
              <Text style={[estilos.confirmar, { color: cores.erro }]}>
                {trabalhando ? 'Aguarde...' : textoConfirmar}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.sobreposicao, justifyContent: 'center', padding: 24 },
    caixa: {
      backgroundColor: c.fundo,
      borderRadius: 12,
      padding: 20,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
    },
    titulo: { fontFamily: fontes.tituloLeve, fontSize: 18, color: c.texto, marginBottom: 12 },
    aviso: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20, marginBottom: 16 },
    input: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 10,
      color: c.texto,
      backgroundColor: c.superficie,
      marginBottom: 16,
    },
    erro: { fontFamily: fontes.texto, color: c.erro, marginBottom: 12 },
    botoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
    cancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    confirmar: { fontFamily: fontes.textoForte, color: c.destaque },
  });
