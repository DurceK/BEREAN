import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Papel = 'mentor' | 'mentorado';

export type Usuario = {
  id: string;
  nome: string;
  papel: Papel;
  precisaTrocarSenha: boolean;
};

type AuthContextValue = {
  session: Session | null;
  usuario: Usuario | null;
  isLoading: boolean;
  entrar: (matricula: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
  trocarSenha: (novaSenha: string) => Promise<{ erro: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function matriculaParaEmail(matricula: string) {
  return `${matricula.trim().toLowerCase()}@berean.app`;
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

  useEffect(() => {
    let cancelado = false;

    async function sincronizarUsuario() {
      if (!session) {
        if (!cancelado) {
          setUsuario(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, papel, precisa_trocar_senha')
        .eq('id', session.user.id)
        .single();

      if (!cancelado) {
        setUsuario(
          data
            ? {
                id: data.id,
                nome: data.nome,
                papel: data.papel,
                precisaTrocarSenha: data.precisa_trocar_senha,
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
  }, [session]);

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

  return (
    <AuthContext.Provider value={{ session, usuario, isLoading, entrar, sair, trocarSenha }}>
      {children}
    </AuthContext.Provider>
  );
}
