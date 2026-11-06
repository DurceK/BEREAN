// Importação de aulas a partir de uma planilha padrão (.xlsx), feita pelo site.
// Leiaute (aba "perguntas"): cada linha é uma pergunta. Perguntas com o mesmo
// "titulo_exercicio" formam um exercício, que vira uma aula nova. A coluna "modulo"
// diz em qual módulo a aula entra: se o curso já tem um módulo com esse nome, as aulas
// entram no fim dele; senão, o módulo é criado no fim do curso. Nada é apagado.
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { embaralhar, normalizarResposta, type TipoQuestao } from './exercicios';

export const COLUNAS = [
  'modulo',
  'titulo_exercicio',
  'numero',
  'tipo',
  'enunciado',
  'alternativa_a',
  'alternativa_b',
  'alternativa_c',
  'alternativa_d',
  'alternativa_correta',
  'resposta_correta',
  'respostas_aceitas',
  'palavras_embaralhadas',
  'frase_correta',
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [`par${n}_esquerda`, `par${n}_direita`]),
  'resposta_exemplo',
  'explicacao',
] as const;

const TIPOS: Record<string, TipoQuestao> = {
  multipla_escolha: 'multipla_escolha',
  digitar: 'digitar',
  ordenar: 'ordenar',
  ordenar_palavras: 'ordenar',
  ligar: 'ligar',
  ligar_colunas: 'ligar',
  livre: 'livre',
  resposta_livre: 'livre',
};

type Linha = Record<string, string>;

export type PerguntaImportada = {
  linha: number;
  tipo: TipoQuestao;
  enunciado: string;
  explicacao: string | null;
  alternativas: string[]; // múltipla escolha
  certa: number; // índice em alternativas
  aceitas: string[]; // digitar
  palavras: string[]; // ordenar
  frase: string; // ordenar
  pares: { esquerda: string; direita: string }[]; // ligar
};

export type ExercicioImportado = { titulo: string; perguntas: PerguntaImportada[] };
export type ModuloImportado = { nome: string; exercicios: ExercicioImportado[] };
export type Importacao = { modulos: ModuloImportado[]; erros: string[]; perguntas: number };

const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const lista = (v: string) =>
  v
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);

// Lê o arquivo escolhido e devolve o que será importado (ou os erros encontrados)
export async function lerPlanilha(arquivo: File): Promise<Importacao> {
  const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
  const aba =
    livro.Sheets['perguntas'] ??
    livro.SheetNames.map((n) => livro.Sheets[n]).find((s) => {
      const cab = XLSX.utils.sheet_to_json<string[]>(s, { header: 1 })[0] ?? [];
      return cab.map((c) => texto(c).toLowerCase()).includes('tipo');
    });
  if (!aba) {
    return { modulos: [], perguntas: 0, erros: ['Não encontrei a aba "perguntas" na planilha.'] };
  }
  const brutas = XLSX.utils.sheet_to_json<Record<string, unknown>>(aba, { defval: '' });
  const linhas: Linha[] = brutas.map((b) => {
    const l: Linha = {};
    for (const [k, v] of Object.entries(b)) l[texto(k).toLowerCase()] = texto(v);
    return l;
  });

  const erros: string[] = [];
  const modulos: ModuloImportado[] = [];
  const exercicios = new Map<string, ExercicioImportado & { numeros: number[] }>();
  let total = 0;

  linhas.forEach((l, i) => {
    const n = i + 2; // linha da planilha (a 1 é o cabeçalho)
    if (!Object.values(l).some(Boolean)) return;
    const resultado = lerPergunta(l, n);
    if (typeof resultado === 'string') {
      erros.push(resultado);
      return;
    }
    const nomeModulo = l.modulo || 'Aulas importadas';
    const titulo = l.titulo_exercicio || 'Exercício importado';
    const chave = `${nomeModulo}\u0000${titulo}`;
    let ex = exercicios.get(chave);
    if (!ex) {
      ex = { titulo, perguntas: [], numeros: [] };
      exercicios.set(chave, ex);
      let mod = modulos.find((m) => m.nome === nomeModulo);
      if (!mod) {
        mod = { nome: nomeModulo, exercicios: [] };
        modulos.push(mod);
      }
      mod.exercicios.push(ex);
    }
    ex.perguntas.push(resultado);
    ex.numeros.push(Number(l.numero) || ex.perguntas.length);
    total++;
  });

  // Dentro de cada exercício, as perguntas seguem a coluna "numero"
  for (const ex of exercicios.values()) {
    const ordem = ex.perguntas.map((p, i) => ({ p, n: ex.numeros[i] }));
    ordem.sort((a, b) => a.n - b.n);
    ex.perguntas = ordem.map((o) => o.p);
  }
  for (const m of modulos) {
    m.exercicios = m.exercicios.map(({ titulo, perguntas }) => ({ titulo, perguntas }));
  }
  return { modulos, erros, perguntas: total };
}

function lerPergunta(l: Linha, n: number): PerguntaImportada | string {
  const onde = `Linha ${n}`;
  const tipo = TIPOS[l.tipo?.toLowerCase()];
  if (!tipo) return `${onde}: tipo "${l.tipo}" desconhecido.`;
  if (!l.enunciado) return `${onde}: falta o enunciado.`;
  const base: PerguntaImportada = {
    linha: n,
    tipo,
    enunciado: l.enunciado,
    explicacao: l.explicacao || null,
    alternativas: [],
    certa: 0,
    aceitas: [],
    palavras: [],
    frase: '',
    pares: [],
  };

  switch (tipo) {
    case 'multipla_escolha': {
      const letras = ['a', 'b', 'c', 'd'];
      const usadas = letras.filter((x) => l[`alternativa_${x}`]);
      if (usadas.length < 2) return `${onde}: a múltipla escolha precisa de 2 a 4 alternativas.`;
      const correta = l.alternativa_correta?.toLowerCase();
      if (!usadas.includes(correta)) {
        return `${onde}: "alternativa_correta" deve ser a letra de uma alternativa preenchida.`;
      }
      return {
        ...base,
        alternativas: usadas.map((x) => l[`alternativa_${x}`]),
        certa: usadas.indexOf(correta),
      };
    }
    case 'digitar': {
      const aceitas = [l.resposta_correta, ...lista(l.respostas_aceitas ?? '')].filter(Boolean);
      const unicas = aceitas.filter(
        (a, i) => aceitas.findIndex((b) => normalizarResposta(b) === normalizarResposta(a)) === i
      );
      if (unicas.length === 0) return `${onde}: falta a resposta certa.`;
      return { ...base, aceitas: unicas };
    }
    case 'ordenar': {
      const frase = l.frase_correta;
      if (!frase) return `${onde}: falta a frase_correta.`;
      let palavras = lista(l.palavras_embaralhadas ?? '');
      if (palavras.length === 0) palavras = embaralhar(frase.split(/\s+/).filter(Boolean));
      const juntas = (p: string[]) => normalizarResposta(p.join(' ')).split(' ').sort().join(' ');
      if (juntas(palavras) !== juntas([frase])) {
        return `${onde}: as palavras embaralhadas não formam a frase_correta.`;
      }
      return { ...base, palavras, frase };
    }
    case 'ligar': {
      const pares: { esquerda: string; direita: string }[] = [];
      for (let i = 1; i <= 6; i++) {
        const esquerda = l[`par${i}_esquerda`];
        const direita = l[`par${i}_direita`];
        if (!esquerda && !direita) continue;
        if (!esquerda || !direita) return `${onde}: o par ${i} está incompleto.`;
        pares.push({ esquerda, direita });
      }
      if (pares.length < 2) return `${onde}: ligar colunas precisa de pelo menos 2 pares.`;
      return { ...base, pares };
    }
    default: {
      // Resposta livre: o exemplo de resposta aparece junto da explicação
      const partes = [
        l.explicacao,
        l.resposta_exemplo && `Exemplo de resposta: ${l.resposta_exemplo}`,
      ];
      return { ...base, explicacao: partes.filter(Boolean).join('\n') || null };
    }
  }
}

const novoId = () => crypto.randomUUID();

async function inserir(tabela: string, linhas: object[]) {
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from(tabela).insert(linhas.slice(i, i + 500));
    if (error) throw error;
  }
}

// Grava a importação no curso: só acrescenta. Se algo falhar no meio, desfaz o que criou.
export async function importarNoCurso(
  categoriaId: string,
  modulosDoCurso: { id: string; nome: string; ordem: number; aulas: { ordem: number }[] }[],
  dados: Importacao,
  aoAvancar?: (etapa: string) => void
): Promise<string | null> {
  const modulosNovos: object[] = [];
  const aulas: object[] = [];
  const midias: object[] = [];
  const questoes: object[] = [];
  const alternativas: object[] = [];
  const gabaritos: object[] = [];
  const aceitas: object[] = [];
  const pares: object[] = [];
  const idsModulosNovos: string[] = [];
  const idsAulas: string[] = [];

  let ordemModulo = modulosDoCurso.reduce((m, x) => Math.max(m, x.ordem), -1) + 1;
  for (const mod of dados.modulos) {
    const existente = modulosDoCurso.find((m) => m.nome.trim() === mod.nome.trim());
    let moduloId: string;
    let ordemAula: number;
    if (existente) {
      moduloId = existente.id;
      ordemAula = existente.aulas.reduce((m, a) => Math.max(m, a.ordem), -1) + 1;
    } else {
      moduloId = novoId();
      idsModulosNovos.push(moduloId);
      modulosNovos.push({
        id: moduloId,
        categoria_id: categoriaId,
        nome: mod.nome,
        ordem: ordemModulo++,
      });
      ordemAula = 0;
    }
    for (const ex of mod.exercicios) {
      const aulaId = novoId();
      idsAulas.push(aulaId);
      aulas.push({ id: aulaId, modulo_id: moduloId, titulo: ex.titulo, ordem: ordemAula++ });
      const midiaId = novoId();
      midias.push({ id: midiaId, aula_id: aulaId, tipo: 'exercicio', ordem: 0, titulo: ex.titulo });
      ex.perguntas.forEach((p, ordem) => {
        const questaoId = novoId();
        questoes.push({
          id: questaoId,
          midia_id: midiaId,
          ordem,
          tipo: p.tipo,
          enunciado: p.enunciado,
          explicacao: p.explicacao,
        });
        if (p.tipo === 'multipla_escolha') {
          p.alternativas.forEach((t, i) => {
            const id = novoId();
            alternativas.push({ id, questao_id: questaoId, ordem: i, texto: t });
            if (i === p.certa) gabaritos.push({ questao_id: questaoId, alternativa_id: id });
          });
        } else if (p.tipo === 'digitar') {
          p.aceitas.forEach((t, i) => aceitas.push({ questao_id: questaoId, ordem: i, texto: t }));
        } else if (p.tipo === 'ordenar') {
          p.palavras.forEach((t, i) =>
            alternativas.push({ questao_id: questaoId, ordem: i, texto: t, lado: null })
          );
          aceitas.push({ questao_id: questaoId, ordem: 0, texto: p.frase });
        } else if (p.tipo === 'ligar') {
          // A direita é guardada embaralhada: a ordem dela é a que o aluno vê
          const ordemDireita = embaralhar(p.pares.map((_, i) => i));
          const idsDireita = p.pares.map(() => novoId());
          p.pares.forEach((par, i) => {
            alternativas.push({
              id: idsDireita[i],
              questao_id: questaoId,
              ordem: ordemDireita.indexOf(i),
              texto: par.direita,
              lado: 'direita',
            });
          });
          p.pares.forEach((par, i) => {
            const idEsquerda = novoId();
            alternativas.push({
              id: idEsquerda,
              questao_id: questaoId,
              ordem: i,
              texto: par.esquerda,
              lado: 'esquerda',
            });
            pares.push({
              esquerda_id: idEsquerda,
              direita_id: idsDireita[i],
              questao_id: questaoId,
            });
          });
        }
      });
    }
  }

  try {
    aoAvancar?.('Criando módulos e aulas...');
    await inserir('modulos', modulosNovos);
    await inserir('aulas', aulas);
    await inserir('midias', midias);
    aoAvancar?.('Gravando perguntas...');
    await inserir('questoes', questoes);
    await inserir('alternativas', alternativas);
    aoAvancar?.('Gravando respostas certas...');
    await inserir('gabaritos', gabaritos);
    await inserir('respostas_aceitas', aceitas);
    await inserir('pares_corretos', pares);
    return null;
  } catch {
    // Desfaz: apagar as aulas e os módulos novos leva junto tudo o que veio depois
    if (idsAulas.length) await supabase.from('aulas').delete().in('id', idsAulas);
    if (idsModulosNovos.length) await supabase.from('modulos').delete().in('id', idsModulosNovos);
    return 'Não foi possível importar. Nada foi gravado. Tente de novo.';
  }
}

// Planilha-modelo para o professor preencher
export function baixarModelo() {
  const leiaMe = [
    ['Modelo de importação de aulas'],
    [],
    [
      'Como funciona',
      'Na aba "perguntas", cada LINHA é uma pergunta. Perguntas com o mesmo "titulo_exercicio" viram uma aula nova com esse exercício. Nada do curso é apagado: as aulas entram no fim.',
    ],
    [
      'modulo',
      'Nome do módulo. Se o curso já tiver um módulo com esse nome, as aulas entram no fim dele; senão, um módulo novo é criado no fim do curso.',
    ],
    ['titulo_exercicio', 'Título da aula e do exercício.'],
    ['numero', 'Ordem da pergunta dentro do exercício.'],
    ['tipo', 'multipla_escolha, digitar, ordenar_palavras, ligar_colunas ou resposta_livre.'],
    ['enunciado', 'Texto da pergunta (todos os tipos).'],
    [
      'alternativa_a a d',
      'Só em multipla_escolha: de 2 a 4 alternativas. Verdadeiro/falso é multipla_escolha com "Verdadeiro" e "Falso".',
    ],
    ['alternativa_correta', 'Só em multipla_escolha: a letra da certa (A, B, C ou D).'],
    ['resposta_correta', 'Só em digitar: a resposta principal.'],
    ['respostas_aceitas', 'Só em digitar: outras respostas aceitas, separadas por " | ".'],
    [
      'palavras_embaralhadas',
      'Só em ordenar_palavras: as palavras fora de ordem, separadas por " | " (opcional: se vazio, o app embaralha).',
    ],
    ['frase_correta', 'Só em ordenar_palavras: a frase na ordem certa.'],
    ['par1_esquerda ... par6_direita', 'Só em ligar_colunas: cada par certo (de 2 a 6 pares).'],
    ['resposta_exemplo', 'Só em resposta_livre: um exemplo de resposta (opcional).'],
    ['explicacao', 'Texto que aparece depois que o aluno responde (opcional).'],
  ];
  const exemplo = (v: Partial<Record<(typeof COLUNAS)[number], string | number>>) =>
    COLUNAS.map((c) => v[c] ?? '');
  const perguntas = [
    [...COLUNAS],
    exemplo({
      modulo: 'Módulo 1',
      titulo_exercicio: 'Aula 1 – Cumprimentos',
      numero: 1,
      tipo: 'multipla_escolha',
      enunciado: 'Como se diz "Bom dia"?',
      alternativa_a: 'Good night',
      alternativa_b: 'Good morning',
      alternativa_correta: 'B',
      explicacao: 'Morning = manhã.',
    }),
    exemplo({
      modulo: 'Módulo 1',
      titulo_exercicio: 'Aula 1 – Cumprimentos',
      numero: 2,
      tipo: 'digitar',
      enunciado: 'Traduza: Olá!',
      resposta_correta: 'Hello!',
      respostas_aceitas: 'Hi!',
    }),
    exemplo({
      modulo: 'Módulo 1',
      titulo_exercicio: 'Aula 1 – Cumprimentos',
      numero: 3,
      tipo: 'ordenar_palavras',
      enunciado: 'Monte a frase.',
      palavras_embaralhadas: 'later | you | See',
      frase_correta: 'See you later!',
    }),
    exemplo({
      modulo: 'Módulo 1',
      titulo_exercicio: 'Aula 1 – Cumprimentos',
      numero: 4,
      tipo: 'ligar_colunas',
      enunciado: 'Ligue as frases.',
      par1_esquerda: 'Hello!',
      par1_direita: 'Olá!',
      par2_esquerda: 'Goodbye!',
      par2_direita: 'Tchau!',
    }),
    exemplo({
      modulo: 'Módulo 1',
      titulo_exercicio: 'Aula 1 – Cumprimentos',
      numero: 5,
      tipo: 'resposta_livre',
      enunciado: 'Escreva como você cumprimenta alguém de manhã.',
      resposta_exemplo: 'Good morning!',
    }),
  ];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(leiaMe), 'LEIA-ME');
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(perguntas), 'perguntas');
  XLSX.writeFile(livro, 'modelo-importacao-aulas.xlsx');
}
