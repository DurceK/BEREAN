import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Papel = 'mentor' | 'mentorado';

export type Perfil = {
  id: string;
  nome: string;
  papel: Papel;
};

type AuthContextValue = {
  session: Session | null;
  perfil: Perfil | null;
  isLoading: boolean;
  entrar: (matricula: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
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
  const [perfil, setPerfil] = useState<Perfil | null>(null);
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

    async function sincronizarPerfil() {
      if (!session) {
        if (!cancelado) {
          setPerfil(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const { data } = await supabase
        .from('perfis')
        .select('id, nome, papel')
        .eq('id', session.user.id)
        .single();

      if (!cancelado) {
        setPerfil((data as Perfil) ?? null);
        setIsLoading(false);
      }
    }

    sincronizarPerfil();

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

  return (
    <AuthContext.Provider value={{ session, perfil, isLoading, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}
