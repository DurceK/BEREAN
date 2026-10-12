import { Stack } from 'expo-router';
import { fontes, useTema } from '../../lib/tema';

export default function MentorLayout() {
  const { cores } = useTema();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.fundo },
        headerTintColor: cores.texto,
        headerTitleStyle: { fontFamily: fontes.tituloLeve },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="inicio" options={{ title: 'Início', headerShown: false }} />
      <Stack.Screen name="previa/[aulaId]" options={{ title: 'Pré-visualização' }} />
      <Stack.Screen name="alunos" options={{ title: 'Alunos' }} />
      <Stack.Screen name="aluno/[alunoId]" options={{ title: 'Progresso do aluno' }} />
      <Stack.Screen name="aula/[aulaId]" options={{ title: 'Conteúdo' }} />
    </Stack>
  );
}
