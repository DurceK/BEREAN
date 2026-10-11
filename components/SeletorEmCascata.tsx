import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';

export type ItemSelecionavel = { id: string; nome: string };

type Props = {
  titulo: string;
  itens: ItemSelecionavel[];
  valorSelecionado: string | null;
  onSelecionar: (id: string) => void;
  desabilitado?: boolean;
  tituloModalCriar: string;
  onCriar: (nome: string) => Promise<void>;
};

export function SeletorEmCascata({
  titulo,
  itens,
  valorSelecionado,
  onSelecionar,
  desabilitado,
  tituloModalCriar,
  onCriar,
}: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function confirmarCriacao() {
    if (!novoNome.trim()) return;
    setSalvando(true);
    await onCriar(novoNome.trim());
    setSalvando(false);
    setNovoNome('');
    setModalAberto(false);
  }

  return (
    <View style={estilos.linha}>
      <View style={estilos.campo}>
        <Text style={estilos.label}>{titulo}</Text>
        <View style={[estilos.pickerBorda, desabilitado && estilos.desabilitado]}>
          <Picker
            enabled={!desabilitado}
            selectedValue={valorSelecionado ?? ''}
            onValueChange={(valor) => valor && onSelecionar(String(valor))}
            style={estilos.picker}
            dropdownIconColor={cores.texto}
          >
            <Picker.Item label="Selecione..." value="" />
            {itens.map((item) => (
              <Picker.Item key={item.id} label={item.nome} value={item.id} />
            ))}
          </Picker>
        </View>
      </View>

      <Pressable
        style={[estilos.botaoAdicionar, desabilitado && estilos.desabilitado]}
        disabled={desabilitado}
        onPress={() => setModalAberto(true)}
        accessibilityLabel={tituloModalCriar}
      >
        <Text style={estilos.botaoAdicionarTexto}>+</Text>
      </Pressable>

      <Modal visible={modalAberto} transparent animationType="fade">
        <View style={estilos.modalFundo}>
          <View style={estilos.modalCaixa}>
            <Text style={estilos.modalTitulo}>{tituloModalCriar}</Text>
            <TextInput
              style={estilos.modalInput}
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Nome"
              placeholderTextColor={cores.textoSuave}
              autoFocus
            />
            <View style={estilos.modalBotoes}>
              <Pressable onPress={() => setModalAberto(false)}>
                <Text style={estilos.modalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmarCriacao} disabled={salvando}>
                <Text style={estilos.modalSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    linha: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
    campo: { flex: 1, minWidth: 0 },
    label: { fontFamily: fontes.textoMedio, color: c.texto, marginBottom: 6 },
    pickerBorda: {
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      backgroundColor: c.superficie,
      overflow: 'hidden',
    },
    picker: {
      color: c.texto,
      backgroundColor: c.superficie,
      fontFamily: fontes.texto,
      borderWidth: 0,
      padding: 10,
    },
    desabilitado: { opacity: 0.4 },
    botaoAdicionar: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: c.primaria,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botaoAdicionarTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria, fontSize: 22 },
    modalFundo: {
      flex: 1,
      backgroundColor: c.sobreposicao,
      justifyContent: 'center',
      padding: 24,
    },
    modalCaixa: {
      backgroundColor: c.fundo,
      borderRadius: 12,
      padding: 20,
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    modalTitulo: { fontFamily: fontes.tituloLeve, fontSize: 18, color: c.texto, marginBottom: 12 },
    modalInput: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 10,
      color: c.texto,
      backgroundColor: c.superficie,
      marginBottom: 16,
    },
    modalBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
    modalCancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    modalSalvar: { fontFamily: fontes.textoForte, color: c.destaque },
  });
