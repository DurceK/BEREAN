// Exercícios de múltipla escolha: perguntas (questoes), alternativas e gabarito.
import { supabase } from './supabase';

export type Alternativa = { id: string; ordem: number; texto: string };
export type Questao = {
  id: string;
  ordem: number;
  enunciado: string;
  explicacao: string | null;
  alternativas: Alternativa[];
};

export const MIN_ALTERNATIVAS = 2;
export const MAX_ALTERNATIVAS = 6;

export async function carregarQuestoes(midiaId: string): Promise<Questao[]> {
  const { data, error } = await supabase
    .from('questoes')
    .select('id, ordem, enunciado, explicacao, alternativas(id, ordem, texto)')
    .eq('midia_id', midiaId);
  if (error) throw error;
  return ((data ?? []) as Questao[])
    .sort((a, b) => a.ordem - b.ordem)
    .map((q) => ({ ...q, alternativas: [...q.alternativas].sort((a, b) => a.ordem - b.ordem) }));
}

// Só o mentor dono consegue ler o gabarito (as regras do banco bloqueiam o aluno)
export async function carregarGabarito(questaoIds: string[]) {
  const mapa: Record<string, string> = {};
  if (questaoIds.length === 0) return mapa;
  const { data } = await supabase
    .from('gabaritos')
    .select('questao_id, alternativa_id')
    .in('questao_id', questaoIds);
  for (const linha of data ?? []) mapa[linha.questao_id] = linha.alternativa_id;
  return mapa;
}

export type Rascunho = {
  id?: string;
  ordem: number;
  enunciado: string;
  explicacao: string;
  alternativas: { id?: string; texto: string }[];
  indiceCorreta: number | null;
};

// Confere se a pergunta pode ser salva; devolve a mensagem do problema, ou null
export function validarRascunho(r: Rascunho) {
  if (!r.enunciado.trim()) return 'Escreva o enunciado da pergunta.';
  const preenchidas = r.alternativas.filter((a) => a.texto.trim());
  if (preenchidas.length < MIN_ALTERNATIVAS) return 'Preencha pelo menos 2 alternativas.';
  if (preenchidas.length !== r.alternativas.length)
    return 'Há uma alternativa vazia: preencha ou remova.';
  if (r.indiceCorreta === null) return 'Marque qual alternativa é a certa.';
  return null;
}

// Salva a pergunta, as alternativas e o gabarito. As alternativas que já existiam são
// atualizadas (não recriadas), para não apagar as respostas que os alunos já deram.
export async function salvarQuestao(midiaId: string, r: Rascunho, idsOriginais: string[]) {
  const ERRO = 'Não foi possível salvar a pergunta. Tente de novo.';
  let questaoId = r.id;

  const campos = {
    enunciado: r.enunciado.trim(),
    explicacao: r.explicacao.trim() || null,
    ordem: r.ordem,
  };
  if (questaoId) {
    const { error } = await supabase.from('questoes').update(campos).eq('id', questaoId);
    if (error) return ERRO;
  } else {
    const { data, error } = await supabase
      .from('questoes')
      .insert({ ...campos, midia_id: midiaId })
      .select('id')
      .single();
    if (error || !data) return ERRO;
    questaoId = data.id;
  }

  const idsFinais: string[] = [];
  for (const [ordem, alternativa] of r.alternativas.entries()) {
    const texto = alternativa.texto.trim();
    if (alternativa.id) {
      const { error } = await supabase
        .from('alternativas')
        .update({ texto, ordem })
        .eq('id', alternativa.id);
      if (error) return ERRO;
      idsFinais.push(alternativa.id);
    } else {
      const { data, error } = await supabase
        .from('alternativas')
        .insert({ questao_id: questaoId, texto, ordem })
        .select('id')
        .single();
      if (error || !data) return ERRO;
      idsFinais.push(data.id);
    }
  }

  const removidas = idsOriginais.filter((id) => !idsFinais.includes(id));
  if (removidas.length > 0) {
    const { error } = await supabase.from('alternativas').delete().in('id', removidas);
    if (error) return ERRO;
  }

  const certa = idsFinais[r.indiceCorreta ?? 0];
  const { error } = await supabase
    .from('gabaritos')
    .upsert({ questao_id: questaoId, alternativa_id: certa }, { onConflict: 'questao_id' });
  return error ? ERRO : null;
}

export async function apagarQuestao(id: string) {
  const { error } = await supabase.from('questoes').delete().eq('id', id);
  return error ? 'Não foi possível apagar a pergunta.' : null;
}

export type Correcao = { correta: boolean; alternativaCorreta: string; explicacao: string | null };

// O aluno responde pelo servidor, que confere o gabarito e grava a 1ª tentativa
export async function responderQuestao(
  questaoId: string,
  alternativaId: string
): Promise<Correcao> {
  const { data, error } = await supabase.rpc('responder_questao', {
    questao: questaoId,
    alternativa: alternativaId,
  });
  if (error || !data) throw error ?? new Error('sem resposta');
  return {
    correta: data.correta,
    alternativaCorreta: data.alternativa_correta,
    explicacao: data.explicacao,
  };
}
