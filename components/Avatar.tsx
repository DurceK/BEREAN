import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { lerComoBytes } from '../lib/midias';
import { fontes, useEstilos, useTema, type Cores } from '../lib/tema';

const BUCKET = 'avatares';
const TAMANHO = 52;

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

// Círculo com a foto do usuário logado. Tocar abre a galeria para escolher ou trocar a foto.
export function Avatar({
  onErro,
  tamanho = TAMANHO,
}: {
  onErro?: (mensagem: string) => void;
  tamanho?: number;
}) {
  const { usuario, definirAvatar } = useAuth();
  const { cores } = useTema();
  const estilos = useEstilos(criarEstilos);
  const [url, setUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const caminho = usuario?.avatar ?? null;

  useEffect(() => {
    if (!caminho) return;
    let cancelado = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(caminho, 4 * 3600)
      .then(({ data }) => {
        if (!cancelado) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelado = true;
    };
  }, [caminho]);

  async function escolherFoto() {
    if (!usuario) return;
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      onErro?.('Permita o acesso às fotos para escolher sua foto de perfil.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (resultado.canceled) return;

    const foto = resultado.assets[0];
    const tipo = foto.mimeType ?? 'image/jpeg';
    const extensao = tipo.split('/')[1] ?? 'jpg';
    // Nome novo a cada troca, para o celular não mostrar a foto antiga guardada em cache
    const novoCaminho = `${usuario.id}/${Date.now()}.${extensao}`;

    setEnviando(true);
    try {
      const { error: erroEnvio } = await supabase.storage
        .from(BUCKET)
        .upload(novoCaminho, await lerComoBytes(foto.uri), { contentType: tipo });
      if (erroEnvio) throw erroEnvio;

      const { error: erroCadastro } = await supabase
        .from('usuarios')
        .update({ avatar_url: novoCaminho })
        .eq('id', usuario.id);
      if (erroCadastro) throw erroCadastro;

      if (caminho) await supabase.storage.from(BUCKET).remove([caminho]);
      definirAvatar(novoCaminho);
    } catch {
      onErro?.('Não foi possível trocar a foto. Tente uma imagem menor que 5 MB.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pressable
      onPress={escolherFoto}
      disabled={enviando}
      accessibilityLabel={caminho ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
      style={[estilos.circulo, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}
    >
      {caminho && url ? (
        <Image source={{ uri: url }} style={[estilos.foto, { borderRadius: tamanho / 2 }]} />
      ) : (
        <Text style={[estilos.iniciais, { fontSize: tamanho * 0.34 }]}>
          {iniciais(usuario?.nome ?? '')}
        </Text>
      )}
      {enviando && (
        <View style={[estilos.carregando, { borderRadius: tamanho / 2 }]}>
          <ActivityIndicator color={cores.sobrePrimaria} />
        </View>
      )}
      <View style={[estilos.selo, tamanho > 60 && { right: 4, bottom: 4, width: 26, height: 26, borderRadius: 13 }]}>
        <Text style={estilos.seloTexto}>✎</Text>
      </View>
    </Pressable>
  );
}

const criarEstilos = (c: Cores) =>
  StyleSheet.create({
    circulo: {
      width: TAMANHO,
      height: TAMANHO,
      borderRadius: TAMANHO / 2,
      backgroundColor: c.primaria,
      borderWidth: 2,
      borderColor: c.destaque,
      alignItems: 'center',
      justifyContent: 'center',
    },
    foto: { width: '100%', height: '100%', borderRadius: TAMANHO / 2 },
    iniciais: { fontFamily: fontes.titulo, fontSize: 18, color: c.sobrePrimaria },
    carregando: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderRadius: TAMANHO / 2,
      backgroundColor: c.sobreposicao,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selo: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.fundo,
      borderWidth: 1,
      borderColor: c.destaque,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seloTexto: { fontSize: 11, color: c.destaque },
  });
