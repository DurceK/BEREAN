// Exercício dentro da aula, com perguntas de vários tipos. O aluno vê na hora se acertou.
// Na pré-visualização do mentor, a correção usa o gabarito local e nada é gravado.
import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  carregarGabarito,
  carregarQuestoes,
  corrigirLocal,
  responderQuestao,
  type Correcao,
  type Gabarito,
  type Questao,
  type Resposta,
} from '../../lib/exercicios';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';
import { PerguntaDigitar, PerguntaLigar, PerguntaLivre, PerguntaOrdenar } from './Perguntas';

const LETRAS = 'ABCDEF';

type Props = {
  id: string; // id da mídia do tipo 'exercicio'
  previa?: boolean;
  onTerminar?: (id: string) => void;
};

type Respondida = { resposta: Resposta; correcao: Correcao };

export function Exercicio({ id, previa = false, onTerminar }: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [gabarito, setGabarito] = useState<Record<string, Gabarito>>({});
  const [respostas, setRespostas] = useState<Record<string, Respondida>>({});
  const [rodada, setRodada] = useState(0); // muda ao refazer, para limpar o que foi digitado
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

  async function responder(questao: Questao, resposta: Resposta) {
    if (respostas[questao.id] || enviando) return;
    setErro(null);
    setEnviando(questao.id);
    try {
      const correcao = previa
        ? corrigirLocal(questao, gabarito[questao.id], resposta)
        : await responderQuestao(questao.id, resposta);
      const novas = { ...respostas, [questao.id]: { resposta, correcao } };
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

  const respondidas = Object.values(respostas);
  const corrigidas = respondidas.filter((r) => r.correcao.correta !== null);
  const acertos = corrigidas.filter((r) => r.correcao.correta).length;
  const terminou = respondidas.length === questoes.length;

  return (
    <View style={estilos.caixa}>
      {questoes.map((questao, numero) => {
        const feita = respostas[questao.id];
        const props = {
          questao,
          correcao: feita?.correcao ?? null,
          enviando: enviando === questao.id,
          onResponder: (resposta: Resposta) => responder(questao, resposta),
        };
        return (
          <View key={`${questao.id}-${rodada}`} style={estilos.questao}>
            <Text style={estilos.enunciado}>
              {numero + 1}. {questao.enunciado}
            </Text>
            {questao.tipo === 'multipla_escolha' && (
              <MultiplaEscolha {...props} escolhida={feita?.resposta.alternativa ?? null} />
            )}
            {questao.tipo === 'digitar' && <PerguntaDigitar {...props} />}
            {questao.tipo === 'ordenar' && <PerguntaOrdenar {...props} />}
            {questao.tipo === 'ligar' && <PerguntaLigar {...props} />}
            {questao.tipo === 'livre' && <PerguntaLivre {...props} />}
            {feita && <Retorno correcao={feita.correcao} />}
          </View>
        );
      })}

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      {terminou && (
        <View style={estilos.resultado}>
          <Text style={estilos.resultadoTexto}>
            {corrigidas.length > 0
              ? `Você acertou ${acertos} de ${corrigidas.length}.`
              : 'Respostas enviadas.'}
          </Text>
          <Pressable
            onPress={() => {
              setRespostas({});
              setRodada((r) => r + 1);
            }}
          >
            <Text style={estilos.refazer}>Refazer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function MultiplaEscolha({
  questao,
  correcao,
  enviando,
  escolhida,
  onResponder,
}: {
  questao: Questao;
  correcao: Correcao | null;
  enviando: boolean;
  escolhida: string | null;
  onResponder: (r: Resposta) => void;
}) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  return (
    <>
      {questao.alternativas.map((alternativa, i) => {
        const foiEscolhida = escolhida === alternativa.id;
        const certa = correcao?.alternativaCorreta === alternativa.id;
        return (
          <Pressable
            key={alternativa.id}
            style={[
              estilos.alternativa,
              correcao && certa && estilos.alternativaCerta,
              correcao && foiEscolhida && !certa && estilos.alternativaErrada,
              correcao && !certa && !foiEscolhida && estilos.alternativaApagada,
            ]}
            disabled={!!correcao || enviando}
            onPress={() => onResponder({ alternativa: alternativa.id })}
            accessibilityRole="button"
            accessibilityLabel={`Alternativa ${LETRAS[i]}: ${alternativa.texto}`}
          >
            <Text style={estilos.letra}>{LETRAS[i]}</Text>
            <Text style={estilos.alternativaTexto}>{alternativa.texto}</Text>
            {correcao && certa && <Text style={estilos.marca}>✓</Text>}
            {correcao && foiEscolhida && !certa && (
              <Text style={[estilos.marca, { color: cores.erro }]}>✕</Text>
            )}
          </Pressable>
        );
      })}
    </>
  );
}

// Mensagem depois de responder: acertou/errou, a resposta certa e a explicação
function Retorno({ correcao }: { correcao: Correcao }) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const livre = correcao.correta === null;
  return (
    <View style={estilos.retorno}>
      <Text
        style={[
          estilos.retornoTitulo,
          { color: livre || correcao.correta ? cores.destaque : cores.erro },
        ]}
      >
        {livre ? 'Resposta enviada.' : correcao.correta ? 'Você acertou!' : 'Não foi dessa vez.'}
      </Text>
      {correcao.correta === false && !!correcao.respostaCerta && (
        <Text style={estilos.retornoTexto}>Resposta certa: {correcao.respostaCerta}</Text>
      )}
      {!!correcao.explicacao && <Text style={estilos.retornoTexto}>{correcao.explicacao}</Text>}
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
