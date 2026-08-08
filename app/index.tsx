import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';

export default function Index() {
  const { session, perfil, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (perfil?.precisaTrocarSenha) {
    return <Redirect href="/trocar-senha" />;
  }

  if (perfil?.papel === 'mentor') {
    return <Redirect href="/(mentor)/inicio" />;
  }

  if (perfil?.papel === 'mentorado') {
    return <Redirect href="/(mentorado)/inicio" />;
  }

  return null;
}
