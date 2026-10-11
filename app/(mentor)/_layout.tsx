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
      <Stack.Screen name="inicio" options={{ title: 'Início' }} />
      <Stack.Screen name="editar-categoria" options={{ title: 'Categorias' }} />
      <Stack.Screen name="sessao/[sessaoId]" options={{ title: 'Conteúdo' }} />
    </Stack>
  );
}
