// Função no servidor do Supabase para operações que exigem a chave de administrador:
// cadastrar mentorado (login + cadastro + inscrições) e redefinir a senha de um aluno.
// A chave de administrador só existe aqui no servidor, nunca no app.
//
// Publicar: npx.cmd supabase functions deploy admin-usuarios --project-ref dfjxblptvffhjykaowmk --no-verify-jwt --use-api
// (--no-verify-jwt porque o navegador faz uma checagem prévia sem login; a função valida o login por conta própria)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SENHA_MINIMA = 6;

function resposta(corpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function chaveAdmin() {
  const chaves = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (chaves) {
    try {
      const lista = JSON.parse(chaves) as Record<string, string>;
      const chave = lista.default ?? Object.values(lista)[0];
      if (chave) return chave;
    } catch {
      // cai para a chave antiga abaixo
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, chaveAdmin(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: quem, error: erroLogin } = await admin.auth.getUser(token);
  if (erroLogin || !quem.user) return resposta({ erro: 'Sua sessão expirou. Entre novamente.' }, 401);
  const mentorId = quem.user.id;

  const { data: chamador } = await admin.from('usuarios').select('papel').eq('id', mentorId).single();
  if (chamador?.papel !== 'mentor') return resposta({ erro: 'Só mentores podem fazer isso.' }, 403);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return resposta({ erro: 'Pedido inválido.' }, 400);
  }

  if (corpo.acao === 'criar_mentorado') return criarMentorado(mentorId, corpo);
  if (corpo.acao === 'redefinir_senha') return redefinirSenha(mentorId, corpo);
  return resposta({ erro: 'Ação desconhecida.' }, 400);
});

async function criarMentorado(mentorId: string, corpo: Record<string, unknown>) {
  const nome = String(corpo.nome ?? '').trim();
  const matricula = String(corpo.matricula ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');
  const categorias = Array.isArray(corpo.categorias) ? corpo.categorias.map(String) : [];

  if (!nome) return resposta({ erro: 'Informe o nome do aluno.' }, 400);
  if (!/^[a-z0-9._-]{3,30}$/.test(matricula)) {
    return resposta(
      { erro: 'A matrícula deve ter de 3 a 30 caracteres, só letras, números, ponto, hífen ou sublinhado.' },
      400
    );
  }
  if (senha.length < SENHA_MINIMA) {
    return resposta({ erro: `A senha provisória precisa ter pelo menos ${SENHA_MINIMA} caracteres.` }, 400);
  }
  if (categorias.length === 0) return resposta({ erro: 'Escolha pelo menos um curso.' }, 400);

  const { data: suas } = await admin
    .from('categorias')
    .select('id')
    .eq('mentor_id', mentorId)
    .in('id', categorias);
  if ((suas ?? []).length !== categorias.length) {
    return resposta({ erro: 'Um dos cursos escolhidos não é seu.' }, 403);
  }

  const { data: existente } = await admin.from('usuarios').select('id').eq('matricula', matricula).maybeSingle();
  if (existente) return resposta({ erro: 'Já existe alguém com essa matrícula.' }, 409);

  const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
    email: `${matricula}@berean.app`,
    password: senha,
    email_confirm: true,
  });
  if (erroCriar || !criado.user) {
    const jaExiste = /already|registered|exists/i.test(erroCriar?.message ?? '');
    return resposta(
      { erro: jaExiste ? 'Já existe alguém com essa matrícula.' : 'Não foi possível criar o login.' },
      jaExiste ? 409 : 500
    );
  }
  const alunoId = criado.user.id;

  const { error: erroCadastro } = await admin.from('usuarios').insert({
    id: alunoId,
    matricula,
    nome,
    papel: 'mentorado',
    precisa_trocar_senha: true,
  });
  if (erroCadastro) {
    await admin.auth.admin.deleteUser(alunoId);
    return resposta({ erro: 'Não foi possível salvar o cadastro do aluno.' }, 500);
  }

  const { error: erroInscricao } = await admin
    .from('inscricoes')
    .insert(categorias.map((categoria_id) => ({ mentorado_id: alunoId, categoria_id })));
  if (erroInscricao) {
    // apagar o login apaga o cadastro junto (on delete cascade)
    await admin.auth.admin.deleteUser(alunoId);
    return resposta({ erro: 'Não foi possível inscrever o aluno nos cursos.' }, 500);
  }

  return resposta({ id: alunoId });
}

async function redefinirSenha(mentorId: string, corpo: Record<string, unknown>) {
  const alunoId = String(corpo.usuario_id ?? '');
  const senha = String(corpo.senha ?? '');

  if (!alunoId) return resposta({ erro: 'Aluno não informado.' }, 400);
  if (senha.length < SENHA_MINIMA) {
    return resposta({ erro: `A senha provisória precisa ter pelo menos ${SENHA_MINIMA} caracteres.` }, 400);
  }

  const { data: vinculo } = await admin
    .from('inscricoes')
    .select('id, categorias!inner(mentor_id)')
    .eq('mentorado_id', alunoId)
    .eq('categorias.mentor_id', mentorId)
    .limit(1);
  if (!vinculo || vinculo.length === 0) {
    return resposta({ erro: 'Este aluno não está inscrito em nenhum curso seu.' }, 403);
  }

  const { error: erroSenha } = await admin.auth.admin.updateUserById(alunoId, { password: senha });
  if (erroSenha) return resposta({ erro: 'Não foi possível redefinir a senha.' }, 500);

  await admin.from('usuarios').update({ precisa_trocar_senha: true }).eq('id', alunoId);
  return resposta({ ok: true });
}
