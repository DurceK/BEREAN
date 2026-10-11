import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';

export default function Index() {
  const { session, usuario, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (usuario?.precisaTrocarSenha) {
    return <Redirect href="/trocar-senha" />;
  }

  if (usuario?.papel === 'mentor') {
    return <Redirect href="/(mentor)/inicio" />;
  }

  if (usuario?.papel === 'mentorado') {
    return <Redirect href="/(mentorado)/inicio" />;
  }

  return null;
}
