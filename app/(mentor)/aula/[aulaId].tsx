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
  Platform,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder,
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  setAudioModeAsync,
  type RecordingOptions,
} from 'expo-audio';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { apagarArquivos, enviarArquivo } from '../../../lib/midias';
import { extrairIdYoutube, linkYoutube } from '../../../lib/youtube';
import { FOTO_AULA, otimizarImagem } from '../../../lib/imagem';
import { fontes, useEstilos, useTema, type Cores } from '../../../lib/tema';

type Midia = {
  id: string;
  tipo: string;
  ordem: number;
  caminho_storage: string | null;
  texto_origem: string | null;
  idioma?: string | null;
  titulo?: string | null;
  url_externa?: string | null;
};

// Gravação em qualidade de voz: mono, 64 kbps (~0,5 MB por minuto, metade do padrão de música).
// Economiza espaço e transferência no Supabase sem perda perceptível para fala.
// O ajuste pronto LOW_QUALITY do expo-audio não serve: no Android grava em AMR, abafado.
const GRAVACAO_VOZ: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

// Áudio enviado de arquivo: limite de tamanho (o mesmo vale no servidor, patch 14)
const LIMITE_AUDIO_MB = 30;
const LIMITE_AUDIO_BYTES = LIMITE_AUDIO_MB * 1_048_576;

// Alguns celulares não informam o tipo do arquivo; descobre pela extensão,
// porque o servidor só aceita arquivos de áudio e imagem.
function tipoDeAudio(nome: string, informado?: string | null) {
  if (informado?.startsWith('audio/')) return informado;
  const extensao = nome.split('.').pop()?.toLowerCase();
  const tipos: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    wav: 'audio/wav',
    webm: 'audio/webm',
  };
  return tipos[extensao ?? ''] ?? 'audio/mpeg';
}

// No navegador a gravação sai em WebM; no celular, em M4A
const ARQUIVO_GRAVACAO =
  Platform.OS === 'web'
    ? { extensao: 'webm', tipo: 'audio/webm' }
    : { extensao: 'm4a', tipo: 'audio/mp4' };

const COLUNAS = 'id, tipo, ordem, caminho_storage, texto_origem, titulo, url_externa';

const IDIOMAS = [
  { valor: 'pt-BR', rotulo: 'Português' },
  { valor: 'en-US', rotulo: 'Inglês' },
];

const ROTULO_TIPO: Record<string, string> = {
  audio_gravado: 'Áudio gravado',
  audio_upload: 'Áudio enviado',
  audio_texto: 'Texto lido em voz',
  imagem: 'Foto',
  video: 'Vídeo enviado',
  youtube: 'Vídeo do YouTube',
  exercicio: 'Exercício de múltipla escolha',
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
  const [modalYoutubeAberto, setModalYoutubeAberto] = useState(false);
  const [linkVideo, setLinkVideo] = useState('');
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [textoVoz, setTextoVoz] = useState('');
  const [idiomaTexto, setIdiomaTexto] = useState('pt-BR');
  const [midiaParaRemover, setMidiaParaRemover] = useState<Midia | null>(null);
  const [removendo, setRemovendo] = useState(false);
  // Título que vai junto com o próximo item adicionado
  const [tituloNovo, setTituloNovo] = useState('');
  const [midiaParaRenomear, setMidiaParaRenomear] = useState<Midia | null>(null);
  const [tituloEditado, setTituloEditado] = useState('');

  const [gravando, setGravando] = useState(false);
  const audioRecorder = useAudioRecorder(GRAVACAO_VOZ);

  async function carregarMidias() {
    const { data } = await supabase
      .from('midias')
      .select(COLUNAS)
      .eq('aula_id', aulaId)
      .order('ordem');
    setMidias(data ?? []);
  }

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [resAula, resMidias] = await Promise.all([
        supabase.from('aulas').select('titulo').eq('id', aulaId).single(),
        supabase.from('midias').select(COLUNAS).eq('aula_id', aulaId).order('ordem'),
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

  // Cria o exercício (vazio) e abre a tela para montar as perguntas
  async function criarExercicio() {
    if (!usuario) return;
    setErro(null);
    const proximaOrdem = midias.reduce((maior, m) => Math.max(maior, m.ordem), -1) + 1;
    const { data, error } = await supabase
      .from('midias')
      .insert({
        aula_id: aulaId,
        ordem: proximaOrdem,
        tipo: 'exercicio',
        titulo: tituloNovo.trim() || null,
      })
      .select('id')
      .single();
    if (error || !data) {
      setErro('Não foi possível criar o exercício.');
      return;
    }
    setTituloNovo('');
    await carregarMidias();
    router.push(`/(mentor)/exercicio/${data.id}`);
  }

  async function criarMidia(campos: Partial<Midia> & { tipo: string }) {
    if (!usuario) return;
    const proximaOrdem = midias.reduce((maior, m) => Math.max(maior, m.ordem), -1) + 1;
    const { error } = await supabase.from('midias').insert({
      aula_id: aulaId,
      ordem: proximaOrdem,
      titulo: tituloNovo.trim() || null,
      ...campos,
    });
    if (error) {
      setErro('Não foi possível salvar o item.');
    } else {
      setTituloNovo('');
      await carregarMidias();
    }
  }

  function abrirRenomear(midia: Midia) {
    setTituloEditado(midia.titulo ?? '');
    setMidiaParaRenomear(midia);
  }

  async function salvarTitulo() {
    if (!midiaParaRenomear) return;
    setErro(null);
    const { error } = await supabase
      .from('midias')
      .update({ titulo: tituloEditado.trim() || null })
      .eq('id', midiaParaRenomear.id);
    if (error) setErro('Não foi possível salvar o título.');
    setMidiaParaRenomear(null);
    await carregarMidias();
  }

  async function moverMidia(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= midias.length) return;

    const novaLista = [...midias];
    [novaLista[indice], novaLista[destino]] = [novaLista[destino], novaLista[indice]];
    const renumerada = novaLista.map((m, posicao) => ({ ...m, ordem: posicao }));
    const mudaram = renumerada.filter(
      (m) => midias.find((antiga) => antiga.id === m.id)?.ordem !== m.ordem
    );

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

  // Vídeos não são enviados para o Storage (ocupam muito espaço): vão por link do YouTube
  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro('Permissão de galeria negada.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (resultado.canceled) return;

    const item = resultado.assets[0];

    setEnviando(true);
    setErro(null);
    try {
      // Reduz para no máximo 1280 px e comprime em JPEG antes de enviar
      const reduzida = await otimizarImagem(item.uri, item.width, item.height, FOTO_AULA);
      const caminho = await enviarArquivo(reduzida, usuario!.id, aulaId, 'foto.jpg', 'image/jpeg');
      await criarMidia({ tipo: 'imagem', caminho_storage: caminho });
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

    // Áudio pronto não dá para comprimir no aparelho: limita o tamanho
    if (arquivo.size && arquivo.size > LIMITE_AUDIO_BYTES) {
      setErro(
        `Este áudio tem ${Math.round(arquivo.size / 1_048_576)} MB; o limite é ${LIMITE_AUDIO_MB} MB. ` +
          'Grave pelo botão "Gravar áudio" (que já salva compactado) ou exporte o arquivo em MP3 ou M4A com qualidade de voz.'
      );
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const caminho = await enviarArquivo(
        arquivo.uri,
        usuario!.id,
        aulaId,
        arquivo.name,
        tipoDeAudio(arquivo.name, arquivo.mimeType)
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
        `gravacao-${Date.now()}.${ARQUIVO_GRAVACAO.extensao}`,
        ARQUIVO_GRAVACAO.tipo
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

  async function salvarYoutube() {
    const id = extrairIdYoutube(linkVideo);
    if (!id) {
      setErroLink('Esse link não é de um vídeo do YouTube. Copie o endereço do vídeo e cole aqui.');
      return;
    }
    await criarMidia({ tipo: 'youtube', url_externa: linkYoutube(id) });
    setLinkVideo('');
    setErroLink(null);
    setModalYoutubeAberto(false);
  }

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{tituloAula}</Text>
      <Text style={styles.subtitulo}>Conteúdo da aula</Text>

      <Link href={`/(mentor)/previa/${aulaId}`} asChild>
        <Pressable style={styles.botaoPrevia}>
          <Text style={styles.botaoPreviaTexto}>Ver como o aluno vê ›</Text>
        </Pressable>
      </Link>

      {midias.length === 0 && (
        <Text style={styles.vazio}>
          Esta aula ainda não tem conteúdo. Adicione o primeiro item abaixo.
        </Text>
      )}

      {midias.map((midia, indice) => (
        <View key={midia.id} style={styles.itemMidia}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTexto}>
              {indice + 1}. {midia.titulo || ROTULO_TIPO[midia.tipo] || midia.tipo}
            </Text>
            {!!midia.titulo && <Text style={styles.itemTipo}>{ROTULO_TIPO[midia.tipo]}</Text>}
            {midia.tipo === 'audio_texto' && (
              <Text style={styles.itemPreview} numberOfLines={2}>
                {midia.texto_origem}
              </Text>
            )}
            {midia.tipo === 'youtube' && (
              <Text style={styles.itemPreview} numberOfLines={1}>
                {midia.url_externa}
              </Text>
            )}
            {midia.tipo === 'exercicio' && (
              <Link href={`/(mentor)/exercicio/${midia.id}`} asChild>
                <Pressable>
                  <Text style={styles.itemLink}>Editar perguntas ›</Text>
                </Pressable>
              </Link>
            )}
          </View>
          <View style={styles.itemAcoes}>
            <Pressable
              style={styles.acao}
              onPress={() => abrirRenomear(midia)}
              accessibilityLabel={midia.titulo ? 'Trocar título' : 'Dar um título'}
            >
              <Text style={styles.acaoTexto}>✎</Text>
            </Pressable>
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
              Remover “
              {midiaParaRemover
                ? midiaParaRemover.titulo || ROTULO_TIPO[midiaParaRemover.tipo]
                : ''}
              ”?
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

      <Modal
        visible={midiaParaRenomear !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMidiaParaRenomear(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Título do conteúdo</Text>
            <TextInput
              style={styles.campoTitulo}
              value={tituloEditado}
              onChangeText={setTituloEditado}
              onSubmitEditing={salvarTitulo}
              placeholder="Ex: Diálogo no aeroporto"
              placeholderTextColor={cores.textoSuave}
              autoFocus
            />
            <Text style={styles.dica}>Deixe em branco para não mostrar título.</Text>
            <View style={styles.modalBotoes}>
              <Pressable onPress={() => setMidiaParaRenomear(null)}>
                <Text style={styles.modalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={salvarTitulo}>
                <Text style={styles.modalSalvar}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Text style={styles.secaoTitulo}>Adicionar</Text>

      <Text style={styles.rotuloCampo}>Título do conteúdo (opcional)</Text>
      <TextInput
        style={styles.campoTitulo}
        value={tituloNovo}
        onChangeText={setTituloNovo}
        placeholder="Ex: Diálogo no aeroporto"
        placeholderTextColor={cores.textoSuave}
      />
      <Text style={[styles.dica, styles.dicaAdicionar]}>
        Escreva o título e depois escolha o que adicionar abaixo.
      </Text>

      <Pressable
        style={styles.botao}
        onPress={() => {
          setErroLink(null);
          setModalYoutubeAberto(true);
        }}
        disabled={enviando}
      >
        <Text style={styles.botaoTexto}>Vídeo do YouTube (link)</Text>
      </Pressable>

      <Pressable style={styles.botao} onPress={criarExercicio} disabled={enviando}>
        <Text style={styles.botaoTexto}>Exercício de múltipla escolha</Text>
      </Pressable>

      <Pressable style={styles.botao} onPress={escolherFoto} disabled={enviando}>
        <Text style={styles.botaoTexto}>Foto</Text>
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

      <Pressable style={styles.botao} onPress={() => setModalTextoAberto(true)} disabled={enviando}>
        <Text style={styles.botaoTexto}>Escrever texto (voz)</Text>
      </Pressable>

      <Modal
        visible={modalYoutubeAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalYoutubeAberto(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Vídeo do YouTube</Text>
            <Text style={styles.rotuloCampo}>Título (opcional)</Text>
            <TextInput
              style={styles.campoTitulo}
              value={tituloNovo}
              onChangeText={setTituloNovo}
              placeholder="Ex: Diálogo no aeroporto"
              placeholderTextColor={cores.textoSuave}
            />
            <Text style={styles.rotuloCampo}>Link do vídeo</Text>
            <TextInput
              style={styles.campoTitulo}
              value={linkVideo}
              onChangeText={(texto) => {
                setLinkVideo(texto);
                setErroLink(null);
              }}
              onSubmitEditing={salvarYoutube}
              placeholder="https://youtu.be/..."
              placeholderTextColor={cores.textoSuave}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Text style={styles.dica}>
              No YouTube, publique o vídeo como “Não listado”: só quem tem o link consegue assistir.
            </Text>
            {erroLink && <Text style={styles.erro}>{erroLink}</Text>}
            <View style={styles.modalBotoes}>
              <Pressable onPress={() => setModalYoutubeAberto(false)}>
                <Text style={styles.modalCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={salvarYoutube}>
                <Text style={styles.modalSalvar}>Adicionar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalTextoAberto} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Texto que a voz vai ler</Text>
            <Text style={styles.rotuloCampo}>Título (opcional)</Text>
            <TextInput
              style={styles.campoTitulo}
              value={tituloNovo}
              onChangeText={setTituloNovo}
              placeholder="Ex: Vocabulário do check-in"
              placeholderTextColor={cores.textoSuave}
            />
            <Text style={styles.rotuloCampo}>Texto</Text>
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
    subtitulo: { fontFamily: fontes.texto, color: c.textoSuave, marginTop: 4, marginBottom: 14 },
    botaoPrevia: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: c.destaque,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    botaoPreviaTexto: { fontFamily: fontes.textoForte, fontSize: 13, color: c.destaque },
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
    itemTipo: { fontFamily: fontes.texto, fontSize: 12, color: c.destaque, marginTop: 2 },
    itemLink: { fontFamily: fontes.textoForte, fontSize: 13, color: c.destaque, marginTop: 6 },
    rotuloCampo: { fontFamily: fontes.textoMedio, color: c.texto, marginBottom: 6 },
    campoTitulo: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 10,
      color: c.texto,
      backgroundColor: c.superficie,
      marginBottom: 6,
    },
    dica: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave, marginBottom: 16 },
    dicaAdicionar: { marginBottom: 14 },
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
