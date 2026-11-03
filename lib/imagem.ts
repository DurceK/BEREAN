// Reduz e comprime imagens ANTES de enviar ao Supabase, para gastar o mínimo do plano
// gratuito (espaço guardado e transferência quando os alunos abrem as fotos).
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Tamanhos usados no app
export const FOTO_AULA = { ladoMaximo: 1280, qualidade: 0.7 }; // ~150–300 KB
export const FOTO_PERFIL = { ladoMaximo: 256, qualidade: 0.7 }; // ~15–30 KB (aparece com até 108 px)

// Devolve o endereço local da imagem já reduzida, sempre em JPEG.
// Só diminui: imagens menores que o limite mantêm o tamanho e só são comprimidas.
export async function otimizarImagem(
  uri: string,
  largura: number,
  altura: number,
  { ladoMaximo, qualidade }: { ladoMaximo: number; qualidade: number }
) {
  const contexto = ImageManipulator.manipulate(uri);
  // As duas medidas são calculadas aqui: no navegador, deixar uma em branco (null) para a
  // biblioteca calcular vira altura zero e dá erro. Sem as medidas da foto (alguns
  // navegadores não informam), não reduz: só comprime.
  const temMedidas = largura > 0 && altura > 0;
  if (temMedidas && Math.max(largura, altura) > ladoMaximo) {
    const escala = ladoMaximo / Math.max(largura, altura);
    contexto.resize({
      width: Math.max(1, Math.round(largura * escala)),
      height: Math.max(1, Math.round(altura * escala)),
    });
  }
  const imagem = await contexto.renderAsync();
  const resultado = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: qualidade });
  return resultado.uri;
}
