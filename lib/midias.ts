import { supabase } from './supabase';

const BUCKET = 'midias';

export async function enviarArquivo(
  uri: string,
  mentorId: string,
  aulaId: string,
  nomeArquivo: string,
  contentType: string
) {
  const resposta = await fetch(uri);
  const blob = await resposta.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();
  const caminho = `${mentorId}/${aulaId}/${Date.now()}-${nomeArquivo}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arrayBuffer, {
    contentType,
  });

  if (error) throw error;
  return caminho;
}

export async function obterUrlAssinada(caminhoStorage: string, expiraEmSegundos = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminhoStorage, expiraEmSegundos);

  if (error) throw error;
  return data.signedUrl;
}
