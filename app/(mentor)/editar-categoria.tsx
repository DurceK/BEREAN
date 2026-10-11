import { useEffect, useState } from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { apagarArquivos, caminhosDosArquivos } from '../../lib/midias';
import { fontes, useEstilos, type Cores } from '../../lib/tema';
import { SeletorEmCascata, type ItemSelecionavel } from '../../components/SeletorEmCascata';

const ERRO_SALVAR = 'Não foi possível salvar. Verifique a conexão e tente de novo.';
const ERRO_APAGAR = 'Não foi possível apagar. Verifique a conexão e tente de novo.';

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
    setAulas((data ?? []).map((a) => ({ id: a.id, nome: a.titulo })));
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

  // ===== Categoria =====

  async function criarCategoria(nome: string) {
    if (!usuario) return ERRO_SALVAR;
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome, mentor_id: usuario.id })
      .select('id')
      .single();
    if (error || !data) return ERRO_SALVAR;
    await carregarCategorias();
    await selecionarCategoria(data.id);
    return null;
  }

  async function renomearCategoria(id: string, nome: string) {
    const { error } = await supabase.from('categorias').update({ nome }).eq('id', id);
    if (error) return ERRO_SALVAR;
    await carregarCategorias();
    return null;
  }

  async function apagarCategoria(id: string) {
    try {
      const caminhos = await caminhosDosArquivos({ categoriaId: id });
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) return ERRO_APAGAR;
      await apagarArquivos(caminhos);
    } catch {
      return ERRO_APAGAR;
    }
    setCategoriaId(null);
    setModulos([]);
    setModuloId(null);
    setAulas([]);
    setAulaId(null);
    await carregarCategorias();
    return null;
  }

  // ===== Módulo =====

  async function criarModulo(nome: string) {
    if (!categoriaId) return ERRO_SALVAR;
    const { data, error } = await supabase
      .from('modulos')
      .insert({ nome, categoria_id: categoriaId, ordem: modulos.length })
      .select('id')
      .single();
    if (error || !data) return ERRO_SALVAR;
    await carregarModulos(categoriaId);
    await selecionarModulo(data.id);
    return null;
  }

  async function renomearModulo(id: string, nome: string) {
    const { error } = await supabase.from('modulos').update({ nome }).eq('id', id);
    if (error || !categoriaId) return ERRO_SALVAR;
    await carregarModulos(categoriaId);
    return null;
  }

  async function apagarModulo(id: string) {
    try {
      const caminhos = await caminhosDosArquivos({ moduloId: id });
      const { error } = await supabase.from('modulos').delete().eq('id', id);
      if (error) return ERRO_APAGAR;
      await apagarArquivos(caminhos);
    } catch {
      return ERRO_APAGAR;
    }
    setModuloId(null);
    setAulas([]);
    setAulaId(null);
    if (categoriaId) await carregarModulos(categoriaId);
    return null;
  }

  // ===== Aula =====

  async function criarAula(titulo: string) {
    if (!moduloId) return ERRO_SALVAR;
    const { data, error } = await supabase
      .from('aulas')
      .insert({ titulo, modulo_id: moduloId, ordem: aulas.length })
      .select('id')
      .single();
    if (error || !data) return ERRO_SALVAR;
    await carregarAulas(moduloId);
    setAulaId(data.id);
    return null;
  }

  async function renomearAula(id: string, titulo: string) {
    const { error } = await supabase.from('aulas').update({ titulo }).eq('id', id);
    if (error || !moduloId) return ERRO_SALVAR;
    await carregarAulas(moduloId);
    return null;
  }

  async function apagarAula(id: string) {
    try {
      const caminhos = await caminhosDosArquivos({ aulaId: id });
      const { error } = await supabase.from('aulas').delete().eq('id', id);
      if (error) return ERRO_APAGAR;
      await apagarArquivos(caminhos);
    } catch {
      return ERRO_APAGAR;
    }
    setAulaId(null);
    if (moduloId) await carregarAulas(moduloId);
    return null;
  }

  return (
    <ScrollView style={styles.fundo} contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Organize suas aulas</Text>
      <Text style={styles.subtitulo}>
        Escolha uma categoria, depois o módulo e a aula. Ao lado de cada campo: + cria um item novo,
        ✎ renomeia o selecionado e ✕ apaga.
      </Text>

      <SeletorEmCascata
        titulo="Categoria"
        itens={categorias}
        valorSelecionado={categoriaId}
        onSelecionar={selecionarCategoria}
        tituloModalCriar="Nova categoria"
        tituloModalRenomear="Renomear categoria"
        avisoApagar="Os módulos, aulas e mídias desta categoria também serão apagados, e os alunos inscritos perdem o acesso. Não dá para desfazer."
        onCriar={criarCategoria}
        onRenomear={renomearCategoria}
        onApagar={apagarCategoria}
      />

      <SeletorEmCascata
        titulo="Módulo"
        itens={modulos}
        valorSelecionado={moduloId}
        onSelecionar={selecionarModulo}
        desabilitado={!categoriaId}
        tituloModalCriar="Novo módulo"
        tituloModalRenomear="Renomear módulo"
        avisoApagar="As aulas e mídias deste módulo também serão apagadas. Não dá para desfazer."
        onCriar={criarModulo}
        onRenomear={renomearModulo}
        onApagar={apagarModulo}
      />

      <SeletorEmCascata
        titulo="Aula"
        itens={aulas}
        valorSelecionado={aulaId}
        onSelecionar={setAulaId}
        desabilitado={!moduloId}
        tituloModalCriar="Nova aula"
        tituloModalRenomear="Renomear aula"
        avisoApagar="As mídias desta aula (áudios, fotos e vídeos) também serão apagadas. Não dá para desfazer."
        onCriar={criarAula}
        onRenomear={renomearAula}
        onApagar={apagarAula}
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
