import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fontes, useEstilos, useTema, type Cores } from '../../lib/tema';
import {
  apagarAula,
  apagarCategoria,
  apagarModulo,
  criarAula,
  criarCategoria,
  criarModulo,
  renomearAula,
  renomearCategoria,
  renomearModulo,
} from '../../lib/conteudo';
import { CabecalhoPerfil } from '../../components/CabecalhoPerfil';
import { JanelaConfirmar, JanelaNome } from '../../components/Janelas';

type Aula = { id: string; titulo: string; ordem: number };
type Modulo = { id: string; nome: string; ordem: number; aulas: Aula[] };
type Categoria = {
  id: string;
  nome: string;
  modulos: Modulo[];
  inscricoes: { mentorado_id: string }[];
};

type Janela =
  | {
      tipo: 'nome';
      titulo: string;
      valorInicial?: string;
      placeholder?: string;
      acao: (nome: string) => Promise<string | null>;
    }
  | { tipo: 'confirmar'; titulo: string; aviso: string; acao: () => Promise<string | null> }
  | null;

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

const proximaOrdem = (itens: { ordem: number }[]) =>
  itens.reduce((maior, item) => Math.max(maior, item.ordem), -1) + 1;

export default function MentorInicio() {
  const { usuario } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [janela, setJanela] = useState<Janela>(null);
  // Cursos e módulos que a mentora deixou abertos (guardado só neste aparelho)
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const chaveAbertos = `berean:mentor:abertos:${usuario?.id ?? ''}`;

  const carregar = useCallback(async () => {
    if (!usuario) return;
    const { data } = await supabase
      .from('categorias')
      .select(
        'id, nome, modulos(id, nome, ordem, aulas(id, titulo, ordem)), inscricoes(mentorado_id)'
      )
      .eq('mentor_id', usuario.id)
      .order('nome');
    const lista = ((data as Categoria[]) ?? []).map((c) => ({
      ...c,
      modulos: [...c.modulos]
        .sort((a, b) => a.ordem - b.ordem)
        .map((m) => ({ ...m, aulas: [...m.aulas].sort((a, b) => a.ordem - b.ordem) })),
    }));
    setCategorias(lista);
  }, [usuario]);

  // Recarrega ao voltar para a tela, para refletir o que mudou em outras telas
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  useEffect(() => {
    if (!usuario) return;
    AsyncStorage.getItem(`berean:mentor:abertos:${usuario.id}`)
      .then((salvo) => {
        if (salvo) setAbertos(JSON.parse(salvo));
      })
      .catch(() => {});
  }, [usuario]);

  function definirAberto(id: string, aberto: boolean) {
    setAbertos((atual) => {
      const novo = { ...atual };
      if (aberto) novo[id] = true;
      else delete novo[id];
      AsyncStorage.setItem(chaveAbertos, JSON.stringify(novo)).catch(() => {});
      return novo;
    });
  }

  // Executa a ação e, se deu certo, recarrega a árvore
  function comRecarga(acao: () => Promise<string | null>) {
    return async () => {
      const erro = await acao();
      if (!erro) await carregar();
      return erro;
    };
  }

  // ===== Ações =====

  function novaCategoria() {
    setJanela({
      tipo: 'nome',
      titulo: 'Novo curso',
      placeholder: 'Ex: Inglês',
      acao: (nome) => comRecarga(() => criarCategoria(usuario!.id, nome))(),
    });
  }

  function novoModulo(categoria: Categoria) {
    setJanela({
      tipo: 'nome',
      titulo: `Novo módulo em ${categoria.nome}`,
      placeholder: 'Ex: Vocabulário de viagens',
      acao: async (nome) => {
        const erro = await comRecarga(() =>
          criarModulo(categoria.id, nome, proximaOrdem(categoria.modulos))
        )();
        if (!erro) definirAberto(categoria.id, true);
        return erro;
      },
    });
  }

  function novaAula(modulo: Modulo) {
    setJanela({
      tipo: 'nome',
      titulo: `Nova aula em ${modulo.nome}`,
      placeholder: 'Ex: Vocabulário de viagens 01',
      acao: async (titulo) => {
        const erro = await comRecarga(() =>
          criarAula(modulo.id, titulo, proximaOrdem(modulo.aulas))
        )();
        if (!erro) definirAberto(modulo.id, true);
        return erro;
      },
    });
  }

  function renomear(
    titulo: string,
    valorInicial: string,
    acao: (nome: string) => Promise<string | null>
  ) {
    setJanela({
      tipo: 'nome',
      titulo,
      valorInicial,
      acao: (nome) => comRecarga(() => acao(nome))(),
    });
  }

  function apagar(titulo: string, aviso: string, acao: () => Promise<string | null>) {
    setJanela({ tipo: 'confirmar', titulo, aviso, acao: comRecarga(acao) });
  }

  // ===== Números do cabeçalho =====

  const totalAulas = categorias.reduce(
    (soma, c) => soma + c.modulos.reduce((s, m) => s + m.aulas.length, 0),
    0
  );
  const totalAlunos = new Set(categorias.flatMap((c) => c.inscricoes.map((i) => i.mentorado_id)))
    .size;

  return (
    <ScrollView style={estilos.fundo}>
      <CabecalhoPerfil
        area="Área do mentor"
        papel={categorias.map((c) => c.nome).join(' · ') || 'Mentor'}
        estatisticas={[
          { valor: categorias.length, rotulo: 'Cursos' },
          { valor: totalAulas, rotulo: 'Aulas' },
          { valor: totalAlunos, rotulo: 'Alunos' },
        ]}
        botao={{ texto: 'Meus alunos', onPress: () => router.push('/(mentor)/alunos') }}
      />

      <View style={estilos.container}>
        <View style={estilos.secaoLinha}>
          <Text style={estilos.secao}>Seus cursos</Text>
          <Pressable style={estilos.botaoNovo} onPress={novaCategoria}>
            <Text style={estilos.botaoNovoTexto}>+ Novo curso</Text>
          </Pressable>
        </View>

        {categorias.length === 0 && (
          <Text style={estilos.aviso}>
            Você ainda não criou nenhum curso. Toque em “+ Novo curso” para começar.
          </Text>
        )}

        {categorias.map((categoria) => {
          const aberta = !!abertos[categoria.id];
          const aulas = categoria.modulos.reduce((s, m) => s + m.aulas.length, 0);
          const alunos = new Set(categoria.inscricoes.map((i) => i.mentorado_id)).size;
          return (
            <View key={categoria.id} style={estilos.categoria}>
              <View style={estilos.linha}>
                <Pressable
                  style={estilos.alternar}
                  onPress={() => definirAberto(categoria.id, !aberta)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: aberta }}
                  accessibilityLabel={`${aberta ? 'Fechar' : 'Abrir'} ${categoria.nome}`}
                >
                  <Text style={estilos.seta}>{aberta ? '▾' : '▸'}</Text>
                  <View style={estilos.info}>
                    <Text style={estilos.categoriaNome}>{categoria.nome}</Text>
                    <Text style={estilos.detalhe}>
                      {plural(categoria.modulos.length, 'módulo', 'módulos')} ·{' '}
                      {plural(aulas, 'aula', 'aulas')} · {plural(alunos, 'aluno', 'alunos')}
                    </Text>
                  </View>
                </Pressable>
                <Icone
                  simbolo="✎"
                  rotulo={`Renomear ${categoria.nome}`}
                  onPress={() =>
                    renomear('Renomear curso', categoria.nome, (nome) =>
                      renomearCategoria(categoria.id, nome)
                    )
                  }
                  estilos={estilos}
                />
                <Icone
                  simbolo="✕"
                  cor={cores.erro}
                  rotulo={`Apagar ${categoria.nome}`}
                  onPress={() =>
                    apagar(
                      `Apagar “${categoria.nome}”?`,
                      'Os módulos, aulas e mídias deste curso também serão apagados, e os alunos inscritos perdem o acesso. Não dá para desfazer.',
                      () => apagarCategoria(categoria.id)
                    )
                  }
                  estilos={estilos}
                />
              </View>

              {aberta && (
                <View style={estilos.corpo}>
                  {categoria.modulos.map((modulo) => {
                    const moduloAberto = !!abertos[modulo.id];
                    return (
                      <View key={modulo.id} style={estilos.modulo}>
                        <View style={estilos.linha}>
                          <Pressable
                            style={estilos.alternar}
                            onPress={() => definirAberto(modulo.id, !moduloAberto)}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: moduloAberto }}
                            accessibilityLabel={`${moduloAberto ? 'Fechar' : 'Abrir'} ${modulo.nome}`}
                          >
                            <Text style={estilos.setaPequena}>{moduloAberto ? '▾' : '▸'}</Text>
                            <View style={estilos.info}>
                              <Text style={estilos.moduloNome}>{modulo.nome}</Text>
                              <Text style={estilos.detalhe}>
                                {plural(modulo.aulas.length, 'aula', 'aulas')}
                              </Text>
                            </View>
                          </Pressable>
                          <Icone
                            simbolo="✎"
                            rotulo={`Renomear ${modulo.nome}`}
                            onPress={() =>
                              renomear('Renomear módulo', modulo.nome, (nome) =>
                                renomearModulo(modulo.id, nome)
                              )
                            }
                            estilos={estilos}
                          />
                          <Icone
                            simbolo="✕"
                            cor={cores.erro}
                            rotulo={`Apagar ${modulo.nome}`}
                            onPress={() =>
                              apagar(
                                `Apagar “${modulo.nome}”?`,
                                'As aulas e mídias deste módulo também serão apagadas. Não dá para desfazer.',
                                () => apagarModulo(modulo.id)
                              )
                            }
                            estilos={estilos}
                          />
                        </View>

                        {moduloAberto && (
                          <View style={estilos.aulas}>
                            {modulo.aulas.map((aula) => (
                              <View key={aula.id} style={estilos.aula}>
                                <Pressable
                                  style={estilos.aulaLink}
                                  onPress={() => router.push(`/(mentor)/aula/${aula.id}`)}
                                  accessibilityLabel={`Abrir o conteúdo de ${aula.titulo}`}
                                >
                                  <Text style={estilos.aulaTitulo}>{aula.titulo}</Text>
                                  <Text style={estilos.aulaConteudo}>Conteúdo ›</Text>
                                </Pressable>
                                <Icone
                                  simbolo="✎"
                                  rotulo={`Renomear ${aula.titulo}`}
                                  onPress={() =>
                                    renomear('Renomear aula', aula.titulo, (titulo) =>
                                      renomearAula(aula.id, titulo)
                                    )
                                  }
                                  estilos={estilos}
                                />
                                <Icone
                                  simbolo="✕"
                                  cor={cores.erro}
                                  rotulo={`Apagar ${aula.titulo}`}
                                  onPress={() =>
                                    apagar(
                                      `Apagar “${aula.titulo}”?`,
                                      'As mídias desta aula (áudios, fotos e textos) também serão apagadas. Não dá para desfazer.',
                                      () => apagarAula(aula.id)
                                    )
                                  }
                                  estilos={estilos}
                                />
                              </View>
                            ))}
                            <Pressable style={estilos.adicionar} onPress={() => novaAula(modulo)}>
                              <Text style={estilos.adicionarTexto}>+ Nova aula</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  <Pressable style={estilos.adicionar} onPress={() => novoModulo(categoria)}>
                    <Text style={estilos.adicionarTexto}>+ Novo módulo</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {janela?.tipo === 'nome' && (
        <JanelaNome
          titulo={janela.titulo}
          valorInicial={janela.valorInicial}
          placeholder={janela.placeholder}
          onConfirmar={janela.acao}
          onFechar={() => setJanela(null)}
        />
      )}
      {janela?.tipo === 'confirmar' && (
        <JanelaConfirmar
          titulo={janela.titulo}
          aviso={janela.aviso}
          onConfirmar={janela.acao}
          onFechar={() => setJanela(null)}
        />
      )}
    </ScrollView>
  );
}

type Estilos = ReturnType<typeof criarEstilos>;

function Icone({
  simbolo,
  rotulo,
  onPress,
  cor,
  estilos,
}: {
  simbolo: string;
  rotulo: string;
  onPress: () => void;
  cor?: string;
  estilos: Estilos;
}) {
  return (
    <Pressable style={estilos.icone} onPress={onPress} accessibilityLabel={rotulo}>
      <Text style={[estilos.iconeTexto, cor ? { color: cor } : null]}>{simbolo}</Text>
    </Pressable>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: {
      padding: 24,
      paddingTop: 32,
      gap: 12,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    secaoLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    },
    secao: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    botaoNovo: {
      borderWidth: 1,
      borderColor: c.destaque,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    botaoNovoTexto: { fontFamily: fontes.textoForte, fontSize: 13, color: c.destaque },
    aviso: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    categoria: {
      backgroundColor: c.superficie,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borda,
      padding: 14,
    },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    alternar: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
    seta: { fontSize: 16, color: c.destaque, width: 16, textAlign: 'center' },
    setaPequena: { fontSize: 13, color: c.textoSuave, width: 16, textAlign: 'center' },
    info: { flex: 1, minWidth: 0, gap: 2 },
    categoriaNome: { fontFamily: fontes.tituloLeve, fontSize: 18, color: c.texto },
    detalhe: { fontFamily: fontes.texto, fontSize: 12, color: c.textoSuave },
    icone: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconeTexto: { fontFamily: fontes.textoForte, fontSize: 16, color: c.texto },
    corpo: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borda,
      gap: 8,
    },
    modulo: { gap: 6 },
    moduloNome: { fontFamily: fontes.textoForte, color: c.texto },
    aulas: { marginLeft: 26, gap: 6 },
    aula: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.fundo,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borda,
      paddingLeft: 12,
      paddingRight: 4,
      paddingVertical: 4,
    },
    aulaLink: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    aulaTitulo: { flex: 1, minWidth: 0, fontFamily: fontes.textoMedio, color: c.texto },
    aulaConteudo: { fontFamily: fontes.textoForte, fontSize: 12, color: c.destaque },
    adicionar: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    adicionarTexto: { fontFamily: fontes.textoForte, fontSize: 13, color: c.destaque },
  });
