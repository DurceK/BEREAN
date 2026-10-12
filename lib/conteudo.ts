// Operações do mentor sobre a estrutura do curso: categorias, módulos e aulas.
// Cada função devolve uma mensagem de erro, ou null quando deu certo.
import { supabase } from './supabase';
import { apagarArquivos, caminhosDosArquivos } from './midias';

const ERRO_SALVAR = 'Não foi possível salvar. Verifique a conexão e tente de novo.';
const ERRO_APAGAR = 'Não foi possível apagar. Verifique a conexão e tente de novo.';

export async function criarCategoria(mentorId: string, nome: string) {
  const { error } = await supabase.from('categorias').insert({ nome, mentor_id: mentorId });
  return error ? ERRO_SALVAR : null;
}

export async function criarModulo(categoriaId: string, nome: string, ordem: number) {
  const { error } = await supabase
    .from('modulos')
    .insert({ nome, categoria_id: categoriaId, ordem });
  return error ? ERRO_SALVAR : null;
}

export async function criarAula(moduloId: string, titulo: string, ordem: number) {
  const { error } = await supabase.from('aulas').insert({ titulo, modulo_id: moduloId, ordem });
  return error ? ERRO_SALVAR : null;
}

export async function renomearCategoria(id: string, nome: string) {
  const { error } = await supabase.from('categorias').update({ nome }).eq('id', id);
  return error ? ERRO_SALVAR : null;
}

export async function renomearModulo(id: string, nome: string) {
  const { error } = await supabase.from('modulos').update({ nome }).eq('id', id);
  return error ? ERRO_SALVAR : null;
}

export async function renomearAula(id: string, titulo: string) {
  const { error } = await supabase.from('aulas').update({ titulo }).eq('id', id);
  return error ? ERRO_SALVAR : null;
}

// Apagar leva junto tudo que está dentro (o banco apaga em cascata) e os arquivos do Storage.
// Os caminhos dos arquivos são lidos ANTES, porque depois as linhas de midias somem.
async function apagar(
  tabela: 'categorias' | 'modulos' | 'aulas',
  id: string,
  escopo: Parameters<typeof caminhosDosArquivos>[0]
) {
  try {
    const caminhos = await caminhosDosArquivos(escopo);
    const { error } = await supabase.from(tabela).delete().eq('id', id);
    if (error) return ERRO_APAGAR;
    await apagarArquivos(caminhos);
    return null;
  } catch {
    return ERRO_APAGAR;
  }
}

export const apagarCategoria = (id: string) => apagar('categorias', id, { categoriaId: id });
export const apagarModulo = (id: string) => apagar('modulos', id, { moduloId: id });
export const apagarAula = (id: string) => apagar('aulas', id, { aulaId: id });
