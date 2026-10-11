import { useEffect, useState } from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fontes, useEstilos, type Cores } from '../../lib/tema';
import { SeletorEmCascata, type ItemSelecionavel } from '../../components/SeletorEmCascata';

export default function EditarCategoria() {
  const { usuario } = useAuth();
  const styles = useEstilos(criarEstilos);

  const [categorias, setCategorias] = useState<ItemSelecionavel[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);

  const [modulos, setModulos] = useState<ItemSelecionavel[]>([]);
  const [moduloId, setModuloId] = useState<string | null>(null);

  const [aulas, setAulas] = useState<ItemSelecionavel[]>([]);
  const [aulaId, setAulaId] = useState<string | null>(null);

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    const { data } = await supabase.from('categorias').select('id, nome').order('nome');
    setCategorias(data ?? []);
  }

  async function carregarModulos(idCategoria: string) {
    const { data } = await supabase
      .from('modulos')
      .select('id, nome')
      .eq('categoria_id', idCategoria)
      .order('ordem');
    setModulos(data ?? []);
  }

  async function carregarAulas(idModulo: string) {
    const { data } = await supabase
      .from('aulas')
      .select('id, titulo')
      .eq('modulo_id', idModulo)
      .order('ordem');
    setAulas((data ?? []).map((s) => ({ id: s.id, nome: s.titulo })));
  }

  async function selecionarCategoria(id: string) {
    setCategoriaId(id);
    setModuloId(null);
    setAulas([]);
    setAulaId(null);
    await carregarModulos(id);
  }

  async function selecionarModulo(id: string) {
    setModuloId(id);
    setAulaId(null);
    await carregarAulas(id);
  }

  async function criarCategoria(nome: string) {
    if (!usuario) return;
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome, mentor_id: usuario.id })
      .select('id, nome')
      .single();
    if (!error && data) {
      await carregarCategorias();
      await selecionarCategoria(data.id);
    }
  }

  async function criarModulo(nome: string) {
    if (!categoriaId) return;
    const { data, error } = await supabase
      .from('modulos')
      .insert({ nome, categoria_id: categoriaId, ordem: modulos.length })
      .select('id, nome')
      .single();
    if (!error && data) {
      await carregarModulos(categoriaId);
      await selecionarModulo(data.id);
    }
  }

  async function criarAula(titulo: string) {
    if (!moduloId) return;
    const { data, error } = await supabase
      .from('aulas')
      .insert({ titulo, modulo_id: moduloId, ordem: aulas.length })
      .select('id, titulo')
      .single();
    if (!error && data) {
      await carregarAulas(moduloId);
      setAulaId(data.id);
    }
  }

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Organize suas aulas</Text>
      <Text style={styles.subtitulo}>
        Escolha uma categoria, depois o módulo e a aula. Use o + para criar um item novo.
      </Text>

      <SeletorEmCascata
        titulo="Categoria"
        itens={categorias}
        valorSelecionado={categoriaId}
        onSelecionar={selecionarCategoria}
        tituloModalCriar="Nova categoria"
        onCriar={criarCategoria}
      />

      <SeletorEmCascata
        titulo="Módulo"
        itens={modulos}
        valorSelecionado={moduloId}
        onSelecionar={selecionarModulo}
        desabilitado={!categoriaId}
        tituloModalCriar="Novo módulo"
        onCriar={criarModulo}
      />

      <SeletorEmCascata
        titulo="Aula"
        itens={aulas}
        valorSelecionado={aulaId}
        onSelecionar={setAulaId}
        desabilitado={!moduloId}
        tituloModalCriar="Nova aula"
        onCriar={criarAula}
      />

      {aulaId && (
        <Link href={`/(mentor)/aula/${aulaId}`} asChild>
          <Pressable style={styles.botaoConteudo}>
            <Text style={styles.botaoConteudoTexto}>Gerenciar conteúdo desta aula</Text>
          </Pressable>
        </Link>
      )}
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: { padding: 24, width: '100%', maxWidth: 720, alignSelf: 'center' },
    titulo: { fontFamily: fontes.titulo, fontSize: 22, color: c.texto },
    subtitulo: {
      fontFamily: fontes.texto,
      color: c.textoSuave,
      marginTop: 6,
      marginBottom: 24,
      lineHeight: 20,
    },
    botaoConteudo: {
      backgroundColor: c.primaria,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    botaoConteudoTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria },
  });
