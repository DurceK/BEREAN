import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
};

type Status = 'nao_iniciado' | 'em_andamento' | 'concluido';

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

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;

    async function carregar() {
      const [resAula, resMidias, resProgresso] = await Promise.all([
        supabase.from('aulas').select('titulo, modulos(nome)').eq('id', aulaId).single(),
        supabase
          .from('midias')
          .select('id, tipo, caminho_storage, texto_origem, idioma')
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

      if (!cancelado) {
        const dadosModulo = resAula.data.modulos as unknown as { nome: string } | null;
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

  async function concluir() {
    if (!usuario) return;
    setErro(null);
    const { error } = await supabase
      .from('progresso')
      .update({ status: 'concluido', atualizado_em: new Date().toISOString() })
      .eq('aula_id', aulaId)
      .eq('mentorado_id', usuario.id);
    if (error) setErro('Não foi possível marcar a aula como concluída.');
    else setStatus('concluido');
  }

  if (carregando) {
    return (
      <View style={[styles.fundo, styles.centro]}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      {modulo !== '' && <Text style={styles.rotulo}>{modulo}</Text>}
      <Text style={styles.titulo}>{titulo}</Text>

      {erro && <Text style={styles.erro}>{erro}</Text>}

      {midias.length === 0 && (
        <Text style={styles.vazio}>Esta aula ainda não tem conteúdo. Volte mais tarde.</Text>
      )}

      {midias.map((midia) => {
        const url = midia.caminho_storage ? urls[midia.caminho_storage] : undefined;
        return (
          <View key={midia.id} style={styles.cartao}>
            {(midia.tipo === 'audio_gravado' || midia.tipo === 'audio_upload') && url && (
              <PlayerAudio id={midia.id} url={url} ativo={ativo} onAtivar={setAtivo} />
            )}
            {midia.tipo === 'video' && url && (
              <PlayerVideo id={midia.id} url={url} ativo={ativo} onAtivar={setAtivo} />
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
  });
