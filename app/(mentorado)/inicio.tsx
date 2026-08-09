import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

type SessaoResumo = { id: string; titulo: string; ordem: number };
type ModuloResumo = { id: string; nome: string; ordem: number; sessoes: SessaoResumo[] };
type CategoriaResumo = { id: string; nome: string; modulos: ModuloResumo[] };

export default function MentoradoInicio() {
  const { perfil, sair } = useAuth();
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
      <Text style={styles.saudacao}>Olá, {perfil?.nome}</Text>

      {carregando && <ActivityIndicator style={{ marginTop: 24 }} />}

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

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#121212' },
  container: { padding: 24 },
  saudacao: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  aviso: { color: '#999' },
  categoria: { marginBottom: 20 },
  categoriaTitulo: { color: '#1db954', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modulo: { marginBottom: 12, marginLeft: 8 },
  moduloTitulo: { color: '#ccc', fontWeight: 'bold', marginBottom: 4 },
  sessao: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  sessaoTitulo: { color: '#fff' },
  sair: { marginTop: 32 },
  sairTexto: { color: '#f66' },
});
