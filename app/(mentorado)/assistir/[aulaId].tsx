import { useLocalSearchParams } from 'expo-router';
import { TelaAula } from '../../../components/aula/TelaAula';

export default function AulaMentorado() {
  const { aulaId } = useLocalSearchParams<{ aulaId: string }>();
  return <TelaAula aulaId={aulaId} rotaDaAula={(id) => `/(mentorado)/assistir/${id}`} />;
}
