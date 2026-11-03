import { supabase } from './supabase';

type Resultado = { erro: string | null; dados?: Record<string, unknown> | null };

// Chama a função "admin-usuarios" no servidor do Supabase (ver supabase/functions/admin-usuarios).
async function chamar(acao: string, dados: Record<string, unknown>): Promise<Resultado> {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', {
    body: { acao, ...dados },
  });
  if (!error) return { erro: null, dados: data };

  // A função devolve { erro: "mensagem" }; quando não der pra ler, usa uma mensagem genérica
  let mensagem = 'Não foi possível concluir. Verifique a conexão e tente de novo.';
  try {
    const corpo = await (error as { context?: Response }).context?.json();
    if (corpo?.erro) mensagem = corpo.erro;
  } catch {
    // mantém a mensagem genérica
  }
  return { erro: mensagem };
}

export function criarMentorado(dados: {
  nome: string;
  matricula: string;
  senha: string;
  categorias: string[];
}) {
  return chamar('criar_mentorado', dados);
}

// confirmacao: a matrícula do aluno, digitada pelo mentor (o servidor confere de novo)
export function excluirMentorado(usuarioId: string, confirmacao: string) {
  return chamar('excluir_mentorado', { usuario_id: usuarioId, confirmacao });
}

export function redefinirSenha(usuarioId: string, senha: string) {
  return chamar('redefinir_senha', { usuario_id: usuarioId, senha });
}

// Senha provisória fácil de ditar: sem letras/números que se confundem (0/O, 1/l/I)
export function gerarSenhaProvisoria() {
  const caracteres = 'abcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 8; i++) senha += caracteres[Math.floor(Math.random() * caracteres.length)];
  return senha;
}
