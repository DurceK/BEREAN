import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

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
    <View style={styles.linha}>
      <View style={styles.campo}>
        <Text style={styles.label}>{titulo}</Text>
        <View style={[styles.pickerBorda, desabilitado && styles.desabilitado]}>
          <Picker
            enabled={!desabilitado}
            selectedValue={valorSelecionado ?? ''}
            onValueChange={(valor) => valor && onSelecionar(String(valor))}
          >
            <Picker.Item label="Selecione..." value="" />
            {itens.map((item) => (
              <Picker.Item key={item.id} label={item.nome} value={item.id} />
            ))}
          </Picker>
        </View>
      </View>

      <Pressable
        style={[styles.botaoAdicionar, desabilitado && styles.desabilitado]}
        disabled={desabilitado}
        onPress={() => setModalAberto(true)}
      >
        <Text style={styles.botaoAdicionarTexto}>+</Text>
      </Pressable>

      <Modal visible={modalAberto} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>{tituloModalCriar}</Text>
            <TextInput
              style={styles.modalInput}
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Nome"
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.modalBotoes}>
              <Pressable onPress={() => setModalAberto(false)}>
                <Text style={styles.modalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmarCriacao} disabled={salvando}>
                <Text style={styles.modalSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  campo: { flex: 1 },
  label: { color: '#ccc', marginBottom: 4 },
  pickerBorda: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  desabilitado: { opacity: 0.4 },
  botaoAdicionar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1db954',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  botaoAdicionarTexto: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCaixa: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20 },
  modalTitulo: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    marginBottom: 16,
  },
  modalBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
  modalCancelar: { color: '#999' },
  modalSalvar: { color: '#1db954', fontWeight: 'bold' },
});
