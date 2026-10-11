import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fontes, useEstilos, type Cores } from '../../lib/tema';
import { CabecalhoPerfil } from '../../components/CabecalhoPerfil';

type CategoriaResumo = {
  id: string;
  nome: string;
  modulos: { id: string; aulas: { id: string }[] }[];
  inscricoes: { mentorado_id: string }[];
};

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

export default function MentorInicio() {
  const { usuario } = useAuth();
  const estilos = useEstilos(criarEstilos);
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([]);

  // Recarrega ao voltar para a tela, para refletir o que foi criado ou apagado
  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      let cancelado = false;
      supabase
        .from('categorias')
        .select('id, nome, modulos(id, aulas(id)), inscricoes(mentorado_id)')
        .eq('mentor_id', usuario.id)
        .order('nome')
        .then(({ data }) => {
          if (!cancelado) setCategorias((data as CategoriaResumo[]) ?? []);
        });
      return () => {
        cancelado = true;
      };
    }, [usuario])
  );

  const totalAulas = categorias.reduce(
    (soma, c) => soma + c.modulos.reduce((s, m) => s + m.aulas.length, 0),
    0
  );
  const totalAlunos = new Set(categorias.flatMap((c) => c.inscricoes.map((i) => i.mentorado_id))).size;

  return (
    <ScrollView style={estilos.fundo}>
      <CabecalhoPerfil
        area="Área do mentor"
        papel={categorias.map((c) => c.nome).join(' · ') || 'Mentor'}
        estatisticas={[
          { valor: categorias.length, rotulo: 'Categorias' },
          { valor: totalAulas, rotulo: 'Aulas' },
          { valor: totalAlunos, rotulo: 'Alunos' },
        ]}
        botao={{ texto: 'Gerenciar aulas', onPress: () => router.push('/(mentor)/editar-categoria') }}
      />

      <View style={estilos.container}>
        <Text style={estilos.secao}>Suas categorias</Text>

        {categorias.length === 0 && (
          <Text style={estilos.aviso}>
            Você ainda não criou nenhuma categoria. Toque em “Gerenciar aulas” para começar.
          </Text>
        )}

        {categorias.map((categoria) => {
          const aulas = categoria.modulos.reduce((s, m) => s + m.aulas.length, 0);
          const alunos = new Set(categoria.inscricoes.map((i) => i.mentorado_id)).size;
          return (
            <Link
              key={categoria.id}
              href={{ pathname: '/(mentor)/editar-categoria', params: { categoria: categoria.id } }}
              asChild
            >
              <Pressable style={estilos.card}>
                <View style={estilos.cardInfo}>
                  <Text style={estilos.cardTitulo}>{categoria.nome}</Text>
                  <Text style={estilos.cardDescricao}>
                    {plural(categoria.modulos.length, 'módulo', 'módulos')} ·{' '}
                    {plural(aulas, 'aula', 'aulas')} · {plural(alunos, 'aluno', 'alunos')}
                  </Text>
                </View>
                <Text style={estilos.seta}>›</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </ScrollView>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.fundo },
    container: { padding: 24, paddingTop: 32, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
    secao: {
      fontFamily: fontes.textoForte,
      fontSize: 12,
      color: c.destaque,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    aviso: { fontFamily: fontes.texto, color: c.textoSuave, lineHeight: 20 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.superficie,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: c.borda,
    },
    cardInfo: { flex: 1, minWidth: 0, gap: 4 },
    cardTitulo: { fontFamily: fontes.tituloLeve, fontSize: 18, color: c.texto },
    cardDescricao: { fontFamily: fontes.texto, color: c.textoSuave },
    seta: { fontFamily: fontes.textoForte, fontSize: 22, color: c.textoSuave },
  });
