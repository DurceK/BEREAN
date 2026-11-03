import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../lib/auth';
import { diasDesde, haQuanto } from '../../lib/datas';
import {
  errosRecentes,
  resumoDaTurma,
  type ErroRecente,
  type ResumoAluno,
} from '../../lib/relatorios';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';
import { FotoPessoa } from '../../components/FotoPessoa';

// A partir de quantos dias sem estudar o aluno aparece em destaque, para o mentor chamar
const DIAS_PARADO = 7;
// Quantos erros recentes aparecem antes de tocar em "Ver mais"
const ERROS_VISIVEIS = 5;

// Para a busca por nome: ignora maiúsculas e acentos ("catia" encontra "Cátia")
function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export default function Relatorios() {
  const { usuario } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [alunos, setAlunos] = useState<ResumoAluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErroRecente[]>([]);
  const [todosOsErros, setTodosOsErros] = useState(false);
  const [busca, setBusca] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      let cancelado = false;
      Promise.all([resumoDaTurma(usuario.id), errosRecentes()])
        .then(([lista, ultimosErros]) => {
          if (cancelado) return;
          setAlunos(lista);
          setErros(ultimosErros);
          setErro(null);
        })
        .catch(() => {
          if (!cancelado) setErro('Não foi possível carregar o relatório.');
        })
        .finally(() => {
          if (!cancelado) setCarregando(false);
        });
      return () => {
        cancelado = true;
      };
    }, [usuario])
  );

  if (carregando) {
    return (
      <View style={[estilos.fundo, estilos.centro]}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  const encontrados = busca.trim()
    ? alunos.filter((a) => semAcento(a.nome).includes(semAcento(busca)))
    : alunos;
  const parado = (a: ResumoAluno) =>
    !a.ultimaAtividade || diasDesde(a.ultimaAtividade) >= DIAS_PARADO;
  const ativos = alunos.filter((a) => !parado(a)).length;
  const respondidas = alunos.reduce((s, a) => s + a.respondidas, 0);
  const acertos = alunos.reduce((s, a) => s + a.acertos, 0);

  return (
    <ScrollView style={estilos.fundo} contentContainerStyle={estilos.container}>
      <Text style={estilos.secao}>Resumo da turma</Text>
      <View style={estilos.numeros}>
        <Numero valor={alunos.length} rotulo="Alunos" estilos={estilos} />
        <Numero
          valor={ativos}
          rotulo={`Ativos nos últimos ${DIAS_PARADO} dias`}
          estilos={estilos}
        />
        <Numero
          valor={respondidas ? `${Math.round((acertos / respondidas) * 100)}%` : '–'}
          rotulo="Acertos da turma"
          estilos={estilos}
        />
      </View>

      <Text style={estilos.secao}>Erros recentes</Text>
      {!erro && erros.length === 0 && (
        <Text style={estilos.vazio}>Nenhum erro registrado ainda.</Text>
      )}
      {erros.length > 0 && (
        <View style={estilos.cartao}>
          {(todosOsErros ? erros : erros.slice(0, ERROS_VISIVEIS)).map((e, i) => (
            <Pressable
              key={i}
              style={[estilos.erroItem, i > 0 && estilos.erroSeparado]}
              onPress={() => router.push(`/(mentor)/aluno/${e.alunoId}`)}
              accessibilityLabel={`Erro de ${e.aluno} em ${e.aula}. Abrir a ficha.`}
            >
              <Ionicons name="close-circle" size={18} color={cores.erro} />
              <View style={estilos.erroConteudo}>
                <Text style={estilos.erroCabecalho} numberOfLines={1}>
                  {e.aluno} · {e.aula} · {haQuanto(e.quando)}
                </Text>
                <Text style={estilos.erroEnunciado}>{e.enunciado}</Text>
                {e.resposta !== null ? (
                  <Text style={estilos.erroTexto}>
                    <Text style={estilos.erroRotulo}>Aluno: </Text>
                    {e.resposta || '(em branco)'}
                  </Text>
                ) : (
                  e.tipo === 'ligar' && (
                    <Text style={estilos.erroTexto}>Errou pelo menos um par.</Text>
                  )
                )}
                {!!e.certa && (
                  <Text style={estilos.erroTexto}>
                    <Text style={estilos.erroRotulo}>Certa: </Text>
                    {e.certa}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
          {erros.length > ERROS_VISIVEIS && (
            <Pressable onPress={() => setTodosOsErros((atual) => !atual)} style={estilos.verMais}>
              <Text style={estilos.verMaisTexto}>
                {todosOsErros ? 'Mostrar menos' : `Ver mais erros (${erros.length})`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={estilos.secao}>Por aluno</Text>
      {alunos.length > 0 && (
        <View style={estilos.busca}>
          <Ionicons name="search" size={18} color={cores.textoSuave} />
          <TextInput
            style={estilos.buscaCampo}
            value={busca}
            onChangeText={setBusca}
            placeholder="Procurar aluno pelo nome"
            placeholderTextColor={cores.textoSuave}
            autoCorrect={false}
            accessibilityLabel="Procurar aluno pelo nome"
          />
          {!!busca && (
            <Pressable onPress={() => setBusca('')} accessibilityLabel="Limpar busca" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={cores.textoSuave} />
            </Pressable>
          )}
        </View>
      )}
      {!!busca.trim() && encontrados.length === 0 && (
        <Text style={estilos.vazio}>Nenhum aluno com “{busca.trim()}” no nome.</Text>
      )}
      {erro && <Text style={estilos.erro}>{erro}</Text>}
      {!erro && alunos.length === 0 && (
        <Text style={estilos.vazio}>Nenhum aluno inscrito nos seus cursos ainda.</Text>
      )}

      {encontrados.map((aluno) => {
        const semEstudar = parado(aluno);
        return (
          <Pressable
            key={aluno.id}
            style={estilos.cartao}
            onPress={() => router.push(`/(mentor)/aluno/${aluno.id}`)}
            accessibilityLabel={`Abrir a ficha de ${aluno.nome}`}
          >
            <View style={estilos.topo}>
              <FotoPessoa nome={aluno.nome} caminho={aluno.avatar} tamanho={40} />
              <View style={estilos.topoTexto}>
                <Text style={estilos.nome}>{aluno.nome}</Text>
                <Text style={[estilos.atividade, semEstudar && { color: cores.erro }]}>
                  {aluno.ultimaAtividade
                    ? `Estudou ${haQuanto(aluno.ultimaAtividade)}`
                    : 'Ainda não abriu nenhuma aula'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} />
            </View>
            <View style={estilos.linhaNumeros}>
              <Dado valor={aluno.concluidas} rotulo="Concluídas" estilos={estilos} />
              <Dado valor={aluno.emAndamento} rotulo="Em andamento" estilos={estilos} />
              <Dado
                valor={
                  aluno.respondidas
                    ? `${Math.round((aluno.acertos / aluno.respondidas) * 100)}%`
                    : '–'
                }
                rotulo={
                  aluno.respondidas ? `${aluno.acertos} de ${aluno.respondidas} acertos` : 'Acertos'
                }
                estilos={estilos}
              />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type Estilos = ReturnType<typeof criarEstilos>;

function Numero({
  valor,
  rotulo,
  estilos,
}: {
  valor: number | string;
  rotulo: string;
  estilos: Estilos;
}) {
  return (
    <View style={estilos.numero}>
      <Text style={estilos.numeroValor}>{valor}</Text>
      <Text style={estilos.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

function Dado({
  valor,
  rotulo,
  estilos,
}: {
  valor: number | string;
  rotulo: string;
  estilos: Estilos;
}) {
  return (
    <View style={estilos.dado}>
      <Text style={estilos.dadoValor}>{valor}</Text>
      <Text style={estilos.dadoRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    centro: { justifyContent: 'center', alignItems: 'center' },
    container: { padding: 24, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
    secao: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginTop: 8,
    },
    erro: { fontFamily: fontes.texto, color: c.erro },
    vazio: { fontFamily: fontes.texto, color: c.textoSuave },
    numeros: { flexDirection: 'row', gap: 10 },
    numero: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      backgroundColor: c.superficie,
    },
    numeroValor: {
      fontFamily: fontes.tituloLeve,
      fontSize: 24,
      color: c.destaque,
      fontVariant: ['tabular-nums'],
    },
    numeroRotulo: {
      fontFamily: fontes.textoMedio,
      fontSize: 11,
      color: c.textoSuave,
      textAlign: 'center',
    },
    cartao: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      padding: 14,
      gap: 12,
    },
    erroItem: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
    erroSeparado: {
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borda,
    },
    erroConteudo: { flex: 1, minWidth: 0, gap: 2 },
    erroCabecalho: { fontFamily: fontes.textoForte, fontSize: 12, color: c.textoSuave },
    erroEnunciado: { fontFamily: fontes.textoMedio, fontSize: 14, color: c.texto },
    erroTexto: { fontFamily: fontes.texto, fontSize: 13, color: c.textoSuave, lineHeight: 19 },
    erroRotulo: { fontFamily: fontes.textoForte, color: c.texto },
    verMais: { alignSelf: 'center', paddingTop: 4 },
    verMaisTexto: { fontFamily: fontes.textoForte, fontSize: 13, color: c.destaque },
    busca: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 10,
      paddingHorizontal: 12,
      backgroundColor: c.superficie,
    },
    buscaCampo: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 10,
      fontFamily: fontes.texto,
      fontSize: 15,
      color: c.texto,
    },
    topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    topoTexto: { flex: 1, minWidth: 0, gap: 2 },
    nome: { fontFamily: fontes.textoForte, fontSize: 16, color: c.texto },
    atividade: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave },
    linhaNumeros: {
      flexDirection: 'row',
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borda,
    },
    dado: { flex: 1, alignItems: 'center', gap: 2 },
    dadoValor: {
      fontFamily: fontes.textoForte,
      fontSize: 18,
      color: c.texto,
      fontVariant: ['tabular-nums'],
    },
    dadoRotulo: {
      fontFamily: fontes.texto,
      fontSize: 11,
      color: c.textoSuave,
      textAlign: 'center',
    },
  });
