import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { apagarArquivos, enviarArquivo } from '../../../lib/midias';
import { fontes, useEstilos, useTema, type Cores } from '../../../lib/tema';

type Midia = {
  id: string;
  tipo: string;
  ordem: number;
  caminho_storage: string | null;
  texto_origem: string | null;
  idioma?: string | null;
};

const IDIOMAS = [
  { valor: 'pt-BR', rotulo: 'Português' },
  { valor: 'en-US', rotulo: 'Inglês' },
];

const ROTULO_TIPO: Record<string, string> = {
  audio_gravado: 'Áudio gravado',
  audio_upload: 'Áudio enviado',
  audio_texto: 'Texto lido em voz',
  imagem: 'Foto',
  video: 'Vídeo',
};

export default function ConteudoAula() {
  const { aulaId } = useLocalSearchParams<{ aulaId: string }>();
  const { usuario } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);

  const [tituloAula, setTituloAula] = useState('');
  const [midias, setMidias] = useState<Midia[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modalTextoAberto, setModalTextoAberto] = useState(false);
  const [textoVoz, setTextoVoz] = useState('');
  const [idiomaTexto, setIdiomaTexto] = useState('pt-BR');
  const [midiaParaRemover, setMidiaParaRemover] = useState<Midia | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const [gravando, setGravando] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  async function carregarMidias() {
    const { data } = await supabase
      .from('midias')
      .select('id, tipo, ordem, caminho_storage, texto_origem')
      .eq('aula_id', aulaId)
      .order('ordem');
    setMidias(data ?? []);
  }

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [resAula, resMidias] = await Promise.all([
        supabase.from('aulas').select('titulo').eq('id', aulaId).single(),
        supabase
          .from('midias')
          .select('id, tipo, ordem, caminho_storage, texto_origem')
          .eq('aula_id', aulaId)
          .order('ordem'),
      ]);

      if (!cancelado) {
        setTituloAula(resAula.data?.titulo ?? '');
        setMidias(resMidias.data ?? []);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [aulaId]);

  async function criarMidia(campos: Partial<Midia> & { tipo: string }) {
    if (!usuario) return;
    const proximaOrdem = midias.reduce((maior, m) => Math.max(maior, m.ordem), -1) + 1;
    const { error } = await supabase.from('midias').insert({
      aula_id: aulaId,
      ordem: proximaOrdem,
      ...campos,
    });
    if (error) {
      setErro('Não foi possível salvar o item.');
    } else {
      await carregarMidias();
    }
  }

  async function moverMidia(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= midias.length) return;

    const novaLista = [...midias];
    [novaLista[indice], novaLista[destino]] = [novaLista[destino], novaLista[indice]];
    const renumerada = novaLista.map((m, posicao) => ({ ...m, ordem: posicao }));
    const mudaram = renumerada.filter((m) => midias.find((antiga) => antiga.id === m.id)?.ordem !== m.ordem);

    setMidias(renumerada);
    setErro(null);
    const resultados = await Promise.all(
      mudaram.map((m) => supabase.from('midias').update({ ordem: m.ordem }).eq('id', m.id))
    );
    if (resultados.some((r) => r.error)) {
      setErro('Não foi possível salvar a nova ordem.');
      await carregarMidias();
    }
  }

  async function confirmarRemocao() {
    if (!midiaParaRemover) return;
    setRemovendo(true);
    setErro(null);
    const { error } = await supabase.from('midias').delete().eq('id', midiaParaRemover.id);
    if (error) {
      setErro('Não foi possível remover o item.');
    } else if (midiaParaRemover.caminho_storage) {
      await apagarArquivos([midiaParaRemover.caminho_storage]);
    }
    setRemovendo(false);
    setMidiaParaRemover(null);
    await carregarMidias();
  }

  async function escolherFotoOuVideo() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro('Permissão de galeria negada.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (resultado.canceled) return;

    const item = resultado.assets[0];
    const ehVideo = item.type === 'video';
    const nomeArquivo = item.fileName ?? (ehVideo ? 'video.mp4' : 'foto.jpg');
    const contentType = item.mimeType ?? (ehVideo ? 'video/mp4' : 'image/jpeg');

    setEnviando(true);
    setErro(null);
    try {
      const caminho = await enviarArquivo(
        item.uri,
        usuario!.id,
        aulaId,
        nomeArquivo,
        contentType
      );
      await criarMidia({ tipo: ehVideo ? 'video' : 'imagem', caminho_storage: caminho });
    } catch {
      setErro('Não foi possível enviar o arquivo.');
    } finally {
      setEnviando(false);
    }
  }

  async function escolherAudioDoDispositivo() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (resultado.canceled) return;

    const arquivo = resultado.assets[0];

    setEnviando(true);
    setErro(null);
    try {
      const caminho = await enviarArquivo(
        arquivo.uri,
        usuario!.id,
        aulaId,
        arquivo.name,
        arquivo.mimeType ?? 'audio/mpeg'
      );
      await criarMidia({ tipo: 'audio_upload', caminho_storage: caminho });
    } catch {
      setErro('Não foi possível enviar o áudio.');
    } finally {
      setEnviando(false);
    }
  }

  async function iniciarGravacao() {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      setErro('Permissão de microfone negada.');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setGravando(true);
  }

  async function pararGravacao() {
    await audioRecorder.stop();
    setGravando(false);

    const uri = audioRecorder.uri;
    if (!uri || !usuario) return;

    setEnviando(true);
    setErro(null);
    try {
      const caminho = await enviarArquivo(
        uri,
        usuario.id,
        aulaId,
        `gravacao-${Date.now()}.m4a`,
        'audio/m4a'
      );
      await criarMidia({ tipo: 'audio_gravado', caminho_storage: caminho });
    } catch {
      setErro('Não foi possível salvar a gravação.');
    } finally {
      setEnviando(false);
    }
  }

  async function salvarTexto() {
    if (!textoVoz.trim()) return;
    await criarMidia({ tipo: 'audio_texto', texto_origem: textoVoz.trim(), idioma: idiomaTexto });
    setTextoVoz('');
    setModalTextoAberto(false);
  }

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{tituloAula}</Text>
      <Text style={styles.subtitulo}>Conteúdo da aula</Text>

      {midias.length === 0 && (
        <Text style={styles.vazio}>Esta aula ainda não tem conteúdo. Adicione o primeiro item abaixo.</Text>
      )}

      {midias.map((midia, indice) => (
        <View key={midia.id} style={styles.itemMidia}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTexto}>
              {indice + 1}. {ROTULO_TIPO[midia.tipo] ?? midia.tipo}
            </Text>
            {midia.tipo === 'audio_texto' && (
              <Text style={styles.itemPreview} numberOfLines={2}>
                {midia.texto_origem}
              </Text>
            )}
          </View>
          <View style={styles.itemAcoes}>
            <Pressable
              style={[styles.acao, indice === 0 && styles.acaoDesabilitada]}
              disabled={indice === 0}
              onPress={() => moverMidia(indice, -1)}
              accessibilityLabel="Subir"
            >
              <Text style={styles.acaoTexto}>↑</Text>
            </Pressable>
            <Pressable
              style={[styles.acao, indice === midias.length - 1 && styles.acaoDesabilitada]}
              disabled={indice === midias.length - 1}
              onPress={() => moverMidia(indice, 1)}
              accessibilityLabel="Descer"
            >
              <Text style={styles.acaoTexto}>↓</Text>
            </Pressable>
            <Pressable
              style={styles.acao}
              onPress={() => setMidiaParaRemover(midia)}
              accessibilityLabel="Remover"
            >
              <Text style={[styles.acaoTexto, { color: cores.erro }]}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Modal
        visible={midiaParaRemover !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMidiaParaRemover(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>
              Remover “{midiaParaRemover ? ROTULO_TIPO[midiaParaRemover.tipo] : ''}”?
            </Text>
            <Text style={styles.modalAviso}>
              O item sai da aula e o arquivo é apagado. Não dá para desfazer.
            </Text>
            <View style={styles.modalBotoes}>
              <Pressable onPress={() => setMidiaParaRemover(null)}>
                <Text style={styles.modalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmarRemocao} disabled={removendo}>
                <Text style={[styles.modalSalvar, { color: cores.erro }]}>
                  {removendo ? 'Aguarde...' : 'Remover'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {erro && <Text style={styles.erro}>{erro}</Text>}
      {enviando && <ActivityIndicator color={cores.primaria} style={{ marginVertical: 12 }} />}

      <Text style={styles.secaoTitulo}>Adicionar</Text>

      <Pressable style={styles.botao} onPress={escolherFotoOuVideo} disabled={enviando}>
        <Text style={styles.botaoTexto}>Foto ou vídeo</Text>
      </Pressable>

      <Pressable style={styles.botao} onPress={escolherAudioDoDispositivo} disabled={enviando}>
        <Text style={styles.botaoTexto}>Enviar áudio do dispositivo</Text>
      </Pressable>

      <Pressable
        style={[styles.botao, gravando && styles.botaoGravando]}
        onPress={gravando ? pararGravacao : iniciarGravacao}
        disabled={enviando}
      >
        <Text style={styles.botaoTexto}>{gravando ? 'Parar gravação' : 'Gravar áudio'}</Text>
      </Pressable>

      <Pressable
        style={styles.botao}
        onPress={() => setModalTextoAberto(true)}
        disabled={enviando}
      >
        <Text style={styles.botaoTexto}>Escrever texto (voz)</Text>
      </Pressable>

      <Modal visible={modalTextoAberto} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Texto que a voz vai ler</Text>
            <TextInput
              style={styles.modalInput}
              value={textoVoz}
              onChangeText={setTextoVoz}
              placeholder="Digite o texto"
              placeholderTextColor={cores.textoSuave}
              multiline
              autoFocus
            />
            <Text style={styles.idiomaRotulo}>Idioma da voz</Text>
            <View style={styles.idiomas}>
              {IDIOMAS.map((opcao) => (
                <Pressable
                  key={opcao.valor}
                  style={[styles.idioma, idiomaTexto === opcao.valor && styles.idiomaAtivo]}
                  onPress={() => setIdiomaTexto(opcao.valor)}
                >
                  <Text
                    style={[
                      styles.idiomaTexto,
                      idiomaTexto === opcao.valor && styles.idiomaTextoAtivo,
                    ]}
                  >
                    {opcao.rotulo}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalBotoes}>
              <Pressable onPress={() => setModalTextoAberto(false)}>
                <Text style={styles.modalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={salvarTexto}>
                <Text style={styles.modalSalvar}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: { padding: 24, width: '100%', maxWidth: 720, alignSelf: 'center' },
    titulo: { fontFamily: fontes.titulo, fontSize: 22, color: c.texto },
    subtitulo: { fontFamily: fontes.texto, color: c.textoSuave, marginTop: 4, marginBottom: 20 },
    vazio: { fontFamily: fontes.texto, color: c.textoSuave, marginBottom: 12, lineHeight: 20 },
    itemMidia: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.superficie,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.borda,
    },
    itemInfo: { flex: 1, minWidth: 0 },
    itemAcoes: { flexDirection: 'row', gap: 6 },
    acao: {
      width: 36,
      height: 36,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.borda,
      alignItems: 'center',
      justifyContent: 'center',
    },
    acaoDesabilitada: { opacity: 0.3 },
    acaoTexto: { fontFamily: fontes.textoForte, color: c.texto, fontSize: 16 },
    modalAviso: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20, marginBottom: 16 },
    itemTexto: { fontFamily: fontes.textoForte, color: c.texto },
    itemPreview: { fontFamily: fontes.texto, color: c.textoSuave, marginTop: 4 },
    erro: { fontFamily: fontes.texto, color: c.erro, marginBottom: 12 },
    secaoTitulo: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginTop: 20,
      marginBottom: 10,
    },
    botao: {
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginBottom: 10,
    },
    botaoGravando: { borderColor: c.erro, borderWidth: 2 },
    botaoTexto: { fontFamily: fontes.textoMedio, color: c.texto },
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
      maxWidth: 520,
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
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
    modalCancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    modalSalvar: { fontFamily: fontes.textoForte, color: c.destaque },
    idiomaRotulo: { fontFamily: fontes.textoMedio, color: c.texto, marginBottom: 8 },
    idiomas: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    idioma: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borda,
    },
    idiomaAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
    idiomaTexto: { fontFamily: fontes.textoMedio, color: c.texto },
    idiomaTextoAtivo: { color: c.sobrePrimaria },
  });
