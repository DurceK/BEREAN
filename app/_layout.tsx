import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';

function RaizProtegida() {
  const { session, perfil, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !!perfil?.precisaTrocarSenha}>
        <Stack.Screen name="trocar-senha" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !perfil?.precisaTrocarSenha && perfil?.papel === 'mentor'}>
        <Stack.Screen name="(mentor)" />
      </Stack.Protected>
      <Stack.Protected
        guard={!!session && !perfil?.precisaTrocarSenha && perfil?.papel === 'mentorado'}
      >
        <Stack.Screen name="(mentorado)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RaizProtegida />
    </AuthProvider>
  );
}
