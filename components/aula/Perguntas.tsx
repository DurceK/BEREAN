// Perguntas dos tipos digitar, ordenar palavras, ligar colunas e resposta livre.
// Cada uma guarda o que o aluno está montando e chama onResponder ao conferir.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { Correcao, Questao, Resposta } from '../../lib/exercicios';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';

type Props = {
  questao: Questao;
  correcao: Correcao | null;
  enviando: boolean;
  onResponder: (resposta: Resposta) => void;
};

function BotaoConferir({
  rotulo = 'Conferir',
  habilitado,
  enviando,
  onPress,
}: {
  rotulo?: string;
  habilitado: boolean;
  enviando: boolean;
  onPress: () => void;
}) {
  const estilos = useEstilos(criarEstilos);
  return (
    <Pressable
      style={[estilos.botao, (!habilitado || enviando) && estilos.desabilitado]}
      disabled={!habilitado || enviando}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={estilos.botaoTexto}>{enviando ? 'Enviando...' : rotulo}</Text>
    </Pressable>
  );
}

// O aluno digita a resposta (copiar, completar, traduzir)
export function PerguntaDigitar({ correcao, enviando, onResponder }: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [texto, setTexto] = useState('');
  const pronto = !!texto.trim();
  const conferir = () => pronto && onResponder({ texto: texto.trim() });

  return (
    <View style={estilos.grupo}>
      <TextInput
        style={[
          estilos.input,
          correcao?.correta === true && estilos.certo,
          correcao?.correta === false && estilos.errado,
        ]}
        value={texto}
        onChangeText={setTexto}
        editable={!correcao && !enviando}
        placeholder="Digite sua resposta"
        placeholderTextColor={cores.textoSuave}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        onSubmitEditing={conferir}
      />
      {!correcao && <BotaoConferir habilitado={pronto} enviando={enviando} onPress={conferir} />}
    </View>
  );
}

// O aluno toca nas palavras embaralhadas, na ordem certa, para montar a frase
export function PerguntaOrdenar({ questao, correcao, enviando, onResponder }: Props) {
  const estilos = useEstilos(criarEstilos);
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const palavras = questao.alternativas;
  const textoDe = (id: string) => palavras.find((p) => p.id === id)?.texto ?? '';
  const restantes = palavras.filter((p) => !escolhidas.includes(p.id));
  const travado = !!correcao || enviando;

  return (
    <View style={estilos.grupo}>
      <View
        style={[
          estilos.montagem,
          correcao?.correta === true && estilos.certo,
          correcao?.correta === false && estilos.errado,
        ]}
      >
        {escolhidas.length === 0 && (
          <Text style={estilos.dica}>Toque nas palavras abaixo, na ordem certa</Text>
        )}
        {escolhidas.map((id) => (
          <Pressable
            key={id}
            style={estilos.palavra}
            disabled={travado}
            onPress={() => setEscolhidas((atual) => atual.filter((e) => e !== id))}
          >
            <Text style={estilos.palavraTexto}>{textoDe(id)}</Text>
          </Pressable>
        ))}
      </View>
      {restantes.length > 0 && (
        <View style={estilos.banco}>
          {restantes.map((p) => (
            <Pressable
              key={p.id}
              style={[estilos.palavra, estilos.palavraBanco]}
              disabled={travado}
              onPress={() => setEscolhidas((atual) => [...atual, p.id])}
            >
              <Text style={estilos.palavraTexto}>{p.texto}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!correcao && (
        <BotaoConferir
          habilitado={restantes.length === 0}
          enviando={enviando}
          onPress={() => onResponder({ texto: escolhidas.map(textoDe).join(' ') })}
        />
      )}
    </View>
  );
}

// O aluno toca num item da esquerda e depois no par dele na direita
export function PerguntaLigar({ questao, correcao, enviando, onResponder }: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [pares, setPares] = useState<Record<string, string>>({});
  const esquerda = questao.alternativas.filter((a) => a.lado === 'esquerda');
  const direita = questao.alternativas.filter((a) => a.lado === 'direita');
  const travado = !!correcao || enviando;
  const numeroDe = (esquerdaId: string) => esquerda.findIndex((e) => e.id === esquerdaId) + 1;
  const textoDe = (id: string) => direita.find((d) => d.id === id)?.texto ?? '';
  const completos = esquerda.every((e) => pares[e.id]);

  function ligar(direitaId: string) {
    if (!selecionada) return;
    setPares((atual) => {
      const novo: Record<string, string> = {};
      // um item da direita só pode estar ligado a um da esquerda
      for (const [e, d] of Object.entries(atual)) if (d !== direitaId) novo[e] = d;
      novo[selecionada] = direitaId;
      return novo;
    });
    setSelecionada(null);
  }

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.dica}>Toque num item da esquerda e depois no par dele na direita.</Text>
      <View style={estilos.colunas}>
        <View style={estilos.coluna}>
          {esquerda.map((e, i) => {
            const certo = correcao ? correcao.paresCorretos[e.id] === pares[e.id] : null;
            return (
              <View key={e.id} style={estilos.grupoItem}>
                <Pressable
                  style={[
                    estilos.item,
                    selecionada === e.id && estilos.itemSelecionado,
                    certo === true && estilos.certo,
                    certo === false && estilos.errado,
                  ]}
                  disabled={travado}
                  onPress={() => setSelecionada(selecionada === e.id ? null : e.id)}
                >
                  <Text style={estilos.numero}>{i + 1}</Text>
                  <Text style={estilos.itemTexto}>{e.texto}</Text>
                </Pressable>
                {certo === false && (
                  <Text style={[estilos.correcaoPar, { color: cores.erro }]}>
                    → {textoDe(correcao!.paresCorretos[e.id])}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={estilos.coluna}>
          {direita.map((d) => {
            const dono = Object.keys(pares).find((e) => pares[e] === d.id);
            return (
              <Pressable
                key={d.id}
                style={[estilos.item, !!dono && estilos.itemLigado]}
                disabled={travado || !selecionada}
                onPress={() => ligar(d.id)}
              >
                <Text style={estilos.numero}>{dono ? numeroDe(dono) : ' '}</Text>
                <Text style={estilos.itemTexto}>{d.texto}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {!correcao && (
        <BotaoConferir
          habilitado={completos}
          enviando={enviando}
          onPress={() =>
            onResponder({
              pares: Object.entries(pares).map(([e, d]) => ({ esquerda: e, direita: d })),
            })
          }
        />
      )}
    </View>
  );
}

// O aluno escreve livremente; o mentor lê a resposta na ficha do aluno
export function PerguntaLivre({ correcao, enviando, onResponder }: Props) {
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [texto, setTexto] = useState('');
  return (
    <View style={estilos.grupo}>
      <TextInput
        style={[estilos.input, estilos.inputGrande]}
        value={texto}
        onChangeText={setTexto}
        editable={!correcao && !enviando}
        placeholder="Escreva sua resposta"
        placeholderTextColor={cores.textoSuave}
        multiline
        maxLength={2000}
      />
      {!correcao && (
        <BotaoConferir
          rotulo="Enviar"
          habilitado={!!texto.trim()}
          enviando={enviando}
          onPress={() => onResponder({ texto: texto.trim() })}
        />
      )}
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    grupo: { gap: 10 },
    dica: { fontFamily: fontes.texto, fontSize: 13, color: c.textoSuave },
    input: {
      fontFamily: fontes.texto,
      fontSize: 16,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 12,
      color: c.texto,
      backgroundColor: c.fundo,
    },
    inputGrande: { minHeight: 120, textAlignVertical: 'top' },
    certo: { borderColor: c.destaque, borderWidth: 2 },
    errado: { borderColor: c.erro, borderWidth: 2 },
    botao: {
      alignSelf: 'flex-start',
      backgroundColor: c.primaria,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
    },
    botaoTexto: { fontFamily: fontes.textoForte, color: c.sobrePrimaria },
    desabilitado: { opacity: 0.4 },
    montagem: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      minHeight: 52,
      padding: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.borda,
      borderRadius: 8,
    },
    banco: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    palavra: {
      borderWidth: 1,
      borderColor: c.destaque,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: c.superficie,
    },
    palavraBanco: { backgroundColor: c.fundo },
    palavraTexto: { fontFamily: fontes.textoMedio, color: c.texto },
    colunas: { flexDirection: 'row', gap: 10 },
    coluna: { flex: 1, minWidth: 0, gap: 8 },
    grupoItem: { gap: 2 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: c.fundo,
    },
    itemSelecionado: { borderColor: c.primaria, borderWidth: 2 },
    itemLigado: { backgroundColor: c.superficie },
    numero: { fontFamily: fontes.textoForte, color: c.destaque, width: 14 },
    itemTexto: { flex: 1, minWidth: 0, fontFamily: fontes.texto, color: c.texto },
    correcaoPar: { fontFamily: fontes.texto, fontSize: 13, paddingLeft: 4 },
  });
