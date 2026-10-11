import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

type Props = {
  id: string;
  url: string;
  ativo: string | null;
  onAtivar: (id: string) => void;
  onTerminar?: (id: string) => void;
};

export function PlayerVideo({ id, url, ativo, onAtivar, onTerminar }: Props) {
  const player = useVideoPlayer(url);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEventListener(player, 'playToEnd', () => onTerminar?.(id));

  useEffect(() => {
    if (isPlaying) onAtivar(id);
  }, [isPlaying, id, onAtivar]);

  useEffect(() => {
    if (ativo !== id && isPlaying) player.pause();
  }, [ativo, id, isPlaying, player]);

  return <VideoView player={player} nativeControls contentFit="contain" style={estilos.video} />;
}

const estilos = StyleSheet.create({
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: '#000' },
});
