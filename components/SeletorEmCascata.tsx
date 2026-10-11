import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';

export type ItemSelecionavel = { id: string; nome: string };

// Cada ação devolve uma mensagem de erro, ou null quando deu certo.
type Acao<T extends unknown[]> = (...args: T) => Promise<string | null>;

type Props = {
  titulo: string;
  itens: ItemSelecionavel[];
  valorSelecionado: string | null;
  onSelecionar: (id: string) => void;
  desabilitado?: boolean;
  tituloModalCriar: string;
  tituloModalRenomear: string;
  avisoApagar: string;
  onCriar: Acao<[nome: string]>;
  onRenomear: Acao<[id: string, nome: string]>;
  onApagar: Acao<[id: string]>;
};

type Janela = 'criar' | 'renomear' | 'apagar' | null;

export function SeletorEmCascata({
  titulo,
  itens,
  valorSelecionado,
  onSelecionar,
  desabilitado,
  tituloModalCriar,
  tituloModalRenomear,
  avisoApagar,
  onCriar,
  onRenomear,
  onApagar,
}: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [janela, setJanela] = useState<Janela>(null);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const selecionado = itens.find((item) => item.id === valorSelecionado) ?? null;
  const semSelecao = desabilitado || !selecionado;

  function abrir(qual: Exclude<Janela, null>) {
    setErro(null);
    setNome(qual === 'renomear' ? (selecionado?.nome ?? '') : '');
    setJanela(qual);
  }

  function fechar() {
    setJanela(null);
    setErro(null);
  }

  async function confirmar() {
    if (janela !== 'apagar' && !nome.trim()) return;

    setSalvando(true);
    let falha: string | null = null;
    if (janela === 'criar') falha = await onCriar(nome.trim());
    else if (janela === 'renomear' && selecionado) falha = await onRenomear(selecionado.id, nome.trim());
    else if (janela === 'apagar' && selecionado) falha = await onApagar(selecionado.id);
    setSalvando(false);

    if (falha) setErro(falha);
    else fechar();
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

      <View style={estilos.botoes}>
        <Pressable
          style={[estilos.botao, estilos.botaoPrincipal, desabilitado && estilos.desabilitado]}
          disabled={desabilitado}
          onPress={() => abrir('criar')}
          accessibilityLabel={tituloModalCriar}
        >
          <Text style={estilos.botaoPrincipalTexto}>+</Text>
        </Pressable>
        <Pressable
          style={[estilos.botao, semSelecao && estilos.desabilitado]}
          disabled={semSelecao}
          onPress={() => abrir('renomear')}
          accessibilityLabel={tituloModalRenomear}
        >
          <Text style={estilos.botaoTexto}>✎</Text>
        </Pressable>
        <Pressable
          style={[estilos.botao, semSelecao && estilos.desabilitado]}
          disabled={semSelecao}
          onPress={() => abrir('apagar')}
          accessibilityLabel={`Apagar ${titulo.toLowerCase()}`}
        >
          <Text style={[estilos.botaoTexto, { color: cores.erro }]}>✕</Text>
        </Pressable>
      </View>

      <Modal visible={janela !== null} transparent animationType="fade" onRequestClose={fechar}>
        <View style={estilos.modalFundo}>
          <View style={estilos.modalCaixa}>
            {janela === 'apagar' ? (
              <>
                <Text style={estilos.modalTitulo}>Apagar “{selecionado?.nome}”?</Text>
                <Text style={estilos.modalAviso}>{avisoApagar}</Text>
              </>
            ) : (
              <>
                <Text style={estilos.modalTitulo}>
                  {janela === 'criar' ? tituloModalCriar : tituloModalRenomear}
                </Text>
                <TextInput
                  style={estilos.modalInput}
                  value={nome}
                  onChangeText={setNome}
                  onSubmitEditing={confirmar}
                  placeholder="Nome"
                  placeholderTextColor={cores.textoSuave}
                  autoFocus
                />
              </>
            )}

            {erro && <Text style={estilos.modalErro}>{erro}</Text>}

            <View style={estilos.modalBotoes}>
              <Pressable onPress={fechar}>
                <Text style={estilos.modalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmar} disabled={salvando}>
                <Text style={[estilos.modalConfirmar, janela === 'apagar' && { color: cores.erro }]}>
                  {salvando ? 'Aguarde...' : janela === 'apagar' ? 'Apagar' : 'Salvar'}
                </Text>
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
    desabilitado: { opacity: 0.35 },
    botoes: { flexDirection: 'row', gap: 6 },
    botao: {
      width: 44,
      height: 44,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borda,
      backgroundColor: c.superficie,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botaoPrincipal: { backgroundColor: c.primaria, borderColor: c.primaria },
    botaoPrincipalTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria, fontSize: 22 },
    botaoTexto: { fontFamily: fontes.textoForte, color: c.texto, fontSize: 18 },
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
      maxWidth: 440,
      alignSelf: 'center',
    },
    modalTitulo: { fontFamily: fontes.tituloLeve, fontSize: 18, color: c.texto, marginBottom: 12 },
    modalAviso: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20, marginBottom: 16 },
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
    modalErro: { fontFamily: fontes.texto, color: c.erro, marginBottom: 12 },
    modalBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
    modalCancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    modalConfirmar: { fontFamily: fontes.textoForte, color: c.destaque },
  });
