// Janela de "Importar aulas" (só no site): o professor escolhe uma planilha no leiaute
// padrão, vê o resumo e confirma. As aulas entram no fim do curso; nada é apagado.
import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { fontes, useEstilos, type Cores } from '../lib/tema';
import { baixarModelo, importarNoCurso, lerPlanilha, type Importacao } from '../lib/importacao';

type ModuloDoCurso = { id: string; nome: string; ordem: number; aulas: { ordem: number }[] };

function escolherArquivo(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export function JanelaImportar({
  curso,
  modulos,
  onImportado,
  onFechar,
}: {
  curso: { id: string; nome: string };
  modulos: ModuloDoCurso[];
  onImportado: () => void;
  onFechar: () => void;
}) {
  const estilos = useEstilos(criarEstilos);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [dados, setDados] = useState<Importacao | null>(null);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  async function escolher() {
    setErro(null);
    const arquivo = await escolherArquivo();
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    setDados(null);
    try {
      setDados(await lerPlanilha(arquivo));
    } catch {
      setErro('Não consegui ler este arquivo. Use uma planilha .xlsx no modelo.');
    }
  }

  async function importar() {
    if (!dados || etapa) return;
    setErro(null);
    setEtapa('Começando...');
    const falha = await importarNoCurso(curso.id, modulos, dados, setEtapa);
    setEtapa(null);
    if (falha) {
      setErro(falha);
      return;
    }
    setConcluido(true);
    onImportado();
  }

  const aulas = dados?.modulos.reduce((s, m) => s + m.exercicios.length, 0) ?? 0;
  const podeImportar = !!dados && dados.erros.length === 0 && dados.perguntas > 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={estilos.fundo}>
        <View style={estilos.caixa}>
          <Text style={estilos.titulo}>Importar aulas em “{curso.nome}”</Text>
          {concluido ? (
            <Text style={estilos.texto}>
              Pronto! {aulas} {aulas === 1 ? 'aula foi adicionada' : 'aulas foram adicionadas'} no
              fim do curso.
            </Text>
          ) : (
            <>
              <Text style={estilos.texto}>
                Escolha uma planilha no leiaute padrão. Cada exercício da planilha vira uma aula
                nova, no fim do curso. Nada do que já existe é apagado.
              </Text>
              <Pressable onPress={baixarModelo} accessibilityRole="link">
                <Text style={estilos.link}>Baixar planilha-modelo (com instruções)</Text>
              </Pressable>

              <Pressable style={estilos.botao} onPress={escolher} disabled={!!etapa}>
                <Text style={estilos.botaoTexto}>
                  {nomeArquivo ? 'Escolher outro arquivo' : 'Escolher arquivo'}
                </Text>
              </Pressable>
              {nomeArquivo && <Text style={estilos.arquivo}>{nomeArquivo}</Text>}

              {dados && dados.erros.length === 0 && (
                <View style={estilos.resumo}>
                  <Text style={estilos.texto}>
                    {dados.perguntas} perguntas em {aulas} aulas, em {dados.modulos.length}{' '}
                    {dados.modulos.length === 1 ? 'módulo' : 'módulos'}:
                  </Text>
                  <ScrollView style={estilos.listaModulos}>
                    {dados.modulos.map((m) => {
                      const existe = modulos.some((x) => x.nome.trim() === m.nome.trim());
                      return (
                        <Text key={m.nome} style={estilos.itemModulo}>
                          • {m.nome}: {m.exercicios.length}{' '}
                          {m.exercicios.length === 1 ? 'aula' : 'aulas'}
                          {existe ? ' (entram no fim do módulo que já existe)' : ' (módulo novo)'}
                        </Text>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              {dados && dados.erros.length > 0 && (
                <View style={estilos.resumo}>
                  <Text style={estilos.erro}>
                    A planilha tem {dados.erros.length}{' '}
                    {dados.erros.length === 1 ? 'problema' : 'problemas'}. Corrija e escolha de
                    novo:
                  </Text>
                  <ScrollView style={estilos.listaModulos}>
                    {dados.erros.slice(0, 30).map((e) => (
                      <Text key={e} style={estilos.itemErro}>
                        • {e}
                      </Text>
                    ))}
                  </ScrollView>
                </View>
              )}
              {etapa && <Text style={estilos.texto}>{etapa}</Text>}
              {erro && <Text style={estilos.erro}>{erro}</Text>}
            </>
          )}

          <View style={estilos.botoes}>
            <Pressable onPress={onFechar} disabled={!!etapa}>
              <Text style={estilos.cancelar}>{concluido ? 'Fechar' : 'Cancelar'}</Text>
            </Pressable>
            {!concluido && (
              <Pressable onPress={importar} disabled={!podeImportar || !!etapa}>
                <Text style={[estilos.confirmar, (!podeImportar || !!etapa) && estilos.apagado]}>
                  {etapa ? 'Importando...' : 'Importar'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: c.sobreposicao, justifyContent: 'center', padding: 24 },
    caixa: {
      backgroundColor: c.fundo,
      borderRadius: 12,
      padding: 20,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
    },
    titulo: { fontFamily: fontes.tituloLeve, fontSize: 18, color: c.texto, marginBottom: 12 },
    texto: { fontFamily: fontes.texto, color: c.texto, lineHeight: 20, marginBottom: 12 },
    link: {
      fontFamily: fontes.textoMedio,
      color: c.destaque,
      textDecorationLine: 'underline',
      marginBottom: 16,
    },
    botao: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: c.destaque,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    botaoTexto: { fontFamily: fontes.textoMedio, color: c.destaque },
    arquivo: { fontFamily: fontes.texto, color: c.textoSuave, marginBottom: 12 },
    resumo: { marginBottom: 8 },
    listaModulos: { maxHeight: 200 },
    itemModulo: { fontFamily: fontes.texto, color: c.texto, lineHeight: 22 },
    itemErro: { fontFamily: fontes.texto, color: c.erro, lineHeight: 20 },
    erro: { fontFamily: fontes.texto, color: c.erro, marginBottom: 12 },
    botoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 8 },
    cancelar: { fontFamily: fontes.textoMedio, color: c.textoSuave },
    confirmar: { fontFamily: fontes.textoForte, color: c.destaque },
    apagado: { opacity: 0.4 },
  });
