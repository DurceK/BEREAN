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
  limparRascunho,
  MAX_ACEITAS,
  MAX_ALTERNATIVAS,
  MAX_PARES,
  MIN_ALTERNATIVAS,
  MIN_PARES,
  nomeDoTipo,
  rascunhoDaQuestao,
  rascunhoVazio,
  salvarQuestao,
  TIPOS,
  validarRascunho,
  type Gabarito,
  type Questao,
  type Rascunho,
  type TipoQuestao,
} from '../../../lib/exercicios';
import { fontes, useEstilos, useTema, type Cores } from '../../../lib/tema';
import { JanelaConfirmar } from '../../../components/Janelas';

const LETRAS = 'ABCDEF';

const EXEMPLOS: Record<TipoQuestao, string> = {
  multipla_escolha: 'Ex: What is the past of “go”?',
  digitar: 'Ex: Traduza: Bom dia.',
  ordenar: 'Ex: Desembaralhe a frase.',
  ligar: 'Ex: Ligue cada frase à sua tradução.',
  livre: 'Ex: Escreva um diálogo curto usando um cumprimento e uma despedida.',
};

export default function EditorExercicio() {
  const { midiaId } = useLocalSearchParams<{ midiaId: string }>();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);

  const [titulo, setTitulo] = useState('');
  const [tituloSalvo, setTituloSalvo] = useState('');
  const [avisoTitulo, setAvisoTitulo] = useState<string | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [gabarito, setGabarito] = useState<Record<string, Gabarito>>({});
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
      setTituloSalvo(resMidia.data?.titulo ?? '');
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

  // O título do exercício é salvo ao sair do campo (ou ao apertar Enter)
  async function salvarTitulo() {
    const novo = titulo.trim();
    if (novo === tituloSalvo) return;
    const { error } = await supabase
      .from('midias')
      .update({ titulo: novo || null })
      .eq('id', midiaId);
    if (error) {
      setAvisoTitulo('Não foi possível salvar o título.');
      return;
    }
    setTituloSalvo(novo);
    setAvisoTitulo('Título salvo.');
  }

  function editar(questao: Questao) {
    setErroRascunho(null);
    setIdsOriginais(
      questao.tipo === 'multipla_escolha' ? questao.alternativas.map((a) => a.id) : []
    );
    setRascunho(rascunhoDaQuestao(questao, gabarito[questao.id]));
  }

  function nova() {
    setErroRascunho(null);
    setIdsOriginais([]);
    const proxima = questoes.reduce((maior, q) => Math.max(maior, q.ordem), -1) + 1;
    setRascunho(rascunhoVazio(proxima, 'multipla_escolha'));
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
    const marcada = rascunho.indiceCorreta;
    if (
      rascunho.tipo === 'multipla_escolha' &&
      marcada !== null &&
      !rascunho.alternativas[marcada]?.texto.trim()
    ) {
      setErroRascunho('A alternativa marcada como certa está vazia.');
      return;
    }
    // Linhas deixadas em branco são descartadas antes de salvar
    const limpo = limparRascunho(rascunho);
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

  const ajudaDoTipo = rascunho ? TIPOS.find((t) => t.tipo === rascunho.tipo)?.ajuda : null;

  return (
    <ScrollView style={estilos.fundo} contentContainerStyle={estilos.container}>
      <TextInput
        style={[estilos.titulo, estilos.tituloEditavel]}
        value={titulo}
        onChangeText={(texto) => {
          setTitulo(texto);
          setAvisoTitulo(null);
        }}
        onBlur={salvarTitulo}
        onSubmitEditing={salvarTitulo}
        placeholder="Título do exercício (opcional)"
        placeholderTextColor={cores.textoSuave}
        accessibilityLabel="Título do exercício"
      />
      {avisoTitulo && <Text style={estilos.aviso}>{avisoTitulo}</Text>}
      <Text style={estilos.subtitulo}>
        Perguntas de vários tipos. O aluno vê na hora se acertou e qual era a resposta certa.
      </Text>
      {erroLista && <Text style={estilos.erro}>{erroLista}</Text>}

      {questoes.length === 0 && !rascunho && (
        <Text style={estilos.vazio}>Nenhuma pergunta ainda. Toque em “+ Nova pergunta”.</Text>
      )}

      {questoes.map((questao, numero) =>
        rascunho?.id === questao.id ? null : (
          <View key={questao.id} style={estilos.cartao}>
            <Text style={estilos.tipo}>{nomeDoTipo(questao.tipo)}</Text>
            <Text style={estilos.enunciado}>
              {numero + 1}. {questao.enunciado}
            </Text>
            <ResumoDoGabarito questao={questao} gabarito={gabarito[questao.id]} />
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

          {/* O tipo só é escolhido ao criar; depois fica fixo */}
          {rascunho.id ? (
            <Text style={estilos.tipo}>{nomeDoTipo(rascunho.tipo)}</Text>
          ) : (
            <View style={estilos.tipos}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t.tipo}
                  style={[estilos.chip, rascunho.tipo === t.tipo && estilos.chipAtivo]}
                  onPress={() => alterar({ tipo: t.tipo })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: rascunho.tipo === t.tipo }}
                >
                  <Text
                    style={[estilos.chipTexto, rascunho.tipo === t.tipo && estilos.chipTextoAtivo]}
                  >
                    {t.nome}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {!!ajudaDoTipo && <Text style={estilos.ajuda}>{ajudaDoTipo}</Text>}

          <Text style={estilos.label}>Enunciado</Text>
          <TextInput
            style={[estilos.input, estilos.inputGrande]}
            value={rascunho.enunciado}
            onChangeText={(enunciado) => alterar({ enunciado })}
            placeholder={EXEMPLOS[rascunho.tipo]}
            placeholderTextColor={cores.textoSuave}
            multiline
          />

          {rascunho.tipo === 'multipla_escolha' && (
            <>
              <Text style={estilos.label}>Alternativas (toque no círculo para marcar a certa)</Text>
              {rascunho.alternativas.map((alternativa, i) => {
                const marcada = rascunho.indiceCorreta === i;
                return (
                  <View key={alternativa.id ?? `nova-${i}`} style={estilos.linha}>
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
                      style={[estilos.input, estilos.inputLinha]}
                      value={alternativa.texto}
                      onChangeText={(texto) => alterarAlternativa(i, texto)}
                      placeholder={`Alternativa ${LETRAS[i]}`}
                      placeholderTextColor={cores.textoSuave}
                    />
                    {rascunho.alternativas.length > MIN_ALTERNATIVAS && (
                      <BotaoRemover
                        rotulo={`Remover alternativa ${LETRAS[i]}`}
                        onPress={() => removerAlternativa(i)}
                      />
                    )}
                  </View>
                );
              })}
              {rascunho.alternativas.length < MAX_ALTERNATIVAS && (
                <Pressable
                  onPress={() =>
                    alterar({ alternativas: [...rascunho.alternativas, { texto: '' }] })
                  }
                >
                  <Text style={estilos.acao}>+ Alternativa</Text>
                </Pressable>
              )}
            </>
          )}

          {rascunho.tipo === 'digitar' && (
            <>
              <Text style={estilos.label}>
                Respostas aceitas (a primeira é a que o aluno vê se errar)
              </Text>
              {rascunho.aceitas.map((aceita, i) => (
                <View key={i} style={estilos.linha}>
                  <TextInput
                    style={[estilos.input, estilos.inputLinha]}
                    value={aceita}
                    onChangeText={(texto) =>
                      alterar({
                        aceitas: rascunho.aceitas.map((a, j) => (j === i ? texto : a)),
                      })
                    }
                    placeholder={i === 0 ? 'Ex: Good morning.' : 'Outra forma aceita'}
                    placeholderTextColor={cores.textoSuave}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {rascunho.aceitas.length > 1 && (
                    <BotaoRemover
                      rotulo="Remover resposta"
                      onPress={() =>
                        alterar({ aceitas: rascunho.aceitas.filter((_, j) => j !== i) })
                      }
                    />
                  )}
                </View>
              ))}
              {rascunho.aceitas.length < MAX_ACEITAS && (
                <Pressable onPress={() => alterar({ aceitas: [...rascunho.aceitas, ''] })}>
                  <Text style={estilos.acao}>+ Outra resposta aceita</Text>
                </Pressable>
              )}
            </>
          )}

          {rascunho.tipo === 'ordenar' && (
            <>
              <Text style={estilos.label}>Frase na ordem certa</Text>
              <TextInput
                style={estilos.input}
                value={rascunho.frase}
                onChangeText={(frase) => alterar({ frase })}
                placeholder="Ex: My name is John."
                placeholderTextColor={cores.textoSuave}
                autoCorrect={false}
              />
            </>
          )}

          {rascunho.tipo === 'ligar' && (
            <>
              <Text style={estilos.label}>Pares (esquerda ↔ direita)</Text>
              {rascunho.pares.map((par, i) => (
                <View key={i} style={estilos.linha}>
                  <TextInput
                    style={[estilos.input, estilos.inputLinha]}
                    value={par.esquerda}
                    onChangeText={(esquerda) =>
                      alterar({
                        pares: rascunho.pares.map((p, j) => (j === i ? { ...p, esquerda } : p)),
                      })
                    }
                    placeholder="Ex: Take care!"
                    placeholderTextColor={cores.textoSuave}
                    autoCorrect={false}
                  />
                  <Text style={estilos.seta}>↔</Text>
                  <TextInput
                    style={[estilos.input, estilos.inputLinha]}
                    value={par.direita}
                    onChangeText={(direita) =>
                      alterar({
                        pares: rascunho.pares.map((p, j) => (j === i ? { ...p, direita } : p)),
                      })
                    }
                    placeholder="Ex: Se cuida!"
                    placeholderTextColor={cores.textoSuave}
                    autoCorrect={false}
                  />
                  {rascunho.pares.length > MIN_PARES && (
                    <BotaoRemover
                      rotulo="Remover par"
                      onPress={() => alterar({ pares: rascunho.pares.filter((_, j) => j !== i) })}
                    />
                  )}
                </View>
              ))}
              {rascunho.pares.length < MAX_PARES && (
                <Pressable
                  onPress={() =>
                    alterar({ pares: [...rascunho.pares, { esquerda: '', direita: '' }] })
                  }
                >
                  <Text style={estilos.acao}>+ Par</Text>
                </Pressable>
              )}
            </>
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

// Mostra, na lista, qual é a resposta certa de cada pergunta
function ResumoDoGabarito({ questao, gabarito }: { questao: Questao; gabarito?: Gabarito }) {
  const estilos = useEstilos(criarEstilos);
  const textoDe = (id: string) => questao.alternativas.find((a) => a.id === id)?.texto ?? '?';

  switch (questao.tipo) {
    case 'multipla_escolha':
      return (
        <>
          {questao.alternativas.map((alternativa, i) => {
            const certa = gabarito?.alternativaCorreta === alternativa.id;
            return (
              <Text key={alternativa.id} style={[estilos.alternativa, certa && estilos.certa]}>
                {LETRAS[i]}) {alternativa.texto}
                {certa ? '  ✓' : ''}
              </Text>
            );
          })}
        </>
      );
    case 'digitar':
      return (
        <Text style={[estilos.alternativa, estilos.certa]}>
          ✓ {gabarito?.aceitas.join('  |  ') || '(sem resposta cadastrada)'}
        </Text>
      );
    case 'ordenar':
      return (
        <Text style={[estilos.alternativa, estilos.certa]}>✓ {gabarito?.aceitas[0] ?? '?'}</Text>
      );
    case 'ligar':
      return (
        <>
          {questao.alternativas
            .filter((a) => a.lado === 'esquerda')
            .map((e) => (
              <Text key={e.id} style={estilos.alternativa}>
                {e.texto} ↔ {textoDe(gabarito?.pares[e.id] ?? '')}
              </Text>
            ))}
        </>
      );
    default:
      return <Text style={estilos.alternativa}>Você lê as respostas na ficha de cada aluno.</Text>;
  }
}

function BotaoRemover({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  return (
    <Pressable style={estilos.remover} onPress={onPress} accessibilityLabel={rotulo}>
      <Text style={[estilos.removerTexto, { color: cores.erro }]}>✕</Text>
    </Pressable>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    centro: { justifyContent: 'center', alignItems: 'center' },
    container: { padding: 24, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
    titulo: { fontFamily: fontes.titulo, fontSize: 22, color: c.texto },
    tituloEditavel: {
      borderBottomWidth: 1,
      borderBottomColor: c.borda,
      paddingVertical: 6,
    },
    aviso: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave },
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
    tipo: {
      fontFamily: fontes.textoForte,
      fontSize: 11,
      color: c.textoSuave,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    chipAtivo: { borderColor: c.destaque, backgroundColor: c.primaria },
    chipTexto: { fontFamily: fontes.textoMedio, fontSize: 13, color: c.texto },
    chipTextoAtivo: { color: c.sobrePrimaria },
    ajuda: { fontFamily: fontes.texto, fontSize: 13, color: c.textoSuave, lineHeight: 19 },
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
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seta: { fontFamily: fontes.textoForte, color: c.textoSuave },
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
    inputLinha: { flex: 1, minWidth: 0 },
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
