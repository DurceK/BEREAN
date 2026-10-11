import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';
import { CabecalhoPerfil } from '../../components/CabecalhoPerfil';

type AulaResumo = { id: string; titulo: string; ordem: number };
type ModuloResumo = {
  id: string;
  nome: string;
  ordem: number;
  aulas: AulaResumo[];
};
type CategoriaResumo = { id: string; nome: string; modulos: ModuloResumo[] };

export default function MentoradoInicio() {
  const { usuario } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [progresso, setProgresso] = useState<Record<string, string>>({});
  // Cursos e disciplinas que o aluno deixou fechados (guardado só neste aparelho)
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const chaveFechados = `berean:fechados:${usuario?.id ?? ''}`;

  useEffect(() => {
    if (!usuario) return;
    AsyncStorage.getItem(`berean:fechados:${usuario.id}`)
      .then((salvo) => {
        if (salvo) setFechados(JSON.parse(salvo));
      })
      .catch(() => {});
  }, [usuario]);

  // Recarrega o progresso toda vez que a tela volta a aparecer (ex: ao sair de uma aula)
  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      let cancelado = false;
      supabase
        .from('progresso')
        .select('aula_id, status')
        .eq('mentorado_id', usuario.id)
        .then(({ data }) => {
          if (cancelado) return;
          const mapa: Record<string, string> = {};
          for (const linha of data ?? []) mapa[linha.aula_id] = linha.status;
          setProgresso(mapa);
        });
      return () => {
        cancelado = true;
      };
    }, [usuario])
  );

  useEffect(() => {
    if (!usuario) return;

    let cancelado = false;

    async function carregar() {
      const { data } = await supabase
        .from('inscricoes')
        .select(
          `categoria:categorias (
            id, nome,
            modulos ( id, nome, ordem, aulas ( id, titulo, ordem ) )
          )`
        )
        .eq('mentorado_id', usuario!.id);

      if (!cancelado) {
        const lista = (data ?? [])
          .map((linha: any) => linha.categoria as CategoriaResumo)
          .filter(Boolean)
          .map((categoria) => ({
            ...categoria,
            modulos: [...categoria.modulos]
              .sort((a, b) => a.ordem - b.ordem)
              .map((modulo) => ({
                ...modulo,
                aulas: [...modulo.aulas].sort((a, b) => a.ordem - b.ordem),
              })),
          }));
        setCategorias(lista);
        setCarregando(false);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [usuario]);

  function alternar(id: string) {
    setFechados((atual) => {
      const novo = { ...atual, [id]: !atual[id] };
      if (!novo[id]) delete novo[id];
      AsyncStorage.setItem(chaveFechados, JSON.stringify(novo)).catch(() => {});
      return novo;
    });
  }

  function resumo(aulas: AulaResumo[]) {
    const feitas = aulas.filter((a) => progresso[a.id] === 'concluido').length;
    return `${feitas} de ${aulas.length}`;
  }

  const todasAsAulas = categorias.flatMap((c) => c.modulos.flatMap((m) => m.aulas));
  const concluidas = todasAsAulas.filter((a) => progresso[a.id] === 'concluido').length;
  const emAndamento = todasAsAulas.filter((a) => progresso[a.id] === 'em_andamento').length;
  const proxima = todasAsAulas.find((a) => progresso[a.id] !== 'concluido');

  return (
    <ScrollView style={styles.fundo}>
      <CabecalhoPerfil
        area="Minhas aulas"
        papel={categorias.map((c) => c.nome).join(' · ') || 'Mentorado'}
        estatisticas={[
          { valor: todasAsAulas.length, rotulo: 'Aulas' },
          { valor: concluidas, rotulo: 'Concluídas' },
          { valor: emAndamento, rotulo: 'Em andamento' },
        ]}
        botao={
          proxima
            ? {
                texto: progresso[proxima.id] === 'em_andamento' ? 'Continuar aula' : 'Começar aula',
                onPress: () => router.push(`/(mentorado)/assistir/${proxima.id}`),
              }
            : undefined
        }
      />

      <View style={styles.container}>
        {carregando && <ActivityIndicator color={cores.primaria} style={{ marginTop: 24 }} />}

        {!carregando && categorias.length === 0 && (
          <Text style={styles.aviso}>
            Você ainda não está inscrito em nenhuma categoria. Fale com seu mentor.
          </Text>
        )}

        {categorias.map((categoria) => {
          const aulasDaCategoria = categoria.modulos.flatMap((m) => m.aulas);
          const categoriaFechada = !!fechados[categoria.id];
          return (
            <View key={categoria.id} style={styles.categoria}>
              <Pressable
                style={styles.categoriaCabecalho}
                onPress={() => alternar(categoria.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: !categoriaFechada }}
                accessibilityLabel={`${categoriaFechada ? 'Abrir' : 'Fechar'} ${categoria.nome}`}
              >
                <Text style={styles.categoriaTitulo}>{categoria.nome}</Text>
                <Text style={styles.resumo}>{resumo(aulasDaCategoria)}</Text>
                <Text style={styles.chevron}>{categoriaFechada ? '▸' : '▾'}</Text>
              </Pressable>

              {!categoriaFechada &&
                categoria.modulos.map((modulo) => {
                  const moduloFechado = !!fechados[modulo.id];
                  return (
                    <View key={modulo.id} style={styles.modulo}>
                      <Pressable
                        style={styles.moduloCabecalho}
                        onPress={() => alternar(modulo.id)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: !moduloFechado }}
                        accessibilityLabel={`${moduloFechado ? 'Abrir' : 'Fechar'} ${modulo.nome}`}
                      >
                        <Text style={styles.chevronPequeno}>{moduloFechado ? '▸' : '▾'}</Text>
                        <Text style={styles.moduloTitulo}>{modulo.nome}</Text>
                        <Text style={styles.resumo}>{resumo(modulo.aulas)}</Text>
                      </Pressable>

                      {!moduloFechado &&
                        modulo.aulas.map((aula) => {
                          const status = progresso[aula.id];
                          return (
                            <Link key={aula.id} href={`/(mentorado)/assistir/${aula.id}`} asChild>
                              <Pressable style={styles.aula}>
                                <Text style={styles.aulaTitulo}>{aula.titulo}</Text>
                                {status === 'concluido' && (
                                  <Text style={styles.selo}>✓ Concluída</Text>
                                )}
                                {status === 'em_andamento' && (
                                  <Text style={styles.seloSuave}>Em andamento</Text>
                                )}
                                <Text style={styles.seta}>›</Text>
                              </Pressable>
                            </Link>
                          );
                        })}
                    </View>
                  );
                })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: {
      padding: 24,
      paddingTop: 32,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    aviso: {
      fontFamily: fontes.texto,
      color: c.textoSuave,
      lineHeight: 20,
      textAlign: 'center',
    },
    categoria: { marginBottom: 24 },
    categoriaCabecalho: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
      paddingBottom: 8,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.destaque,
    },
    categoriaTitulo: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontes.titulo,
      fontSize: 20,
      color: c.texto,
    },
    resumo: {
      fontFamily: fontes.textoMedio,
      fontSize: 12,
      color: c.textoSuave,
      fontVariant: ['tabular-nums'],
    },
    chevron: {
      fontSize: 16,
      color: c.destaque,
      width: 16,
      textAlign: 'center',
    },
    modulo: { marginBottom: 12 },
    moduloCabecalho: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      marginBottom: 4,
    },
    chevronPequeno: {
      fontSize: 13,
      color: c.textoSuave,
      width: 14,
      textAlign: 'center',
    },
    moduloTitulo: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontes.textoForte,
      color: c.textoSuave,
    },
    aula: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.superficie,
      borderRadius: 8,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.borda,
    },
    aulaTitulo: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontes.textoMedio,
      color: c.texto,
    },
    selo: { fontFamily: fontes.textoForte, fontSize: 12, color: c.destaque },
    seloSuave: {
      fontFamily: fontes.textoMedio,
      fontSize: 12,
      color: c.textoSuave,
    },
    seta: { fontFamily: fontes.textoForte, fontSize: 20, color: c.textoSuave },
  });
