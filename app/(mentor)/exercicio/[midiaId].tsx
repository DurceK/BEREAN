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
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import {
  apagarQuestao,
  carregarGabarito,
  carregarQuestoes,
  MAX_ALTERNATIVAS,
  MIN_ALTERNATIVAS,
  salvarQuestao,
  validarRascunho,
  type Questao,
  type Rascunho,
} from '../../../lib/exercicios';
import { fontes, useEstilos, useTema, type Cores } from '../../../lib/tema';
import { JanelaConfirmar } from '../../../components/Janelas';

const LETRAS = 'ABCDEF';

function rascunhoVazio(ordem: number): Rascunho {
  return {
    ordem,
    enunciado: '',
    explicacao: '',
    alternativas: [{ texto: '' }, { texto: '' }, { texto: '' }, { texto: '' }],
    indiceCorreta: null,
  };
}

export default function EditorExercicio() {
  const { midiaId } = useLocalSearchParams<{ midiaId: string }>();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);

  const [titulo, setTitulo] = useState('');
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [gabarito, setGabarito] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  // Pergunta sendo editada (nova ou existente); só uma por vez
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [idsOriginais, setIdsOriginais] = useState<string[]>([]);
  const [erroRascunho, setErroRascunho] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [paraApagar, setParaApagar] = useState<Questao | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [lista, resMidia] = await Promise.all([
        carregarQuestoes(midiaId),
        supabase.from('midias').select('titulo').eq('id', midiaId).single(),
      ]);
      setQuestoes(lista);
      setGabarito(await carregarGabarito(lista.map((q) => q.id)));
      setTitulo(resMidia.data?.titulo ?? '');
      setErroLista(null);
    } catch {
      setErroLista('Não foi possível carregar as perguntas.');
    }
    setCarregando(false);
  }, [midiaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function editar(questao: Questao) {
    setErroRascunho(null);
    setIdsOriginais(questao.alternativas.map((a) => a.id));
    setRascunho({
      id: questao.id,
      ordem: questao.ordem,
      enunciado: questao.enunciado,
      explicacao: questao.explicacao ?? '',
      alternativas: questao.alternativas.map((a) => ({ id: a.id, texto: a.texto })),
      indiceCorreta: Math.max(
        0,
        questao.alternativas.findIndex((a) => a.id === gabarito[questao.id])
      ),
    });
  }

  function nova() {
    setErroRascunho(null);
    setIdsOriginais([]);
    const proxima = questoes.reduce((maior, q) => Math.max(maior, q.ordem), -1) + 1;
    setRascunho(rascunhoVazio(proxima));
  }

  function alterar(mudanca: Partial<Rascunho>) {
    setRascunho((atual) => (atual ? { ...atual, ...mudanca } : atual));
  }

  function alterarAlternativa(indice: number, texto: string) {
    if (!rascunho) return;
    const alternativas = rascunho.alternativas.map((a, i) => (i === indice ? { ...a, texto } : a));
    alterar({ alternativas });
  }

  function removerAlternativa(indice: number) {
    if (!rascunho) return;
    const alternativas = rascunho.alternativas.filter((_, i) => i !== indice);
    let indiceCorreta = rascunho.indiceCorreta;
    if (indiceCorreta === indice) indiceCorreta = null;
    else if (indiceCorreta !== null && indiceCorreta > indice) indiceCorreta -= 1;
    alterar({ alternativas, indiceCorreta });
  }

  async function salvar() {
    if (!rascunho) return;
    // Alternativas deixadas em branco são descartadas antes de salvar
    const marcada = rascunho.indiceCorreta;
    if (marcada !== null && !rascunho.alternativas[marcada]?.texto.trim()) {
      setErroRascunho('A alternativa marcada como certa está vazia.');
      return;
    }
    const preenchidas = rascunho.alternativas
      .map((a, i) => ({ ...a, i }))
      .filter((a) => a.texto.trim());
    const limpo: Rascunho = {
      ...rascunho,
      alternativas: preenchidas.map(({ id, texto }) => ({ id, texto })),
      indiceCorreta: marcada === null ? null : preenchidas.findIndex((a) => a.i === marcada),
    };

    const problema = validarRascunho(limpo);
    if (problema) {
      setErroRascunho(problema);
      return;
    }
    setSalvando(true);
    const erro = await salvarQuestao(midiaId, limpo, idsOriginais);
    setSalvando(false);
    if (erro) {
      setErroRascunho(erro);
      return;
    }
    setRascunho(null);
    await carregar();
  }

  if (carregando) {
    return (
      <View style={[estilos.fundo, estilos.centro]}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  return (
    <ScrollView style={estilos.fundo} contentContainerStyle={estilos.container}>
      <Text style={estilos.titulo}>{titulo || 'Exercício'}</Text>
      <Text style={estilos.subtitulo}>
        Perguntas de múltipla escolha. O aluno vê na hora se acertou, qual era a certa e a
        explicação.
      </Text>
      {erroLista && <Text style={estilos.erro}>{erroLista}</Text>}

      {questoes.length === 0 && !rascunho && (
        <Text style={estilos.vazio}>Nenhuma pergunta ainda. Toque em “+ Nova pergunta”.</Text>
      )}

      {questoes.map((questao, numero) =>
        rascunho?.id === questao.id ? null : (
          <View key={questao.id} style={estilos.cartao}>
            <Text style={estilos.enunciado}>
              {numero + 1}. {questao.enunciado}
            </Text>
            {questao.alternativas.map((alternativa, i) => {
              const certa = gabarito[questao.id] === alternativa.id;
              return (
                <Text key={alternativa.id} style={[estilos.alternativa, certa && estilos.certa]}>
                  {LETRAS[i]}) {alternativa.texto}
                  {certa ? '  ✓' : ''}
                </Text>
              );
            })}
            {!!questao.explicacao && (
              <Text style={estilos.explicacao}>Explicação: {questao.explicacao}</Text>
            )}
            <View style={estilos.acoes}>
              <Pressable onPress={() => editar(questao)} disabled={!!rascunho}>
                <Text style={[estilos.acao, !!rascunho && estilos.desabilitado]}>Editar</Text>
              </Pressable>
              <Pressable onPress={() => setParaApagar(questao)} disabled={!!rascunho}>
                <Text
                  style={[estilos.acao, { color: cores.erro }, !!rascunho && estilos.desabilitado]}
                >
                  Apagar
                </Text>
              </Pressable>
            </View>
          </View>
        )
      )}

      {rascunho && (
        <View style={[estilos.cartao, estilos.editando]}>
          <Text style={estilos.rotulo}>{rascunho.id ? 'Editar pergunta' : 'Nova pergunta'}</Text>

          <Text style={estilos.label}>Enunciado</Text>
          <TextInput
            style={[estilos.input, estilos.inputGrande]}
            value={rascunho.enunciado}
            onChangeText={(enunciado) => alterar({ enunciado })}
            placeholder="Ex: What is the past of “go”?"
            placeholderTextColor={cores.textoSuave}
            multiline
            autoFocus
          />

          <Text style={estilos.label}>Alternativas (toque no círculo para marcar a certa)</Text>
          {rascunho.alternativas.map((alternativa, i) => {
            const marcada = rascunho.indiceCorreta === i;
            return (
              <View key={alternativa.id ?? `nova-${i}`} style={estilos.linhaAlternativa}>
                <Pressable
                  style={[estilos.radio, marcada && estilos.radioMarcado]}
                  onPress={() => alterar({ indiceCorreta: i })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: marcada }}
                  accessibilityLabel={`Marcar ${LETRAS[i]} como certa`}
                >
                  {marcada && <Text style={estilos.radioTexto}>✓</Text>}
                </Pressable>
                <TextInput
                  style={[estilos.input, estilos.inputAlternativa]}
                  value={alternativa.texto}
                  onChangeText={(texto) => alterarAlternativa(i, texto)}
                  placeholder={`Alternativa ${LETRAS[i]}`}
                  placeholderTextColor={cores.textoSuave}
                />
                {rascunho.alternativas.length > MIN_ALTERNATIVAS && (
                  <Pressable
                    style={estilos.remover}
                    onPress={() => removerAlternativa(i)}
                    accessibilityLabel={`Remover alternativa ${LETRAS[i]}`}
                  >
                    <Text style={[estilos.removerTexto, { color: cores.erro }]}>✕</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {rascunho.alternativas.length < MAX_ALTERNATIVAS && (
            <Pressable
              onPress={() => alterar({ alternativas: [...rascunho.alternativas, { texto: '' }] })}
            >
              <Text style={estilos.acao}>+ Alternativa</Text>
            </Pressable>
          )}

          <Text style={estilos.label}>Explicação (opcional)</Text>
          <TextInput
            style={[estilos.input, estilos.inputGrande]}
            value={rascunho.explicacao}
            onChangeText={(explicacao) => alterar({ explicacao })}
            placeholder="Aparece para o aluno depois que ele responde"
            placeholderTextColor={cores.textoSuave}
            multiline
          />

          {erroRascunho && <Text style={estilos.erro}>{erroRascunho}</Text>}
          <View style={estilos.acoes}>
            <Pressable onPress={() => setRascunho(null)}>
              <Text style={estilos.cancelar}>Cancelar</Text>
            </Pressable>
            <Pressable style={estilos.botaoSalvar} onPress={salvar} disabled={salvando}>
              <Text style={estilos.botaoSalvarTexto}>
                {salvando ? 'Salvando...' : 'Salvar pergunta'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {!rascunho && (
        <Pressable style={estilos.botaoNova} onPress={nova}>
          <Text style={estilos.botaoNovaTexto}>+ Nova pergunta</Text>
        </Pressable>
      )}

      {paraApagar && (
        <JanelaConfirmar
          titulo="Apagar esta pergunta?"
          aviso="As respostas que os alunos já deram para ela também serão apagadas. Não dá para desfazer."
          onConfirmar={async () => {
            const erro = await apagarQuestao(paraApagar.id);
            if (!erro) await carregar();
            return erro;
          }}
          onFechar={() => setParaApagar(null)}
        />
      )}
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    centro: { justifyContent: 'center', alignItems: 'center' },
    container: { padding: 24, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
    titulo: { fontFamily: fontes.titulo, fontSize: 22, color: c.texto },
    subtitulo: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    erro: { fontFamily: fontes.texto, color: c.erro },
    vazio: { fontFamily: fontes.texto, color: c.textoSuave },
    cartao: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      padding: 16,
      gap: 8,
    },
    editando: { borderColor: c.destaque },
    enunciado: { fontFamily: fontes.textoForte, color: c.texto, lineHeight: 22 },
    alternativa: { fontFamily: fontes.texto, color: c.textoSuave, marginLeft: 8 },
    certa: { fontFamily: fontes.textoForte, color: c.destaque },
    explicacao: { fontFamily: fontes.texto, fontSize: 13, color: c.textoSuave, marginTop: 4 },
    acoes: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 20,
      marginTop: 6,
    },
    acao: { fontFamily: fontes.textoForte, fontSize: 13, color: c.destaque },
    desabilitado: { opacity: 0.4 },
    rotulo: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    label: { fontFamily: fontes.textoMedio, color: c.texto, marginTop: 8 },
    input: {
      fontFamily: fontes.texto,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 10,
      color: c.texto,
      backgroundColor: c.fundo,
    },
    inputGrande: { minHeight: 64, textAlignVertical: 'top' },
    linhaAlternativa: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    radio: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.borda,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioMarcado: { borderColor: c.destaque, backgroundColor: c.primaria },
    radioTexto: { fontSize: 13, color: c.sobrePrimaria },
    inputAlternativa: { flex: 1, minWidth: 0 },
    remover: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    removerTexto: { fontFamily: fontes.textoForte, fontSize: 15 },
    cancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    botaoSalvar: {
      backgroundColor: c.primaria,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    botaoSalvarTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria },
    botaoNova: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: c.destaque,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 18,
    },
    botaoNovaTexto: { fontFamily: fontes.textoForte, color: c.destaque },
  });
