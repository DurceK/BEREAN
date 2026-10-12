import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from '../lib/auth';
import { fontesDoCliente } from '../lib/cliente';
import { useTema } from '../lib/tema';

SplashScreen.preventAutoHideAsync();

function RaizProtegida() {
  const { session, usuario, isLoading } = useAuth();
  const { cores } = useTema();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: cores.fundo,
        }}
      >
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !!usuario?.precisaTrocarSenha}>
        <Stack.Screen name="trocar-senha" />
      </Stack.Protected>
      <Stack.Protected
        guard={!!session && !usuario?.precisaTrocarSenha && usuario?.papel === 'mentor'}
      >
        <Stack.Screen name="(mentor)" />
      </Stack.Protected>
      <Stack.Protected
        guard={!!session && !usuario?.precisaTrocarSenha && usuario?.papel === 'mentorado'}
      >
        <Stack.Screen name="(mentorado)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Registra cada fonte do cliente com o nome do seu papel (titulo, texto...)
  const [fontesCarregadas, erroFontes] = useFonts(fontesDoCliente);

  useEffect(() => {
    if (fontesCarregadas || erroFontes) SplashScreen.hideAsync();
  }, [fontesCarregadas, erroFontes]);

  if (!fontesCarregadas && !erroFontes) return null;

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RaizProtegida />
    </AuthProvider>
  );
}
