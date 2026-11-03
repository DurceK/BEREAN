// Termo de uso e privacidade que o aluno aceita no primeiro acesso (LGPD).
// RASCUNHO: revisar com um advogado antes de vender para outros clientes.
// Ao mudar o texto de forma importante, troque a VERSAO: todos aceitam de novo.
import { cliente } from './cliente';

export const VERSAO_TERMO = '2026-11-02';

export type SecaoTermo = { titulo: string; texto: string };

export function textoDoTermo(): SecaoTermo[] {
  const app = cliente.nome;
  return [
    {
      titulo: 'Para que serve',
      texto: `O ${app} é o aplicativo de estudo usado pelo seu mentor nas aulas. Para funcionar, ele guarda alguns dados seus. Aqui explicamos quais, para quê e quem vê.`,
    },
    {
      titulo: 'Quais dados guardamos',
      texto:
        '• Nome e matrícula (para você entrar no app).\n• Foto de perfil, se você escolher colocar uma.\n• Seu progresso: aulas abertas e concluídas e até onde ouviu cada áudio.\n• Suas respostas nos exercícios, incluindo os textos que você escrever.',
    },
    {
      titulo: 'Para que usamos',
      texto:
        'Só para o seu aprendizado: mostrar suas aulas, guardar onde você parou e permitir que o seu mentor acompanhe o seu progresso e as suas dúvidas. Não vendemos seus dados, não usamos para propaganda e não compartilhamos com outras empresas.',
    },
    {
      titulo: 'Quem vê',
      texto:
        'Você e o seu mentor. A empresa que desenvolve e mantém o aplicativo tem acesso técnico apenas para manter o sistema funcionando. Os dados ficam guardados em servidores de nuvem contratados para isso, com acesso protegido.',
    },
    {
      titulo: 'Por quanto tempo',
      texto:
        'Enquanto você estiver inscrito. Se quiser sair, peça ao seu mentor e seus dados serão apagados.',
    },
    {
      titulo: 'Seus direitos',
      texto:
        'Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados, ou retirar esta autorização. Basta falar com o seu mentor.',
    },
    {
      titulo: 'Menores de idade',
      texto:
        'Se o aluno for menor de 18 anos, quem autoriza é o pai, a mãe ou o responsável legal, informando o próprio nome abaixo.',
    },
  ];
}
