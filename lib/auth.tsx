import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { cliente } from './cliente';
import { VERSAO_TERMO } from './termo';

export type Papel = 'mentor' | 'mentorado';

export type Usuario = {
  id: string;
  nome: string;
  papel: Papel;
  precisaTrocarSenha: boolean;
  avatar: string | null; // caminho da foto no bucket "avatares"
  menorDeIdade: boolean; // quem aceita o termo é o responsável
  precisaAceitarTermo: boolean; // aluno que ainda não aceitou a versão atual do termo
};

type AuthContextValue = {
  session: Session | null;
  usuario: Usuario | null;
  isLoading: boolean;
  entrar: (matricula: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
  trocarSenha: (novaSenha: string) => Promise<{ erro: string | null }>;
  definirAvatar: (caminho: string) => void;
  aceitarTermo: (nomeResponsavel: string | null) => Promise<{ erro: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function matriculaParaEmail(matricula: string) {
  return `${matricula.trim().toLowerCase()}@${cliente.dominioLogin}`;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth precisa estar dentro de AuthProvider');
  }
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // O Supabase renova o login sozinho (por exemplo, ao voltar para a aba) e entrega uma
  // sessão nova a cada renovação. Recarregar o cadastro a cada uma mostrava a tela de
  // carregando e remontava a navegação, jogando a pessoa de volta à tela inicial.
  // Por isso o cadastro só é recarregado quando muda QUEM está logado.
  const usuarioId = session?.user.id ?? null;

  useEffect(() => {
    let cancelado = false;

    async function sincronizarUsuario() {
      if (!usuarioId) {
        if (!cancelado) {
          setUsuario(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, papel, precisa_trocar_senha, avatar_url, menor_de_idade')
        .eq('id', usuarioId)
        .single();
      // Só o aluno aceita o termo (o mentor é o cliente, que assina o contrato)
      let aceitou = true;
      if (data?.papel === 'mentorado') {
        const { data: aceite } = await supabase
          .from('aceites_termo')
          .select('versao')
          .eq('usuario_id', usuarioId)
          .eq('versao', VERSAO_TERMO)
          .maybeSingle();
        aceitou = !!aceite;
      }

      if (!cancelado) {
        setUsuario(
          data
            ? {
                id: data.id,
                nome: data.nome,
                papel: data.papel,
                precisaTrocarSenha: data.precisa_trocar_senha,
                avatar: data.avatar_url,
                menorDeIdade: data.menor_de_idade,
                precisaAceitarTermo: !aceitou,
              }
            : null
        );
        setIsLoading(false);
      }
    }

    sincronizarUsuario();

    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  async function entrar(matricula: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: matriculaParaEmail(matricula),
      password: senha,
    });
    return { erro: error ? 'Matrícula ou senha incorretos.' : null };
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  async function trocarSenha(novaSenha: string) {
    const { error: erroSenha } = await supabase.auth.updateUser({ password: novaSenha });
    if (erroSenha) {
      return { erro: 'Não foi possível trocar a senha. Tente novamente.' };
    }

    if (usuario) {
      const { error: erroUsuario } = await supabase
        .from('usuarios')
        .update({ precisa_trocar_senha: false })
        .eq('id', usuario.id);

      if (erroUsuario) {
        return { erro: 'Senha trocada, mas houve um erro ao atualizar o cadastro.' };
      }

      setUsuario({ ...usuario, precisaTrocarSenha: false });
    }

    return { erro: null };
  }

  // Registra o aceite da versão atual do termo (pelo responsável, se o aluno for menor)
  async function aceitarTermo(nomeResponsavel: string | null) {
    if (!usuario) return { erro: 'Entre de novo e tente outra vez.' };
    const { error } = await supabase.from('aceites_termo').insert({
      usuario_id: usuario.id,
      versao: VERSAO_TERMO,
      aceito_por_responsavel: !!nomeResponsavel,
      nome_responsavel: nomeResponsavel,
    });
    // já aceito antes (ex: dois toques): conta como aceito
    if (error && error.code !== '23505') {
      return { erro: 'Não foi possível registrar o aceite. Verifique a conexão e tente de novo.' };
    }
    setUsuario({ ...usuario, precisaAceitarTermo: false });
    return { erro: null };
  }

  function definirAvatar(caminho: string) {
    setUsuario((atual) => (atual ? { ...atual, avatar: caminho } : atual));
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        usuario,
        isLoading,
        entrar,
        sair,
        trocarSenha,
        definirAvatar,
        aceitarTermo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
