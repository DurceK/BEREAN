import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { fontes, useEstilos, useTema, type Cores } from '../../../lib/tema';
import { FotoPessoa } from '../../../components/FotoPessoa';

type Aula = { id: string; titulo: string; ordem: number };
type Modulo = { id: string; nome: string; ordem: number; aulas: Aula[] };
type Categoria = { id: string; nome: string; modulos: Modulo[] };
type Progresso = { status: 'em_andamento' | 'concluido'; atualizado_em: string };
type Aluno = { nome: string; matricula: string; avatar_url: string | null };

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function haQuanto(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

function porcentagem(parte: number, total: number) {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

export default function FichaAluno() {
  const { alunoId } = useLocalSearchParams<{ alunoId: string }>();
  const { usuario } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [progresso, setProgresso] = useState<Record<string, Progresso>>({});
  // Acertos nos exercícios de cada aula (1ª tentativa)
  const [exercicios, setExercicios] = useState<
    Record<string, { acertos: number; respondidas: number }>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      let cancelado = false;

      async function carregar() {
        const [resAluno, resInscricoes, resProgresso, resRespostas] = await Promise.all([
          supabase
            .from('usuarios')
            .select('nome, matricula, avatar_url')
            .eq('id', alunoId)
            .single(),
          supabase
            .from('inscricoes')
            .select(
              'categorias!inner(id, nome, mentor_id, modulos(id, nome, ordem, aulas(id, titulo, ordem)))'
            )
            .eq('mentorado_id', alunoId)
            .eq('categorias.mentor_id', usuario!.id),
          supabase
            .from('progresso')
            .select('aula_id, status, atualizado_em')
            .eq('mentorado_id', alunoId),
          // 1ª tentativa de cada pergunta respondida, com a aula a que pertence
          supabase
            .from('respostas')
            .select('correta, questoes!inner(midias!inner(aula_id))')
            .eq('mentorado_id', alunoId),
        ]);
        if (cancelado) return;

        if (resAluno.error || resInscricoes.error || resProgresso.error) {
          setErro('Não foi possível carregar os dados deste aluno.');
          setCarregando(false);
          return;
        }

        const lista = (resInscricoes.data ?? [])
          .map((linha) => linha.categorias as unknown as Categoria)
          .filter(Boolean)
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .map((c) => ({
            ...c,
            modulos: [...c.modulos]
              .sort((a, b) => a.ordem - b.ordem)
              .map((m) => ({ ...m, aulas: [...m.aulas].sort((a, b) => a.ordem - b.ordem) })),
          }));

        const mapa: Record<string, Progresso> = {};
        for (const linha of resProgresso.data ?? []) {
          mapa[linha.aula_id] = { status: linha.status, atualizado_em: linha.atualizado_em };
        }

        const porAula: Record<string, { acertos: number; respondidas: number }> = {};
        for (const linha of resRespostas.data ?? []) {
          const questao = linha.questoes as unknown as { midias: { aula_id: string } } | null;
          const aulaId = questao?.midias?.aula_id;
          if (!aulaId) continue;
          const atual = porAula[aulaId] ?? { acertos: 0, respondidas: 0 };
          atual.respondidas += 1;
          if (linha.correta) atual.acertos += 1;
          porAula[aulaId] = atual;
        }

        setAluno(resAluno.data);
        setCategorias(lista);
        setProgresso(mapa);
        setExercicios(porAula);
        setErro(null);
        setCarregando(false);
      }

      carregar();
      return () => {
        cancelado = true;
      };
    }, [alunoId, usuario])
  );

  if (carregando) {
    return (
      <View style={[estilos.fundo, estilos.centro]}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  if (erro || !aluno) {
    return (
      <View style={[estilos.fundo, estilos.centro]}>
        <Text style={estilos.erro}>{erro ?? 'Aluno não encontrado.'}</Text>
      </View>
    );
  }

  const todasAsAulas = categorias.flatMap((c) => c.modulos.flatMap((m) => m.aulas));
  const concluidas = todasAsAulas.filter((a) => progresso[a.id]?.status === 'concluido').length;
  const emAndamento = todasAsAulas.filter((a) => progresso[a.id]?.status === 'em_andamento').length;
  const naoIniciadas = todasAsAulas.length - concluidas - emAndamento;
  const datas = todasAsAulas
    .map((a) => progresso[a.id]?.atualizado_em)
    .filter((d): d is string => !!d);
  const ultimaAtividade = datas.sort().at(-1);
  const percentual = porcentagem(concluidas, todasAsAulas.length);

  return (
    <ScrollView style={estilos.fundo} contentContainerStyle={estilos.container}>
      <View style={estilos.topo}>
        <FotoPessoa nome={aluno.nome} caminho={aluno.avatar_url} tamanho={72} />
        <View style={estilos.topoTexto}>
          <Text style={estilos.nome}>{aluno.nome}</Text>
          <Text style={estilos.matricula}>Matrícula {aluno.matricula}</Text>
          <Text style={estilos.atividade}>
            {ultimaAtividade
              ? `Última atividade ${haQuanto(ultimaAtividade)}`
              : 'Ainda não abriu nenhuma aula'}
          </Text>
        </View>
      </View>

      <View style={estilos.resumo}>
        <View style={estilos.resumoLinha}>
          <Text style={estilos.resumoRotulo}>Progresso geral</Text>
          <Text style={estilos.resumoPercentual}>{percentual}%</Text>
        </View>
        <Barra fracao={percentual / 100} estilos={estilos} />
        <View style={estilos.numeros}>
          <Numero valor={concluidas} rotulo="Concluídas" estilos={estilos} />
          <Numero valor={emAndamento} rotulo="Em andamento" estilos={estilos} />
          <Numero valor={naoIniciadas} rotulo="Não iniciadas" estilos={estilos} />
        </View>
      </View>

      {categorias.map((categoria) => {
        const aulas = categoria.modulos.flatMap((m) => m.aulas);
        const feitas = aulas.filter((a) => progresso[a.id]?.status === 'concluido').length;
        return (
          <View key={categoria.id} style={estilos.categoria}>
            <View style={estilos.resumoLinha}>
              <Text style={estilos.categoriaTitulo}>{categoria.nome}</Text>
              <Text style={estilos.categoriaContagem}>
                {feitas} de {aulas.length}
              </Text>
            </View>
            <Barra fracao={aulas.length ? feitas / aulas.length : 0} estilos={estilos} />

            {categoria.modulos.map((modulo) => (
              <View key={modulo.id} style={estilos.modulo}>
                <Text style={estilos.moduloTitulo}>{modulo.nome}</Text>
                {modulo.aulas.length === 0 && <Text style={estilos.semAulas}>Sem aulas ainda</Text>}
                {modulo.aulas.map((aula) => {
                  const p = progresso[aula.id];
                  return (
                    <View key={aula.id} style={estilos.aula}>
                      <View
                        style={[
                          estilos.ponto,
                          p?.status === 'concluido' && estilos.pontoConcluido,
                          p?.status === 'em_andamento' && estilos.pontoAndamento,
                        ]}
                      />
                      <Text style={estilos.aulaTitulo}>{aula.titulo}</Text>
                      <Text
                        style={[
                          estilos.aulaStatus,
                          p?.status === 'concluido' && estilos.aulaStatusConcluido,
                        ]}
                      >
                        {p?.status === 'concluido'
                          ? `Concluída em ${formatarData(p.atualizado_em)}`
                          : p?.status === 'em_andamento'
                            ? `Começou em ${formatarData(p.atualizado_em)}`
                            : 'Não iniciada'}
                      </Text>
                      {exercicios[aula.id] && (
                        <Text style={estilos.exercicios}>
                          Exercícios: {exercicios[aula.id].acertos} de{' '}
                          {exercicios[aula.id].respondidas} acertos (1ª tentativa)
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })}

      {categorias.length === 0 && (
        <Text style={estilos.semAulas}>Este aluno não está inscrito em nenhum curso seu.</Text>
      )}
    </ScrollView>
  );
}

type Estilos = ReturnType<typeof criarEstilos>;

function Barra({ fracao, estilos }: { fracao: number; estilos: Estilos }) {
  return (
    <View style={estilos.barra}>
      <View
        style={[estilos.barraPreenchida, { width: `${Math.min(1, Math.max(0, fracao)) * 100}%` }]}
      />
    </View>
  );
}

function Numero({ valor, rotulo, estilos }: { valor: number; rotulo: string; estilos: Estilos }) {
  return (
    <View style={estilos.numero}>
      <Text style={estilos.numeroValor}>{valor}</Text>
      <Text style={estilos.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    centro: { justifyContent: 'center', alignItems: 'center', padding: 24 },
    container: { padding: 24, gap: 20, width: '100%', maxWidth: 720, alignSelf: 'center' },
    erro: { fontFamily: fontes.texto, color: c.erro, textAlign: 'center' },
    topo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    topoTexto: { flex: 1, minWidth: 0, gap: 2 },
    nome: { fontFamily: fontes.titulo, fontSize: 22, color: c.texto },
    matricula: { fontFamily: fontes.texto, color: c.textoSuave },
    atividade: { fontFamily: fontes.textoMedio, fontSize: 13, color: c.destaque, marginTop: 4 },
    resumo: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      padding: 16,
      gap: 10,
    },
    resumoLinha: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
    },
    resumoRotulo: { fontFamily: fontes.textoForte, color: c.texto },
    resumoPercentual: {
      fontFamily: fontes.tituloLeve,
      fontSize: 22,
      color: c.destaque,
      fontVariant: ['tabular-nums'],
    },
    barra: { height: 8, borderRadius: 4, backgroundColor: c.borda, overflow: 'hidden' },
    barraPreenchida: { height: '100%', backgroundColor: c.destaque },
    numeros: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
    numero: { alignItems: 'center' },
    numeroValor: {
      fontFamily: fontes.tituloLeve,
      fontSize: 20,
      color: c.texto,
      fontVariant: ['tabular-nums'],
    },
    numeroRotulo: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave },
    categoria: { gap: 10 },
    categoriaTitulo: { fontFamily: fontes.titulo, fontSize: 19, color: c.texto, flex: 1 },
    categoriaContagem: {
      fontFamily: fontes.textoMedio,
      color: c.textoSuave,
      fontVariant: ['tabular-nums'],
    },
    modulo: { gap: 6, marginTop: 6 },
    moduloTitulo: { fontFamily: fontes.textoForte, color: c.textoSuave },
    semAulas: { fontFamily: fontes.texto, fontSize: 13, color: c.textoSuave },
    aula: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.superficie,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borda,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexWrap: 'wrap',
    },
    ponto: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c.textoSuave },
    pontoAndamento: { borderColor: c.destaque },
    pontoConcluido: { backgroundColor: c.destaque, borderColor: c.destaque },
    aulaTitulo: { flex: 1, minWidth: 140, fontFamily: fontes.textoMedio, color: c.texto },
    aulaStatus: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave },
    aulaStatusConcluido: { color: c.destaque },
    exercicios: {
      width: '100%',
      fontFamily: fontes.textoMedio,
      fontSize: 12,
      color: c.texto,
      paddingLeft: 20,
    },
  });
