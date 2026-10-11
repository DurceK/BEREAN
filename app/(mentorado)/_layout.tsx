import { Stack } from 'expo-router';
import { fontes, useTema } from '../../lib/tema';

export default function MentoradoLayout() {
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
      <Stack.Screen name="inicio" options={{ title: 'Minhas aulas', headerShown: false }} />
      <Stack.Screen name="assistir/[aulaId]" options={{ title: 'Aula' }} />
    </Stack>
  );
}
