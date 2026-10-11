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
import { enviarArquivo } from '../../../lib/midias';
import { fontes, useEstilos, useTema, type Cores } from '../../../lib/tema';

type Midia = {
  id: string;
  tipo: string;
  ordem: number;
  caminho_storage: string | null;
  texto_origem: string | null;
};

const ROTULO_TIPO: Record<string, string> = {
  audio_gravado: 'Áudio gravado',
  audio_upload: 'Áudio enviado',
  audio_texto: 'Texto lido em voz',
  imagem: 'Foto',
  video: 'Vídeo',
};

export default function ConteudoSessao() {
  const { sessaoId } = useLocalSearchParams<{ sessaoId: string }>();
  const { perfil } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);

  const [tituloSessao, setTituloSessao] = useState('');
  const [midias, setMidias] = useState<Midia[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modalTextoAberto, setModalTextoAberto] = useState(false);
  const [textoVoz, setTextoVoz] = useState('');

  const [gravando, setGravando] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  async function carregarMidias() {
    const { data } = await supabase
      .from('midias')
      .select('id, tipo, ordem, caminho_storage, texto_origem')
      .eq('sessao_id', sessaoId)
      .order('ordem');
    setMidias(data ?? []);
  }

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [resSessao, resMidias] = await Promise.all([
        supabase.from('sessoes').select('titulo').eq('id', sessaoId).single(),
        supabase
          .from('midias')
          .select('id, tipo, ordem, caminho_storage, texto_origem')
          .eq('sessao_id', sessaoId)
          .order('ordem'),
      ]);

      if (!cancelado) {
        setTituloSessao(resSessao.data?.titulo ?? '');
        setMidias(resMidias.data ?? []);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [sessaoId]);

  async function criarMidia(campos: Partial<Midia> & { tipo: string }) {
    if (!perfil) return;
    const { error } = await supabase.from('midias').insert({
      sessao_id: sessaoId,
      ordem: midias.length,
      ...campos,
    });
    if (error) {
      setErro('Não foi possível salvar o item.');
    } else {
      await carregarMidias();
    }
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
        perfil!.id,
        sessaoId,
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
        perfil!.id,
        sessaoId,
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
    if (!uri || !perfil) return;

    setEnviando(true);
    setErro(null);
    try {
      const caminho = await enviarArquivo(
        uri,
        perfil.id,
        sessaoId,
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
    await criarMidia({ tipo: 'audio_texto', texto_origem: textoVoz.trim() });
    setTextoVoz('');
    setModalTextoAberto(false);
  }

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{tituloSessao}</Text>
      <Text style={styles.subtitulo}>Conteúdo da sessão</Text>

      {midias.map((midia) => (
        <View key={midia.id} style={styles.itemMidia}>
          <Text style={styles.itemTexto}>{ROTULO_TIPO[midia.tipo] ?? midia.tipo}</Text>
          {midia.tipo === 'audio_texto' && (
            <Text style={styles.itemPreview} numberOfLines={2}>
              {midia.texto_origem}
            </Text>
          )}
        </View>
      ))}

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
    itemMidia: {
      backgroundColor: c.superficie,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.borda,
    },
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
  });
