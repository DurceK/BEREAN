// Exercícios: perguntas (questoes) de vários tipos, com o gabarito guardado à parte.
//   multipla_escolha -> alternativas + gabaritos (a alternativa certa)
//   digitar          -> respostas_aceitas (a primeira é a mostrada ao aluno)
//   ordenar          -> alternativas = palavras embaralhadas; respostas_aceitas = a frase certa
//   ligar            -> alternativas com lado esquerda/direita; pares_corretos
//   livre            -> nada; o mentor lê a resposta na ficha do aluno
import { supabase } from './supabase';

export type TipoQuestao = 'multipla_escolha' | 'digitar' | 'ordenar' | 'ligar' | 'livre';

export const TIPOS: { tipo: TipoQuestao; nome: string; ajuda: string }[] = [
  {
    tipo: 'multipla_escolha',
    nome: 'Múltipla escolha',
    ajuda: 'O aluno escolhe uma das alternativas.',
  },
  {
    tipo: 'digitar',
    nome: 'Digitar',
    ajuda:
      'O aluno digita a resposta (copiar, completar, traduzir). Maiúsculas, pontuação e espaços não contam; acentos contam.',
  },
  {
    tipo: 'ordenar',
    nome: 'Ordenar palavras',
    ajuda: 'O app embaralha as palavras da frase e o aluno toca nelas na ordem certa.',
  },
  {
    tipo: 'ligar',
    nome: 'Ligar colunas',
    ajuda:
      'O aluno liga cada item da esquerda ao seu par. A coluna da direita aparece embaralhada.',
  },
  {
    tipo: 'livre',
    nome: 'Resposta livre',
    ajuda: 'O aluno escreve um texto. Não tem correção automática: você lê na ficha do aluno.',
  },
];

export function nomeDoTipo(tipo: TipoQuestao) {
  return TIPOS.find((t) => t.tipo === tipo)?.nome ?? tipo;
}

export type Alternativa = {
  id: string;
  ordem: number;
  texto: string;
  lado: 'esquerda' | 'direita' | null;
};
export type Questao = {
  id: string;
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  explicacao: string | null;
  alternativas: Alternativa[];
};

export const MIN_ALTERNATIVAS = 2;
export const MAX_ALTERNATIVAS = 6;
export const MAX_ACEITAS = 10;
export const MIN_PARES = 2;
export const MAX_PARES = 8;

export async function carregarQuestoes(midiaId: string): Promise<Questao[]> {
  const { data, error } = await supabase
    .from('questoes')
    .select('id, ordem, tipo, enunciado, explicacao, alternativas(id, ordem, texto, lado)')
    .eq('midia_id', midiaId);
  if (error) throw error;
  return ((data ?? []) as Questao[])
    .sort((a, b) => a.ordem - b.ordem)
    .map((q) => ({ ...q, alternativas: [...q.alternativas].sort((a, b) => a.ordem - b.ordem) }));
}

export type Gabarito = {
  alternativaCorreta: string | null;
  aceitas: string[];
  pares: Record<string, string>; // id do item da esquerda -> id do item da direita
};

// Só o mentor dono consegue ler o gabarito (as regras do banco bloqueiam o aluno)
export async function carregarGabarito(questaoIds: string[]) {
  const mapa: Record<string, Gabarito> = {};
  if (questaoIds.length === 0) return mapa;
  for (const id of questaoIds) mapa[id] = { alternativaCorreta: null, aceitas: [], pares: {} };

  const [resGabaritos, resAceitas, resPares] = await Promise.all([
    supabase.from('gabaritos').select('questao_id, alternativa_id').in('questao_id', questaoIds),
    supabase
      .from('respostas_aceitas')
      .select('questao_id, ordem, texto')
      .in('questao_id', questaoIds)
      .order('ordem'),
    supabase
      .from('pares_corretos')
      .select('questao_id, esquerda_id, direita_id')
      .in('questao_id', questaoIds),
  ]);
  for (const l of resGabaritos.data ?? []) mapa[l.questao_id].alternativaCorreta = l.alternativa_id;
  for (const l of resAceitas.data ?? []) mapa[l.questao_id].aceitas.push(l.texto);
  for (const l of resPares.data ?? []) mapa[l.questao_id].pares[l.esquerda_id] = l.direita_id;
  return mapa;
}

// Mesma regra da função normalizar_resposta do banco (usada na pré-visualização do mentor)
export function normalizarResposta(texto: string) {
  return texto
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?;:"“”¡¿…()/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Separa a frase em palavras e embaralha, garantindo que não fique na ordem certa
export function embaralharPalavras(frase: string) {
  const palavras = frase.trim().split(/\s+/).filter(Boolean);
  return embaralhar(palavras);
}

export function embaralhar<T>(lista: T[]) {
  if (lista.length < 2) return [...lista];
  let copia = [...lista];
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    if (copia.some((item, i) => item !== lista[i])) break;
  }
  return copia;
}

export type Par = { esquerda: string; direita: string };

export type Rascunho = {
  id?: string;
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  explicacao: string;
  alternativas: { id?: string; texto: string }[]; // múltipla escolha
  indiceCorreta: number | null; // múltipla escolha
  aceitas: string[]; // digitar
  frase: string; // ordenar
  pares: Par[]; // ligar
};

export function rascunhoVazio(ordem: number, tipo: TipoQuestao): Rascunho {
  return {
    ordem,
    tipo,
    enunciado: '',
    explicacao: '',
    alternativas: [{ texto: '' }, { texto: '' }, { texto: '' }, { texto: '' }],
    indiceCorreta: null,
    aceitas: [''],
    frase: '',
    pares: [
      { esquerda: '', direita: '' },
      { esquerda: '', direita: '' },
      { esquerda: '', direita: '' },
    ],
  };
}

// Monta o rascunho de uma pergunta que já existe, para editar
export function rascunhoDaQuestao(questao: Questao, gabarito: Gabarito | undefined): Rascunho {
  const base = rascunhoVazio(questao.ordem, questao.tipo);
  const esquerda = questao.alternativas.filter((a) => a.lado === 'esquerda');
  const textoDe = (id: string) => questao.alternativas.find((a) => a.id === id)?.texto ?? '';
  return {
    ...base,
    id: questao.id,
    enunciado: questao.enunciado,
    explicacao: questao.explicacao ?? '',
    alternativas:
      questao.tipo === 'multipla_escolha'
        ? questao.alternativas.map((a) => ({ id: a.id, texto: a.texto }))
        : base.alternativas,
    indiceCorreta:
      questao.tipo === 'multipla_escolha'
        ? Math.max(
            0,
            questao.alternativas.findIndex((a) => a.id === gabarito?.alternativaCorreta)
          )
        : null,
    aceitas: gabarito?.aceitas.length ? [...gabarito.aceitas] : base.aceitas,
    frase: gabarito?.aceitas[0] ?? '',
    pares: esquerda.length
      ? esquerda.map((e) => ({
          esquerda: e.texto,
          direita: textoDe(gabarito?.pares[e.id] ?? ''),
        }))
      : base.pares,
  };
}

// Confere se a pergunta pode ser salva; devolve a mensagem do problema, ou null.
// Linhas deixadas em branco já devem ter sido descartadas antes (ver limparRascunho).
export function validarRascunho(r: Rascunho) {
  if (!r.enunciado.trim()) return 'Escreva o enunciado da pergunta.';
  switch (r.tipo) {
    case 'multipla_escolha':
      if (r.alternativas.length < MIN_ALTERNATIVAS) return 'Preencha pelo menos 2 alternativas.';
      if (r.indiceCorreta === null || r.indiceCorreta < 0)
        return 'Marque qual alternativa é a certa.';
      return null;
    case 'digitar':
      return r.aceitas.length === 0 ? 'Escreva pelo menos uma resposta aceita.' : null;
    case 'ordenar':
      return r.frase.trim().split(/\s+/).length < 2
        ? 'Escreva a frase certa, com pelo menos 2 palavras.'
        : null;
    case 'ligar':
      if (r.pares.some((p) => !p.esquerda.trim() || !p.direita.trim()))
        return 'Há um par incompleto: preencha os dois lados ou remova.';
      return r.pares.length < MIN_PARES ? 'Preencha pelo menos 2 pares.' : null;
    default:
      return null;
  }
}

// Descarta as linhas em branco (alternativas, respostas aceitas e pares vazios)
export function limparRascunho(r: Rascunho): Rascunho {
  const marcada = r.indiceCorreta;
  const preenchidas = r.alternativas.map((a, i) => ({ ...a, i })).filter((a) => a.texto.trim());
  return {
    ...r,
    alternativas: preenchidas.map(({ id, texto }) => ({ id, texto })),
    indiceCorreta: marcada === null ? null : preenchidas.findIndex((a) => a.i === marcada),
    aceitas: r.aceitas.map((t) => t.trim()).filter(Boolean),
    pares: r.pares.filter((p) => p.esquerda.trim() || p.direita.trim()),
  };
}

const ERRO_SALVAR = 'Não foi possível salvar a pergunta. Tente de novo.';

// Salva a pergunta e o gabarito do tipo dela
export async function salvarQuestao(midiaId: string, r: Rascunho, idsOriginais: string[]) {
  let questaoId = r.id;
  const campos = {
    tipo: r.tipo,
    enunciado: r.enunciado.trim(),
    explicacao: r.explicacao.trim() || null,
    ordem: r.ordem,
  };
  if (questaoId) {
    const { error } = await supabase.from('questoes').update(campos).eq('id', questaoId);
    if (error) return ERRO_SALVAR;
  } else {
    const { data, error } = await supabase
      .from('questoes')
      .insert({ ...campos, midia_id: midiaId })
      .select('id')
      .single();
    if (error || !data) return ERRO_SALVAR;
    questaoId = data.id;
  }
  const id = questaoId!;

  switch (r.tipo) {
    case 'multipla_escolha':
      return salvarMultiplaEscolha(id, r, idsOriginais);
    case 'digitar':
      return salvarAceitas(id, r.aceitas);
    case 'ordenar': {
      const erro = await trocarAlternativas(
        id,
        embaralharPalavras(r.frase).map((texto, ordem) => ({ texto, ordem, lado: null }))
      );
      return erro ?? salvarAceitas(id, [r.frase.trim()]);
    }
    case 'ligar':
      return salvarPares(id, r.pares);
    default:
      return null;
  }
}

// As alternativas que já existiam são atualizadas (não recriadas), para não apagar as
// respostas que os alunos já deram.
async function salvarMultiplaEscolha(questaoId: string, r: Rascunho, idsOriginais: string[]) {
  const idsFinais: string[] = [];
  for (const [ordem, alternativa] of r.alternativas.entries()) {
    const texto = alternativa.texto.trim();
    if (alternativa.id) {
      const { error } = await supabase
        .from('alternativas')
        .update({ texto, ordem })
        .eq('id', alternativa.id);
      if (error) return ERRO_SALVAR;
      idsFinais.push(alternativa.id);
    } else {
      const { data, error } = await supabase
        .from('alternativas')
        .insert({ questao_id: questaoId, texto, ordem })
        .select('id')
        .single();
      if (error || !data) return ERRO_SALVAR;
      idsFinais.push(data.id);
    }
  }

  const removidas = idsOriginais.filter((id) => !idsFinais.includes(id));
  if (removidas.length > 0) {
    const { error } = await supabase.from('alternativas').delete().in('id', removidas);
    if (error) return ERRO_SALVAR;
  }

  const certa = idsFinais[r.indiceCorreta ?? 0];
  const { error } = await supabase
    .from('gabaritos')
    .upsert({ questao_id: questaoId, alternativa_id: certa }, { onConflict: 'questao_id' });
  return error ? ERRO_SALVAR : null;
}

async function salvarAceitas(questaoId: string, aceitas: string[]) {
  const { error: erroApagar } = await supabase
    .from('respostas_aceitas')
    .delete()
    .eq('questao_id', questaoId);
  if (erroApagar) return ERRO_SALVAR;
  const { error } = await supabase
    .from('respostas_aceitas')
    .insert(aceitas.map((texto, ordem) => ({ questao_id: questaoId, texto, ordem })));
  return error ? ERRO_SALVAR : null;
}

// Apaga as alternativas da pergunta (e os pares, que dependem delas) e grava as novas
async function trocarAlternativas(
  questaoId: string,
  novas: { texto: string; ordem: number; lado: 'esquerda' | 'direita' | null }[]
) {
  const { error: erroApagar } = await supabase
    .from('alternativas')
    .delete()
    .eq('questao_id', questaoId);
  if (erroApagar) return ERRO_SALVAR;
  const { error } = await supabase
    .from('alternativas')
    .insert(novas.map((n) => ({ ...n, questao_id: questaoId })));
  return error ? ERRO_SALVAR : null;
}

async function salvarPares(questaoId: string, pares: Par[]) {
  // A direita é guardada embaralhada: a ordem dela é a que o aluno vê
  const ordemDireita = embaralhar(pares.map((_, i) => i));
  const erro = await trocarAlternativas(questaoId, [
    ...pares.map((p, i) => ({ texto: p.esquerda.trim(), ordem: i, lado: 'esquerda' as const })),
    ...pares.map((p, i) => ({
      texto: p.direita.trim(),
      ordem: ordemDireita.indexOf(i),
      lado: 'direita' as const,
    })),
  ]);
  if (erro) return erro;

  const { data, error } = await supabase
    .from('alternativas')
    .select('id, ordem, lado')
    .eq('questao_id', questaoId);
  if (error || !data) return ERRO_SALVAR;
  const idDe = (lado: string, ordem: number) =>
    data.find((a) => a.lado === lado && a.ordem === ordem)?.id;

  const linhas = pares.map((_, i) => ({
    questao_id: questaoId,
    esquerda_id: idDe('esquerda', i),
    direita_id: idDe('direita', ordemDireita.indexOf(i)),
  }));
  if (linhas.some((l) => !l.esquerda_id || !l.direita_id)) return ERRO_SALVAR;
  const { error: erroPares } = await supabase.from('pares_corretos').insert(linhas);
  return erroPares ? ERRO_SALVAR : null;
}

export async function apagarQuestao(id: string) {
  const { error } = await supabase.from('questoes').delete().eq('id', id);
  return error ? 'Não foi possível apagar a pergunta.' : null;
}

// O que o aluno respondeu, conforme o tipo da pergunta
export type Resposta = { alternativa?: string; texto?: string; pares?: Par[] };

export type Correcao = {
  correta: boolean | null; // null = resposta livre (sem correção automática)
  alternativaCorreta: string | null;
  respostaCerta: string | null;
  paresCorretos: Record<string, string>;
  explicacao: string | null;
};

// O aluno responde pelo servidor, que confere o gabarito e grava a 1ª tentativa
export async function responderQuestao(questaoId: string, resposta: Resposta): Promise<Correcao> {
  const { data, error } = await supabase.rpc('responder_exercicio', {
    questao: questaoId,
    alternativa: resposta.alternativa ?? null,
    resposta: resposta.texto ?? null,
    pares: resposta.pares ?? null,
  });
  if (error || !data) throw error ?? new Error('sem resposta');
  const pares: Record<string, string> = {};
  for (const p of (data.pares_corretos ?? []) as Par[]) pares[p.esquerda] = p.direita;
  return {
    correta: data.correta,
    alternativaCorreta: data.alternativa_correta,
    respostaCerta: data.resposta_certa,
    paresCorretos: pares,
    explicacao: data.explicacao,
  };
}

// Correção local, com o gabarito que o mentor já tem (pré-visualização: nada é gravado)
export function corrigirLocal(questao: Questao, gabarito: Gabarito, resposta: Resposta): Correcao {
  const base = {
    alternativaCorreta: gabarito.alternativaCorreta,
    respostaCerta: gabarito.aceitas[0] ?? null,
    paresCorretos: gabarito.pares,
    explicacao: questao.explicacao,
  };
  switch (questao.tipo) {
    case 'multipla_escolha':
      return { ...base, correta: resposta.alternativa === gabarito.alternativaCorreta };
    case 'digitar':
    case 'ordenar': {
      const dada = normalizarResposta(resposta.texto ?? '');
      return { ...base, correta: gabarito.aceitas.some((a) => normalizarResposta(a) === dada) };
    }
    case 'ligar': {
      const total = Object.keys(gabarito.pares).length;
      const certos = (resposta.pares ?? []).filter(
        (p) => gabarito.pares[p.esquerda] === p.direita
      ).length;
      return { ...base, correta: total > 0 && certos === total };
    }
    default:
      return { ...base, correta: null };
  }
}
