import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { obterUrlsAssinadas } from '../../../lib/midias';
import { fontes, useEstilos, useTema, type Cores } from '../../../lib/tema';
import { PlayerAudio } from '../../../components/aula/PlayerAudio';
import { PlayerVideo } from '../../../components/aula/PlayerVideo';
import { LeitorTexto } from '../../../components/aula/LeitorTexto';

type Midia = {
  id: string;
  tipo: string;
  caminho_storage: string | null;
  texto_origem: string | null;
  idioma: string | null;
  titulo: string | null;
};

type Status = 'nao_iniciado' | 'em_andamento' | 'concluido';
type AulaVizinha = { id: string; titulo: string } | null;
type ModuloSequencia = { ordem: number; aulas: { id: string; titulo: string; ordem: number }[] };

// Aulas do curso na ordem definida pelo mentor (módulo por módulo), para achar a anterior e a próxima
async function vizinhas(categoriaId: string, aulaId: string) {
  const { data } = await supabase
    .from('modulos')
    .select('ordem, aulas(id, titulo, ordem)')
    .eq('categoria_id', categoriaId);

  const sequencia = ((data ?? []) as ModuloSequencia[])
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((m) => [...m.aulas].sort((a, b) => a.ordem - b.ordem));
  const posicao = sequencia.findIndex((a) => a.id === aulaId);
  if (posicao === -1) return { anterior: null, proxima: null };

  const vizinha = (i: number): AulaVizinha =>
    sequencia[i] ? { id: sequencia[i].id, titulo: sequencia[i].titulo } : null;
  return { anterior: vizinha(posicao - 1), proxima: vizinha(posicao + 1) };
}

export default function AulaMentorado() {
  const { aulaId } = useLocalSearchParams<{ aulaId: string }>();
  const { usuario } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);

  const [titulo, setTitulo] = useState('');
  const [modulo, setModulo] = useState('');
  const [midias, setMidias] = useState<Midia[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('nao_iniciado');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [anterior, setAnterior] = useState<AulaVizinha>(null);
  const [proxima, setProxima] = useState<AulaVizinha>(null);
  // Mídias que o aluno já assistiu/ouviu até o fim nesta visita à aula
  const [vistos, setVistos] = useState<string[]>([]);
  const concluindo = useRef(false);

  const marcarVisto = useCallback((id: string) => {
    setVistos((atual) => (atual.includes(id) ? atual : [...atual, id]));
  }, []);

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;

    async function carregar() {
      // Ao trocar de aula a tela é reaproveitada: limpa o estado da aula anterior
      setCarregando(true);
      setErro(null);
      setAtivo(null);
      setVistos([]);
      concluindo.current = false;

      const [resAula, resMidias, resProgresso] = await Promise.all([
        supabase
          .from('aulas')
          .select('titulo, modulos(nome, categoria_id)')
          .eq('id', aulaId)
          .single(),
        supabase
          .from('midias')
          .select('id, tipo, caminho_storage, texto_origem, idioma, titulo')
          .eq('aula_id', aulaId)
          .order('ordem'),
        supabase
          .from('progresso')
          .select('status')
          .eq('aula_id', aulaId)
          .eq('mentorado_id', usuario!.id)
          .maybeSingle(),
      ]);

      if (resAula.error || resMidias.error) {
        if (!cancelado) {
          setErro('Não foi possível abrir esta aula.');
          setCarregando(false);
        }
        return;
      }

      const lista = resMidias.data ?? [];
      const caminhos = lista.map((m) => m.caminho_storage).filter((c): c is string => !!c);
      let mapa: Record<string, string> = {};
      try {
        mapa = await obterUrlsAssinadas(caminhos);
      } catch {
        if (!cancelado) setErro('Alguns arquivos desta aula não puderam ser carregados.');
      }

      // Abrir a aula pela primeira vez marca como "em andamento"
      let statusAtual = (resProgresso.data?.status as Status | undefined) ?? 'nao_iniciado';
      if (!resProgresso.data) {
        const { error } = await supabase
          .from('progresso')
          .insert({ mentorado_id: usuario!.id, aula_id: aulaId, status: 'em_andamento' });
        if (!error) statusAtual = 'em_andamento';
      }

      const dadosModulo = resAula.data.modulos as unknown as {
        nome: string;
        categoria_id: string;
      } | null;
      const vizinhanca = dadosModulo
        ? await vizinhas(dadosModulo.categoria_id, aulaId)
        : { anterior: null, proxima: null };

      if (!cancelado) {
        setAnterior(vizinhanca.anterior);
        setProxima(vizinhanca.proxima);
        setTitulo(resAula.data.titulo);
        setModulo(dadosModulo?.nome ?? '');
        setMidias(lista);
        setUrls(mapa);
        setStatus(statusAtual);
        setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [aulaId, usuario]);

  const concluir = useCallback(async () => {
    if (!usuario || concluindo.current) return;
    concluindo.current = true;
    const { error } = await supabase
      .from('progresso')
      .update({ status: 'concluido', atualizado_em: new Date().toISOString() })
      .eq('aula_id', aulaId)
      .eq('mentorado_id', usuario.id);
    concluindo.current = false;
    if (error) setErro('Não foi possível marcar a aula como concluída.');
    else setStatus('concluido');
  }, [aulaId, usuario]);

  // Itens que precisam ser vistos até o fim: áudios, vídeos e textos que abriram de verdade.
  // Fotos contam como vistas ao abrir a aula.
  const paraAssistir = midias.filter((m) =>
    m.tipo === 'audio_texto'
      ? !!m.texto_origem
      : m.tipo !== 'imagem' && !!m.caminho_storage && !!urls[m.caminho_storage]
  );
  const tudoVisto = paraAssistir.length > 0 && paraAssistir.every((m) => vistos.includes(m.id));

  // Grava no banco quando tudo foi visto. O estado só muda depois da resposta do servidor.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tudoVisto && status !== 'concluido') concluir();
  }, [tudoVisto, status, concluir]);

  if (carregando) {
    return (
      <View style={[styles.fundo, styles.centro]}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  return (
    // key: ao trocar de aula a rolagem volta para o topo
    <ScrollView key={aulaId} style={styles.fundo} contentContainerStyle={styles.container}>
      {modulo !== '' && <Text style={styles.rotulo}>{modulo}</Text>}
      <Text style={styles.titulo}>{titulo}</Text>

      {erro && <Text style={styles.erro}>{erro}</Text>}

      {midias.length === 0 && !erro && (
        <Text style={styles.vazio}>Esta aula ainda não tem conteúdo. Volte mais tarde.</Text>
      )}

      {midias.map((midia) => {
        const url = midia.caminho_storage ? urls[midia.caminho_storage] : undefined;
        return (
          <View key={midia.id} style={styles.cartao}>
            {!!midia.titulo && <Text style={styles.cartaoTitulo}>{midia.titulo}</Text>}
            {(midia.tipo === 'audio_gravado' || midia.tipo === 'audio_upload') && url && (
              <PlayerAudio
                id={midia.id}
                url={url}
                ativo={ativo}
                onAtivar={setAtivo}
                onTerminar={marcarVisto}
              />
            )}
            {midia.tipo === 'video' && url && (
              <PlayerVideo
                id={midia.id}
                url={url}
                ativo={ativo}
                onAtivar={setAtivo}
                onTerminar={marcarVisto}
              />
            )}
            {midia.tipo === 'imagem' && url && (
              <Image
                source={{ uri: url }}
                style={styles.imagem}
                resizeMode="contain"
                accessibilityLabel="Imagem da aula"
              />
            )}
            {midia.tipo === 'audio_texto' && midia.texto_origem && (
              <LeitorTexto
                id={midia.id}
                texto={midia.texto_origem}
                idioma={midia.idioma}
                ativo={ativo}
                onAtivar={setAtivo}
                onTerminar={marcarVisto}
              />
            )}
            {midia.caminho_storage && !url && (
              <Text style={styles.vazio}>Este arquivo não pôde ser carregado.</Text>
            )}
          </View>
        );
      })}

      {midias.length > 0 &&
        (status === 'concluido' ? (
          <View style={styles.concluida}>
            <Text style={styles.concluidaTexto}>✓ Aula concluída</Text>
          </View>
        ) : (
          <Pressable style={styles.botao} onPress={concluir}>
            <Text style={styles.botaoTexto}>Marcar aula como concluída</Text>
          </Pressable>
        ))}

      {(anterior || proxima) && (
        <View style={styles.navegacao}>
          {anterior ? (
            <Pressable
              style={styles.navBotao}
              onPress={() => router.replace(`/(mentorado)/assistir/${anterior.id}`)}
              accessibilityLabel={`Aula anterior: ${anterior.titulo}`}
            >
              <Text style={styles.navRotulo}>‹ Anterior</Text>
              <Text style={styles.navTitulo} numberOfLines={2}>
                {anterior.titulo}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.navVazio} />
          )}
          {proxima ? (
            <Pressable
              style={[styles.navBotao, styles.navProxima]}
              onPress={() => router.replace(`/(mentorado)/assistir/${proxima.id}`)}
              accessibilityLabel={`Próxima aula: ${proxima.titulo}`}
            >
              <Text style={[styles.navRotulo, styles.navRotuloProxima]}>Próxima ›</Text>
              <Text style={[styles.navTitulo, styles.navTituloProxima]} numberOfLines={2}>
                {proxima.titulo}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.navVazio} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    centro: { justifyContent: 'center', alignItems: 'center' },
    container: { padding: 24, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
    rotulo: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    titulo: { fontFamily: fontes.titulo, fontSize: 24, color: c.texto, marginTop: -8 },
    erro: { fontFamily: fontes.texto, color: c.erro },
    vazio: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    cartaoTitulo: {
      fontFamily: fontes.tituloLeve,
      fontSize: 17,
      color: c.texto,
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.borda,
    },
    cartao: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      padding: 16,
    },
    imagem: { width: '100%', aspectRatio: 4 / 3, borderRadius: 8 },
    botao: {
      backgroundColor: c.primaria,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    botaoTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria },
    concluida: { alignItems: 'center', padding: 14, marginTop: 8 },
    concluidaTexto: { fontFamily: fontes.textoForte, color: c.destaque, letterSpacing: 1 },
    navegacao: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: c.borda,
    },
    navBotao: {
      flex: 1,
      minWidth: 0,
      gap: 4,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borda,
      backgroundColor: c.superficie,
    },
    navProxima: { alignItems: 'flex-end', borderColor: c.destaque },
    navVazio: { flex: 1 },
    navRotulo: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.textoSuave,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    navRotuloProxima: { color: c.destaque },
    navTitulo: { fontFamily: fontes.textoMedio, color: c.texto },
    navTituloProxima: { textAlign: 'right' },
  });
