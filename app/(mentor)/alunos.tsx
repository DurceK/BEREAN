import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { criarMentorado, gerarSenhaProvisoria, redefinirSenha } from '../../lib/adminUsuarios';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';
import { FotoPessoa } from '../../components/FotoPessoa';

type Categoria = { id: string; nome: string };
type Aluno = {
  id: string;
  nome: string;
  matricula: string;
  avatar_url: string | null;
  categorias: string[];
};

// Janela aberta no momento: cadastro, redefinição de senha, ou o aviso com os dados de acesso
type Janela =
  | { tipo: 'novo' }
  | { tipo: 'senha'; aluno: Aluno }
  | { tipo: 'entregar'; nome: string; matricula: string; senha: string }
  | null;

export default function Alunos() {
  const { usuario } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [janela, setJanela] = useState<Janela>(null);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroJanela, setErroJanela] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!usuario) return;
    const [resCategorias, resInscricoes] = await Promise.all([
      supabase.from('categorias').select('id, nome').eq('mentor_id', usuario.id).order('nome'),
      supabase
        .from('inscricoes')
        .select('categoria_id, usuarios(id, nome, matricula, avatar_url), categorias!inner(mentor_id)')
        .eq('categorias.mentor_id', usuario.id),
    ]);

    if (resCategorias.error || resInscricoes.error) {
      setErroLista('Não foi possível carregar os alunos.');
      setCarregando(false);
      return;
    }

    const porAluno = new Map<string, Aluno>();
    for (const linha of resInscricoes.data ?? []) {
      const pessoa = linha.usuarios as unknown as Omit<Aluno, 'categorias'> | null;
      if (!pessoa) continue;
      const aluno = porAluno.get(pessoa.id) ?? { ...pessoa, categorias: [] };
      aluno.categorias.push(linha.categoria_id);
      porAluno.set(pessoa.id, aluno);
    }

    setCategorias(resCategorias.data ?? []);
    setAlunos([...porAluno.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
    setErroLista(null);
    setCarregando(false);
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function abrirNovo() {
    setNome('');
    setMatricula('');
    setSenha(gerarSenhaProvisoria());
    setEscolhidas(categorias.length === 1 ? [categorias[0].id] : []);
    setErroJanela(null);
    setJanela({ tipo: 'novo' });
  }

  function abrirSenha(aluno: Aluno) {
    setSenha(gerarSenhaProvisoria());
    setErroJanela(null);
    setJanela({ tipo: 'senha', aluno });
  }

  async function salvarNovo() {
    setSalvando(true);
    setErroJanela(null);
    const { erro } = await criarMentorado({ nome, matricula, senha, categorias: escolhidas });
    setSalvando(false);
    if (erro) {
      setErroJanela(erro);
      return;
    }
    setJanela({ tipo: 'entregar', nome: nome.trim(), matricula: matricula.trim().toLowerCase(), senha });
    await carregar();
  }

  async function salvarSenha(aluno: Aluno) {
    setSalvando(true);
    setErroJanela(null);
    const { erro } = await redefinirSenha(aluno.id, senha);
    setSalvando(false);
    if (erro) {
      setErroJanela(erro);
      return;
    }
    setJanela({ tipo: 'entregar', nome: aluno.nome, matricula: aluno.matricula, senha });
  }

  async function alternarInscricao(aluno: Aluno, categoriaId: string) {
    setErroLista(null);
    const inscrito = aluno.categorias.includes(categoriaId);
    const { error } = inscrito
      ? await supabase
          .from('inscricoes')
          .delete()
          .eq('mentorado_id', aluno.id)
          .eq('categoria_id', categoriaId)
      : await supabase.from('inscricoes').insert({ mentorado_id: aluno.id, categoria_id: categoriaId });
    if (error) setErroLista('Não foi possível atualizar a inscrição.');
    await carregar();
  }

  function alternarEscolhida(categoriaId: string) {
    setEscolhidas((atual) =>
      atual.includes(categoriaId) ? atual.filter((id) => id !== categoriaId) : [...atual, categoriaId]
    );
  }

  return (
    <ScrollView style={estilos.fundo} contentContainerStyle={estilos.container}>
      <View style={estilos.topo}>
        <View style={estilos.topoTexto}>
          <Text style={estilos.titulo}>Alunos</Text>
          <Text style={estilos.subtitulo}>
            Cadastre alunos, escolha as categorias de cada um e redefina senhas esquecidas.
          </Text>
        </View>
        <Pressable
          style={[estilos.botaoPrincipal, categorias.length === 0 && estilos.desabilitado]}
          disabled={categorias.length === 0}
          onPress={abrirNovo}
        >
          <Text style={estilos.botaoPrincipalTexto}>+ Novo aluno</Text>
        </Pressable>
      </View>

      {categorias.length === 0 && !carregando && (
        <Text style={estilos.aviso}>Crie uma categoria antes de cadastrar alunos.</Text>
      )}
      {erroLista && <Text style={estilos.erro}>{erroLista}</Text>}
      {carregando && <ActivityIndicator color={cores.primaria} />}

      {!carregando && alunos.length === 0 && categorias.length > 0 && (
        <Text style={estilos.aviso}>Nenhum aluno inscrito ainda. Toque em “+ Novo aluno”.</Text>
      )}

      {alunos.map((aluno) => (
        <View key={aluno.id} style={estilos.card}>
          <View style={estilos.cardTopo}>
            <Link href={`/(mentor)/aluno/${aluno.id}`} asChild>
              <Pressable style={estilos.cardPessoa} accessibilityLabel={`Ver como ${aluno.nome} está estudando`}>
                <FotoPessoa nome={aluno.nome} caminho={aluno.avatar_url} />
                <View style={estilos.cardInfo}>
                  <Text style={estilos.cardNome}>{aluno.nome}</Text>
                  <Text style={estilos.cardMatricula}>Matrícula {aluno.matricula}</Text>
                  <Text style={estilos.cardLink}>Ver progresso ›</Text>
                </View>
              </Pressable>
            </Link>
            <Pressable style={estilos.botaoSecundario} onPress={() => abrirSenha(aluno)}>
              <Text style={estilos.botaoSecundarioTexto}>Redefinir senha</Text>
            </Pressable>
          </View>

          <View style={estilos.chips}>
            {categorias.map((categoria) => {
              const inscrito = aluno.categorias.includes(categoria.id);
              // tirar a última categoria faria o aluno sumir desta lista
              const ultima = inscrito && aluno.categorias.length === 1;
              return (
                <Pressable
                  key={categoria.id}
                  style={[estilos.chip, inscrito && estilos.chipAtivo, ultima && estilos.chipTravado]}
                  disabled={ultima}
                  onPress={() => alternarInscricao(aluno, categoria.id)}
                  accessibilityLabel={`${inscrito ? 'Tirar de' : 'Inscrever em'} ${categoria.nome}`}
                >
                  <Text style={[estilos.chipTexto, inscrito && estilos.chipTextoAtivo]}>
                    {inscrito ? '✓ ' : ''}
                    {categoria.nome}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Modal visible={janela !== null} transparent animationType="fade" onRequestClose={() => setJanela(null)}>
        <View style={estilos.modalFundo}>
          <ScrollView contentContainerStyle={estilos.modalRolagem}>
            <View style={estilos.modalCaixa}>
              {janela?.tipo === 'novo' && (
                <>
                  <Text style={estilos.modalTitulo}>Novo aluno</Text>

                  <Text style={estilos.label}>Nome</Text>
                  <TextInput
                    style={estilos.input}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Nome completo"
                    placeholderTextColor={cores.textoSuave}
                    autoFocus
                  />

                  <Text style={estilos.label}>Matrícula</Text>
                  <TextInput
                    style={estilos.input}
                    value={matricula}
                    onChangeText={setMatricula}
                    placeholder="Ex: 260802"
                    placeholderTextColor={cores.textoSuave}
                    autoCapitalize="none"
                  />
                  <Text style={estilos.dica}>É o que o aluno vai digitar para entrar.</Text>

                  <Text style={estilos.label}>Senha provisória</Text>
                  <View style={estilos.linhaSenha}>
                    <TextInput
                      style={[estilos.input, estilos.inputSenha]}
                      value={senha}
                      onChangeText={setSenha}
                      autoCapitalize="none"
                    />
                    <Pressable style={estilos.botaoSecundario} onPress={() => setSenha(gerarSenhaProvisoria())}>
                      <Text style={estilos.botaoSecundarioTexto}>Gerar outra</Text>
                    </Pressable>
                  </View>
                  <Text style={estilos.dica}>O aluno troca por uma senha dele no primeiro acesso.</Text>

                  <Text style={estilos.label}>Categorias</Text>
                  <View style={estilos.chips}>
                    {categorias.map((categoria) => {
                      const marcada = escolhidas.includes(categoria.id);
                      return (
                        <Pressable
                          key={categoria.id}
                          style={[estilos.chip, marcada && estilos.chipAtivo]}
                          onPress={() => alternarEscolhida(categoria.id)}
                        >
                          <Text style={[estilos.chipTexto, marcada && estilos.chipTextoAtivo]}>
                            {marcada ? '✓ ' : ''}
                            {categoria.nome}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {erroJanela && <Text style={estilos.erro}>{erroJanela}</Text>}
                  <View style={estilos.modalBotoes}>
                    <Pressable onPress={() => setJanela(null)}>
                      <Text style={estilos.cancelar}>Cancelar</Text>
                    </Pressable>
                    <Pressable onPress={salvarNovo} disabled={salvando}>
                      <Text style={estilos.confirmar}>{salvando ? 'Cadastrando...' : 'Cadastrar'}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {janela?.tipo === 'senha' && (
                <>
                  <Text style={estilos.modalTitulo}>Redefinir senha</Text>
                  <Text style={estilos.texto}>
                    {janela.aluno.nome} vai entrar com esta senha provisória e escolher uma nova no
                    próximo acesso. A senha antiga deixa de funcionar.
                  </Text>
                  <View style={estilos.linhaSenha}>
                    <TextInput
                      style={[estilos.input, estilos.inputSenha]}
                      value={senha}
                      onChangeText={setSenha}
                      autoCapitalize="none"
                    />
                    <Pressable style={estilos.botaoSecundario} onPress={() => setSenha(gerarSenhaProvisoria())}>
                      <Text style={estilos.botaoSecundarioTexto}>Gerar outra</Text>
                    </Pressable>
                  </View>
                  {erroJanela && <Text style={estilos.erro}>{erroJanela}</Text>}
                  <View style={estilos.modalBotoes}>
                    <Pressable onPress={() => setJanela(null)}>
                      <Text style={estilos.cancelar}>Cancelar</Text>
                    </Pressable>
                    <Pressable onPress={() => salvarSenha(janela.aluno)} disabled={salvando}>
                      <Text style={estilos.confirmar}>{salvando ? 'Salvando...' : 'Redefinir'}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {janela?.tipo === 'entregar' && (
                <>
                  <Text style={estilos.modalTitulo}>Pronto!</Text>
                  <Text style={estilos.texto}>Passe estes dados para {janela.nome}:</Text>
                  <View style={estilos.acesso}>
                    <Text style={estilos.acessoRotulo}>Matrícula</Text>
                    <Text style={estilos.acessoValor} selectable>
                      {janela.matricula}
                    </Text>
                    <Text style={estilos.acessoRotulo}>Senha provisória</Text>
                    <Text style={estilos.acessoValor} selectable>
                      {janela.senha}
                    </Text>
                  </View>
                  <Text style={estilos.dica}>
                    Anote agora: por segurança, a senha não aparece de novo depois que você fechar.
                  </Text>
                  <View style={estilos.modalBotoes}>
                    <Pressable onPress={() => setJanela(null)}>
                      <Text style={estilos.confirmar}>Fechar</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: { padding: 24, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
    topo: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 6 },
    topoTexto: { flex: 1, minWidth: 220, gap: 6 },
    titulo: { fontFamily: fontes.titulo, fontSize: 22, color: c.texto },
    subtitulo: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    aviso: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    erro: { fontFamily: fontes.texto, color: c.erro },
    desabilitado: { opacity: 0.4 },
    botaoPrincipal: {
      backgroundColor: c.primaria,
      borderRadius: 24,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    botaoPrincipalTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria },
    botaoSecundario: {
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    botaoSecundarioTexto: { fontFamily: fontes.textoMedio, fontSize: 13, color: c.texto },
    card: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      padding: 16,
      gap: 12,
    },
    cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardPessoa: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardInfo: { flex: 1, minWidth: 0, gap: 2 },
    cardLink: { fontFamily: fontes.textoMedio, fontSize: 13, color: c.destaque, marginTop: 2 },
    cardNome: { fontFamily: fontes.textoForte, fontSize: 16, color: c.texto },
    cardMatricula: { fontFamily: fontes.texto, fontSize: 13, color: c.textoSuave },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borda,
    },
    chipAtivo: { backgroundColor: c.primaria, borderColor: c.primaria },
    chipTravado: { opacity: 0.75 },
    chipTexto: { fontFamily: fontes.textoMedio, fontSize: 13, color: c.texto },
    chipTextoAtivo: { color: c.sobrePrimaria },
    modalFundo: { flex: 1, backgroundColor: c.sobreposicao },
    modalRolagem: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    modalCaixa: {
      backgroundColor: c.fundo,
      borderRadius: 12,
      padding: 20,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    modalTitulo: { fontFamily: fontes.tituloLeve, fontSize: 20, color: c.texto, marginBottom: 12 },
    texto: { fontFamily: fontes.texto, color: c.texto, lineHeight: 20, marginBottom: 12 },
    label: { fontFamily: fontes.textoMedio, color: c.texto, marginTop: 12, marginBottom: 6 },
    dica: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave, marginTop: 4 },
    input: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 10,
      color: c.texto,
      backgroundColor: c.superficie,
    },
    linhaSenha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    inputSenha: { flex: 1, minWidth: 0, fontFamily: fontes.textoForte, letterSpacing: 1 },
    acesso: {
      backgroundColor: c.superficie,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.destaque,
      padding: 14,
      gap: 2,
      marginBottom: 8,
    },
    acessoRotulo: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave, marginTop: 6 },
    acessoValor: { fontFamily: fontes.textoForte, fontSize: 20, color: c.texto, letterSpacing: 1 },
    modalBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 20 },
    cancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    confirmar: { fontFamily: fontes.textoForte, color: c.destaque },
  });
