import { useLocalSearchParams } from 'expo-router';
import { TelaAula } from '../../../components/aula/TelaAula';

// A aula exatamente como o aluno vê, sem registrar progresso
export default function PreviaAula() {
  const { aulaId } = useLocalSearchParams<{ aulaId: string }>();
  return <TelaAula aulaId={aulaId} previa rotaDaAula={(id) => `/(mentor)/previa/${id}`} />;
}
