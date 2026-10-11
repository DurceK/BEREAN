import { supabase } from './supabase';

const BUCKET = 'midias';

// Lê um arquivo escolhido no aparelho (ou no navegador) como bytes, pronto pra enviar ao Storage.
export async function lerComoBytes(uri: string) {
  const resposta = await fetch(uri);
  const blob = await resposta.blob();
  return new Response(blob).arrayBuffer();
}

export async function enviarArquivo(
  uri: string,
  mentorId: string,
  aulaId: string,
  nomeArquivo: string,
  contentType: string
) {
  const caminho = `${mentorId}/${aulaId}/${Date.now()}-${nomeArquivo}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, await lerComoBytes(uri), {
    contentType,
  });

  if (error) throw error;
  return caminho;
}

type Escopo = { categoriaId: string } | { moduloId: string } | { aulaId: string };

// Caminhos dos arquivos guardados no Storage para tudo que está dentro do escopo.
// Precisa ser lido ANTES de apagar no banco, porque depois as linhas de midias somem.
export async function caminhosDosArquivos(escopo: Escopo) {
  let consulta = supabase
    .from('midias')
    .select('caminho_storage, aulas!inner(modulo_id, modulos!inner(categoria_id))')
    .not('caminho_storage', 'is', null);

  if ('categoriaId' in escopo) consulta = consulta.eq('aulas.modulos.categoria_id', escopo.categoriaId);
  else if ('moduloId' in escopo) consulta = consulta.eq('aulas.modulo_id', escopo.moduloId);
  else consulta = consulta.eq('aula_id', escopo.aulaId);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []).map((linha) => linha.caminho_storage as string);
}

// Remove os arquivos do Storage. Falha aqui não desfaz nada no banco:
// no pior caso sobra um arquivo sem uso, invisível para os usuários.
export async function apagarArquivos(caminhos: string[]) {
  if (caminhos.length === 0) return;
  await supabase.storage.from(BUCKET).remove(caminhos);
}

// Endereços temporários (válidos por algumas horas) para abrir arquivos do bucket privado.
// Devolve um mapa caminho -> endereço.
export async function obterUrlsAssinadas(caminhos: string[], expiraEmSegundos = 4 * 3600) {
  if (caminhos.length === 0) return {} as Record<string, string>;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(caminhos, expiraEmSegundos);
  if (error) throw error;

  const mapa: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  }
  return mapa;
}
