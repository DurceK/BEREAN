// Dados que o mentor vê sobre os alunos: respostas em detalhe e o resumo da turma.
// As regras do banco só deixam o mentor ler o que é do conteúdo dele.
import { supabase } from './supabase';
import { carregarGabarito, type TipoQuestao } from './exercicios';

// ===== Respostas de um aluno, pergunta por pergunta =====

export type RespostaDetalhada = {
  questaoId: string;
  tipo: TipoQuestao;
  enunciado: string;
  correta: boolean | null; // null = resposta livre (sem correção automática)
  resposta: string | null; // o que o aluno respondeu (null quando não é guardado, ex: ligar)
  certa: string | null; // a resposta certa, para comparar
  ordem: [number, number]; // ordem do exercício na aula e da pergunta no exercício
};

type LinhaResposta = {
  questao_id: string;
  correta: boolean | null;
  texto: string | null;
  alternativa_id: string | null;
  questoes: {
    tipo: TipoQuestao;
    enunciado: string;
    ordem: number;
    alternativas: { id: string; texto: string; lado: string | null }[];
    midias: { aula_id: string; ordem: number; aulas: { titulo: string } | null };
  } | null;
};

type Gabaritos = Awaited<ReturnType<typeof carregarGabarito>>;

// O que o aluno respondeu e qual era a resposta certa, em texto, conforme o tipo da pergunta
function detalhar(linha: LinhaResposta, gabarito: Gabaritos) {
  const q = linha.questoes!;
  const g = gabarito[linha.questao_id];
  const textoDe = (id: string | null | undefined) =>
    q.alternativas.find((a) => a.id === id)?.texto ?? null;

  switch (q.tipo) {
    case 'multipla_escolha':
      return { resposta: textoDe(linha.alternativa_id), certa: textoDe(g?.alternativaCorreta) };
    case 'digitar':
    case 'ordenar':
      return { resposta: linha.texto, certa: g?.aceitas[0] ?? null };
    case 'ligar':
      // os pares que o aluno montou não são guardados, só se acertou todos
      return {
        resposta: null,
        certa: Object.entries(g?.pares ?? {})
          .map(([e, d]) => `${textoDe(e)} ↔ ${textoDe(d)}`)
          .join('\n'),
      };
    default:
      return { resposta: linha.texto, certa: null };
  }
}

const CAMPOS_RESPOSTA =
  'questao_id, correta, texto, alternativa_id, questoes!inner(tipo, enunciado, ordem, alternativas(id, texto, lado), midias!inner(aula_id, ordem, aulas(titulo)))';

// Devolve as respostas (1ª tentativa) agrupadas por aula, na ordem em que aparecem na aula
export async function respostasDoAluno(alunoId: string) {
  const { data, error } = await supabase
    .from('respostas')
    .select(CAMPOS_RESPOSTA)
    .eq('mentorado_id', alunoId);
  if (error) throw error;

  const linhas = (data ?? []) as unknown as LinhaResposta[];
  const gabarito = await carregarGabarito(linhas.map((l) => l.questao_id));
  const porAula: Record<string, RespostaDetalhada[]> = {};

  for (const linha of linhas) {
    const q = linha.questoes;
    if (!q) continue;
    (porAula[q.midias.aula_id] ??= []).push({
      questaoId: linha.questao_id,
      tipo: q.tipo,
      enunciado: q.enunciado,
      correta: linha.correta,
      ...detalhar(linha, gabarito),
      ordem: [q.midias.ordem, q.ordem],
    });
  }

  for (const lista of Object.values(porAula)) {
    lista.sort((a, b) => a.ordem[0] - b.ordem[0] || a.ordem[1] - b.ordem[1]);
  }
  return porAula;
}

// ===== Erros recentes da turma =====

export type ErroRecente = {
  alunoId: string;
  aluno: string;
  aula: string;
  enunciado: string;
  tipo: TipoQuestao;
  resposta: string | null;
  certa: string | null;
  quando: string;
};

// Os últimos erros (1ª tentativa) de todos os alunos do mentor, do mais novo para o mais antigo
export async function errosRecentes(limite = 15): Promise<ErroRecente[]> {
  const { data, error } = await supabase
    .from('respostas')
    .select(`mentorado_id, respondido_em, usuarios(nome), ${CAMPOS_RESPOSTA}`)
    .eq('correta', false)
    .order('respondido_em', { ascending: false })
    .limit(limite);
  if (error) throw error;

  const linhas = (data ?? []) as unknown as (LinhaResposta & {
    mentorado_id: string;
    respondido_em: string;
    usuarios: { nome: string } | null;
  })[];
  const gabarito = await carregarGabarito(linhas.map((l) => l.questao_id));
  return linhas
    .filter((l) => l.questoes)
    .map((l) => ({
      alunoId: l.mentorado_id,
      aluno: l.usuarios?.nome ?? 'Aluno',
      aula: l.questoes!.midias.aulas?.titulo ?? '',
      enunciado: l.questoes!.enunciado,
      tipo: l.questoes!.tipo,
      ...detalhar(l, gabarito),
      quando: l.respondido_em,
    }));
}

// ===== Resumo da turma (um aluno por linha) =====

export type ResumoAluno = {
  id: string;
  nome: string;
  avatar: string | null;
  concluidas: number;
  emAndamento: number;
  ultimaAtividade: string | null;
  respondidas: number; // perguntas com correção automática
  acertos: number;
};

export async function resumoDaTurma(mentorId: string): Promise<ResumoAluno[]> {
  const { data: inscricoes, error } = await supabase
    .from('inscricoes')
    .select('usuarios(id, nome, avatar_url), categorias!inner(mentor_id)')
    .eq('categorias.mentor_id', mentorId);
  if (error) throw error;

  const alunos = new Map<string, ResumoAluno>();
  for (const linha of inscricoes ?? []) {
    const u = linha.usuarios as unknown as { id: string; nome: string; avatar_url: string | null };
    if (u && !alunos.has(u.id)) {
      alunos.set(u.id, {
        id: u.id,
        nome: u.nome,
        avatar: u.avatar_url,
        concluidas: 0,
        emAndamento: 0,
        ultimaAtividade: null,
        respondidas: 0,
        acertos: 0,
      });
    }
  }
  const ids = [...alunos.keys()];
  if (ids.length === 0) return [];

  const [resProgresso, resRespostas] = await Promise.all([
    supabase
      .from('progresso')
      .select('mentorado_id, status, atualizado_em')
      .in('mentorado_id', ids),
    supabase.from('respostas').select('mentorado_id, correta').in('mentorado_id', ids),
  ]);
  if (resProgresso.error || resRespostas.error) throw resProgresso.error ?? resRespostas.error;

  for (const p of resProgresso.data ?? []) {
    const aluno = alunos.get(p.mentorado_id);
    if (!aluno) continue;
    if (p.status === 'concluido') aluno.concluidas += 1;
    if (p.status === 'em_andamento') aluno.emAndamento += 1;
    if (!aluno.ultimaAtividade || p.atualizado_em > aluno.ultimaAtividade) {
      aluno.ultimaAtividade = p.atualizado_em;
    }
  }
  for (const r of resRespostas.data ?? []) {
    const aluno = alunos.get(r.mentorado_id);
    if (!aluno || r.correta === null) continue;
    aluno.respondidas += 1;
    if (r.correta) aluno.acertos += 1;
  }

  // Quem usou por último aparece primeiro; quem nunca usou, no fim
  return [...alunos.values()].sort((a, b) =>
    (b.ultimaAtividade ?? '').localeCompare(a.ultimaAtividade ?? '')
  );
}
