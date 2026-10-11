import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';

type SessaoResumo = { id: string; titulo: string; ordem: number };
type ModuloResumo = { id: string; nome: string; ordem: number; sessoes: SessaoResumo[] };
type CategoriaResumo = { id: string; nome: string; modulos: ModuloResumo[] };

export default function MentoradoInicio() {
  const { perfil, sair } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!perfil) return;

    let cancelado = false;

    async function carregar() {
      const { data } = await supabase
        .from('matriculas')
        .select(
          `categoria:categorias (
            id, nome,
            modulos ( id, nome, ordem, sessoes ( id, titulo, ordem ) )
          )`
        )
        .eq('mentorado_id', perfil!.id);

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
                sessoes: [...modulo.sessoes].sort((a, b) => a.ordem - b.ordem),
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
  }, [perfil]);

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.rotulo}>Continue de onde parou</Text>
      <Text style={styles.saudacao}>Olá, {perfil?.nome}</Text>

      {carregando && <ActivityIndicator color={cores.primaria} style={{ marginTop: 24 }} />}

      {!carregando && categorias.length === 0 && (
        <Text style={styles.aviso}>
          Você ainda não está matriculado em nenhuma categoria. Fale com seu mentor.
        </Text>
      )}

      {categorias.map((categoria) => (
        <View key={categoria.id} style={styles.categoria}>
          <Text style={styles.categoriaTitulo}>{categoria.nome}</Text>

          {categoria.modulos.map((modulo) => (
            <View key={modulo.id} style={styles.modulo}>
              <Text style={styles.moduloTitulo}>{modulo.nome}</Text>

              {modulo.sessoes.map((sessao) => (
                <View key={sessao.id} style={styles.sessao}>
                  <Text style={styles.sessaoTitulo}>{sessao.titulo}</Text>
                </View>
              ))}
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
    sessao: {
      backgroundColor: c.superficie,
      borderRadius: 8,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.borda,
    },
    sessaoTitulo: { fontFamily: fontes.textoMedio, color: c.texto },
    sair: { marginTop: 16, alignSelf: 'flex-start' },
    sairTexto: { fontFamily: fontes.textoMedio, color: c.erro },
  });
