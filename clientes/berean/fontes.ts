// Fontes deste cliente: cada papel do app aponta para um arquivo de fonte.
// Para usar outra fonte do Google Fonts: npm install @expo-google-fonts/<nome-da-fonte>
// e troque os imports abaixo (os nomes dos papéis não mudam).
import { Cinzel_600SemiBold, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';

export default {
  titulo: Cinzel_700Bold,
  tituloLeve: Cinzel_600SemiBold,
  texto: Montserrat_400Regular,
  textoMedio: Montserrat_500Medium,
  textoForte: Montserrat_600SemiBold,
};
