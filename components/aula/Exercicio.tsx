// Exercício de múltipla escolha dentro da aula. O aluno vê na hora se acertou.
// Na pré-visualização do mentor, a correção usa o gabarito local e nada é gravado.
import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  carregarGabarito,
  carregarQuestoes,
  responderQuestao,
  type Correcao,
  type Questao,
} from '../../lib/exercicios';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';

const LETRAS = 'ABCDEF';

type Props = {
  id: string; // id da mídia do tipo 'exercicio'
  previa?: boolean;
  onTerminar?: (id: string) => void;
};

type Resposta = { escolhida: string; correcao: Correcao };

export function Exercicio({ id, previa = false, onTerminar }: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [gabarito, setGabarito] = useState<Record<string, string>>({});
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const avisouFim = useRef(false);
  const terminar = useRef(onTerminar);

  useEffect(() => {
    terminar.current = onTerminar;
  }, [onTerminar]);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const lista = await carregarQuestoes(id);
        const mapa = previa ? await carregarGabarito(lista.map((q) => q.id)) : {};
        if (cancelado) return;
        setQuestoes(lista);
        setGabarito(mapa);
        // Exercício ainda sem perguntas não pode travar a conclusão da aula
        if (lista.length === 0 && !avisouFim.current) {
          avisouFim.current = true;
          terminar.current?.(id);
        }
      } catch {
        if (!cancelado) setErro('Não foi possível carregar o exercício.');
      }
      if (!cancelado) setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [id, previa]);

  async function responder(questao: Questao, alternativaId: string) {
    if (respostas[questao.id] || enviando) return;
    setErro(null);
    setEnviando(questao.id);
    try {
      const correcao: Correcao = previa
        ? {
            correta: gabarito[questao.id] === alternativaId,
            alternativaCorreta: gabarito[questao.id],
            explicacao: questao.explicacao,
          }
        : await responderQuestao(questao.id, alternativaId);
      const novas = { ...respostas, [questao.id]: { escolhida: alternativaId, correcao } };
      setRespostas(novas);
      if (!avisouFim.current && questoes.every((q) => novas[q.id])) {
        avisouFim.current = true;
        onTerminar?.(id);
      }
    } catch {
      setErro('Não foi possível enviar a resposta. Verifique a conexão e tente de novo.');
    }
    setEnviando(null);
  }

  if (carregando) return <ActivityIndicator color={cores.primaria} />;
  if (questoes.length === 0) {
    return <Text style={estilos.vazio}>Este exercício ainda não tem perguntas.</Text>;
  }

  const respondidas = Object.keys(respostas).length;
  const acertos = Object.values(respostas).filter((r) => r.correcao.correta).length;
  const terminou = respondidas === questoes.length;

  return (
    <View style={estilos.caixa}>
      {questoes.map((questao, numero) => {
        const resposta = respostas[questao.id];
        return (
          <View key={questao.id} style={estilos.questao}>
            <Text style={estilos.enunciado}>
              {numero + 1}. {questao.enunciado}
            </Text>
            {questao.alternativas.map((alternativa, i) => {
              const escolhida = resposta?.escolhida === alternativa.id;
              const certa = resposta?.correcao.alternativaCorreta === alternativa.id;
              return (
                <Pressable
                  key={alternativa.id}
                  style={[
                    estilos.alternativa,
                    resposta && certa && estilos.alternativaCerta,
                    resposta && escolhida && !certa && estilos.alternativaErrada,
                    resposta && !certa && !escolhida && estilos.alternativaApagada,
                  ]}
                  disabled={!!resposta || enviando === questao.id}
                  onPress={() => responder(questao, alternativa.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Alternativa ${LETRAS[i]}: ${alternativa.texto}`}
                >
                  <Text style={estilos.letra}>{LETRAS[i]}</Text>
                  <Text style={estilos.alternativaTexto}>{alternativa.texto}</Text>
                  {resposta && certa && <Text style={estilos.marca}>✓</Text>}
                  {resposta && escolhida && !certa && (
                    <Text style={[estilos.marca, { color: cores.erro }]}>✕</Text>
                  )}
                </Pressable>
              );
            })}
            {resposta && (
              <View style={estilos.retorno}>
                <Text
                  style={[
                    estilos.retornoTitulo,
                    { color: resposta.correcao.correta ? cores.destaque : cores.erro },
                  ]}
                >
                  {resposta.correcao.correta ? 'Você acertou!' : 'Não foi dessa vez.'}
                </Text>
                {!!resposta.correcao.explicacao && (
                  <Text style={estilos.retornoTexto}>{resposta.correcao.explicacao}</Text>
                )}
              </View>
            )}
          </View>
        );
      })}

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      {terminou && (
        <View style={estilos.resultado}>
          <Text style={estilos.resultadoTexto}>
            Você acertou {acertos} de {questoes.length}.
          </Text>
          <Pressable onPress={() => setRespostas({})}>
            <Text style={estilos.refazer}>Refazer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    caixa: { gap: 20 },
    vazio: { fontFamily: fontes.texto, color: c.textoSuave },
    questao: { gap: 8 },
    enunciado: { fontFamily: fontes.textoForte, fontSize: 16, color: c.texto, lineHeight: 23 },
    alternativa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.fundo,
    },
    alternativaCerta: { borderColor: c.destaque, borderWidth: 2 },
    alternativaErrada: { borderColor: c.erro, borderWidth: 2 },
    alternativaApagada: { opacity: 0.5 },
    letra: { fontFamily: fontes.textoForte, color: c.destaque, width: 16 },
    alternativaTexto: { flex: 1, minWidth: 0, fontFamily: fontes.texto, color: c.texto },
    marca: { fontFamily: fontes.textoForte, color: c.destaque, fontSize: 16 },
    retorno: { gap: 4, paddingLeft: 4 },
    retornoTitulo: { fontFamily: fontes.textoForte },
    retornoTexto: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    erro: { fontFamily: fontes.texto, color: c.erro },
    resultado: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borda,
    },
    resultadoTexto: { fontFamily: fontes.tituloLeve, fontSize: 17, color: c.texto },
    refazer: { fontFamily: fontes.textoForte, color: c.destaque },
  });
