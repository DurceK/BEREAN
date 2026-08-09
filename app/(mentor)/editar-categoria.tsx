import { useEffect, useState } from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { SeletorEmCascata, type ItemSelecionavel } from '../../components/SeletorEmCascata';

export default function EditarCategoria() {
  const { perfil } = useAuth();

  const [categorias, setCategorias] = useState<ItemSelecionavel[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);

  const [modulos, setModulos] = useState<ItemSelecionavel[]>([]);
  const [moduloId, setModuloId] = useState<string | null>(null);

  const [sessoes, setSessoes] = useState<ItemSelecionavel[]>([]);
  const [sessaoId, setSessaoId] = useState<string | null>(null);

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

  async function carregarSessoes(idModulo: string) {
    const { data } = await supabase
      .from('sessoes')
      .select('id, titulo')
      .eq('modulo_id', idModulo)
      .order('ordem');
    setSessoes((data ?? []).map((s) => ({ id: s.id, nome: s.titulo })));
  }

  async function selecionarCategoria(id: string) {
    setCategoriaId(id);
    setModuloId(null);
    setSessoes([]);
    setSessaoId(null);
    await carregarModulos(id);
  }

  async function selecionarModulo(id: string) {
    setModuloId(id);
    setSessaoId(null);
    await carregarSessoes(id);
  }

  async function criarCategoria(nome: string) {
    if (!perfil) return;
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome, mentor_id: perfil.id })
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

  async function criarSessao(titulo: string) {
    if (!moduloId) return;
    const { data, error } = await supabase
      .from('sessoes')
      .insert({ titulo, modulo_id: moduloId, ordem: sessoes.length })
      .select('id, titulo')
      .single();
    if (!error && data) {
      await carregarSessoes(moduloId);
      setSessaoId(data.id);
    }
  }

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Editar categoria</Text>

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
        titulo="Sessão"
        itens={sessoes}
        valorSelecionado={sessaoId}
        onSelecionar={setSessaoId}
        desabilitado={!moduloId}
        tituloModalCriar="Nova sessão"
        onCriar={criarSessao}
      />

      {sessaoId && (
        <Link href={`/(mentor)/sessao/${sessaoId}`} asChild>
          <Pressable style={styles.botaoConteudo}>
            <Text style={styles.botaoConteudoTexto}>Gerenciar conteúdo desta sessão</Text>
          </Pressable>
        </Link>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#121212' },
  container: { padding: 24 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  botaoConteudo: {
    backgroundColor: '#1db954',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoConteudoTexto: { color: '#fff', fontWeight: 'bold' },
});
