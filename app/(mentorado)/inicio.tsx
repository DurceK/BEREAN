import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';

type AulaResumo = { id: string; titulo: string; ordem: number };
type ModuloResumo = { id: string; nome: string; ordem: number; aulas: AulaResumo[] };
type CategoriaResumo = { id: string; nome: string; modulos: ModuloResumo[] };

export default function MentoradoInicio() {
  const { usuario, sair } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [progresso, setProgresso] = useState<Record<string, string>>({});

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

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.rotulo}>Continue de onde parou</Text>
      <Text style={styles.saudacao}>Olá, {usuario?.nome}</Text>

      {carregando && <ActivityIndicator color={cores.primaria} style={{ marginTop: 24 }} />}

      {!carregando && categorias.length === 0 && (
        <Text style={styles.aviso}>
          Você ainda não está inscrito em nenhuma categoria. Fale com seu mentor.
        </Text>
      )}

      {categorias.map((categoria) => (
        <View key={categoria.id} style={styles.categoria}>
          <Text style={styles.categoriaTitulo}>{categoria.nome}</Text>

          {categoria.modulos.map((modulo) => (
            <View key={modulo.id} style={styles.modulo}>
              <Text style={styles.moduloTitulo}>{modulo.nome}</Text>

              {modulo.aulas.map((aula) => {
                const status = progresso[aula.id];
                return (
                  <Link key={aula.id} href={`/(mentorado)/assistir/${aula.id}`} asChild>
                    <Pressable style={styles.aula}>
                      <Text style={styles.aulaTitulo}>{aula.titulo}</Text>
                      {status === 'concluido' && <Text style={styles.selo}>✓ Concluída</Text>}
                      {status === 'em_andamento' && <Text style={styles.seloSuave}>Em andamento</Text>}
                      <Text style={styles.seta}>›</Text>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          ))}
        </View>
      ))}

      <Pressable onPress={sair} style={styles.sair}>
        <Text style={styles.sairTexto}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: { padding: 24, width: '100%', maxWidth: 720, alignSelf: 'center' },
    rotulo: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    saudacao: { fontFamily: fontes.titulo, fontSize: 24, color: c.texto, marginTop: 4, marginBottom: 24 },
    aviso: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    categoria: { marginBottom: 28 },
    categoriaTitulo: {
      fontFamily: fontes.titulo,
      fontSize: 20,
      color: c.texto,
      paddingBottom: 8,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.destaque,
    },
    modulo: { marginBottom: 16 },
    moduloTitulo: { fontFamily: fontes.textoForte, color: c.textoSuave, marginBottom: 8 },
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
    aulaTitulo: { flex: 1, minWidth: 0, fontFamily: fontes.textoMedio, color: c.texto },
    selo: { fontFamily: fontes.textoForte, fontSize: 12, color: c.destaque },
    seloSuave: { fontFamily: fontes.textoMedio, fontSize: 12, color: c.textoSuave },
    seta: { fontFamily: fontes.textoForte, fontSize: 20, color: c.textoSuave },
    sair: { marginTop: 16, alignSelf: 'flex-start' },
    sairTexto: { fontFamily: fontes.textoMedio, color: c.erro },
  });
