import { supabase } from './supabase';

export type ProgressoMidia = { posicao: number; visto: boolean };

// Ponto em que o aluno parou e se já viu até o fim, para cada mídia informada
export async function carregarProgressoMidias(mentoradoId: string, midiaIds: string[]) {
  const mapa: Record<string, ProgressoMidia> = {};
  if (midiaIds.length === 0) return mapa;

  const { data } = await supabase
    .from('progresso_midias')
    .select('midia_id, posicao_segundos, visto')
    .eq('mentorado_id', mentoradoId)
    .in('midia_id', midiaIds);

  for (const linha of data ?? []) {
    mapa[linha.midia_id] = { posicao: Number(linha.posicao_segundos) || 0, visto: linha.visto };
  }
  return mapa;
}

// Grava só os campos informados (não apaga o "visto" ao salvar a posição, e vice-versa).
// Falhas são ignoradas: perder um ponto de retomada não deve atrapalhar a aula.
export async function salvarProgressoMidia(
  mentoradoId: string,
  midiaId: string,
  campos: { posicao?: number; visto?: boolean }
) {
  const linha: Record<string, unknown> = {
    mentorado_id: mentoradoId,
    midia_id: midiaId,
    atualizado_em: new Date().toISOString(),
  };
  if (campos.posicao !== undefined)
    linha.posicao_segundos = Math.max(0, Math.floor(campos.posicao));
  if (campos.visto !== undefined) linha.visto = campos.visto;

  await supabase.from('progresso_midias').upsert(linha, { onConflict: 'mentorado_id,midia_id' });
}
