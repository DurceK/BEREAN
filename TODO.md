# TODO — BEREAN

## Pendências

- [ ] **Painel de administração online para o mentor (pelo PC)**
  A Camila acessa pelo navegador do computador para montar e manter o curso. Deve permitir:
  - [x] Criar, renomear e apagar categorias, módulos e aulas direto na tela inicial do mentor, em árvore que abre e fecha (apagar também remove os arquivos do Storage)
  - [x] Pré-visualização da aula como o aluno vê, sem registrar progresso
  - [x] Adicionar, reordenar e remover mídias de uma aula
  - [x] Cadastrar mentorados e inscrevê-los em categorias (Edge Function `admin-usuarios`)
  - [x] Redefinir senha de mentorado
  - [x] Foto de perfil e cabeçalho de perfil nas telas iniciais
  - [x] Ficha do aluno: progresso geral e por categoria, situação e data de cada aula, última atividade
  - [x] Apagar aluno: decidido não ter no app por segurança, por enquanto; continua só pelo painel do Supabase (Authentication → Users)
  - [x] Publicar o painel na internet: EAS Hosting em https://berean.expo.app (a área do mentor do próprio app; publicar de novo: ver `clientes/LEIAME.md`)

- [x] **Esqueci a senha**: o link na tela de login orienta a pedir ao mentor, que redefine pela tela Alunos (senha provisória + troca obrigatória no próximo acesso). O "recuperar por e-mail" não serve porque o login usa e-mail fictício (`matricula@berean.app`).
  - [x] Senha esquecida do próprio mentor: decidido resolver direto no banco (quem administra o Supabase redefine); não terá tela no app

- [x] **Tela da aula para o mentorado**: player de áudio (±10s, velocidade), vídeo, foto, texto lido em voz com destaque da palavra, progresso (em andamento ao abrir, concluída pelo botão)
  - [x] Vídeos por link do YouTube no lugar de envio de vídeo (economiza o Storage)
  - [x] Fotos reduzidas e comprimidas antes de enviar (aula ≤1280 px, perfil 256 px) e limite de 30 MB por áudio, reforçado no bucket (patch 14)
  - [x] Exercícios de múltipla escolha: perguntas com 2 a 6 alternativas e explicação, correção na hora pelo servidor (gabarito escondido do aluno), pode refazer, ficha mostra a 1ª tentativa
  - [x] Novos tipos de pergunta (migration 20261013000000): digitar (copiar/completar/traduzir), ordenar palavras, ligar colunas e resposta livre (o mentor lê na ficha). Correção no servidor ignora maiúsculas, pontuação e espaços; acentos contam
  - [x] Material de Inglês para Viagem (Missões 01 a 15) no curso de Inglês da Camila: script em `clientes/berean/conteudo/` (fora do GitHub)
  - [x] Continuar de onde parou: posição de cada áudio e vídeo do YouTube e o que já foi visto ficam em `progresso_midias` (vale entre aparelhos); "Continuar aula" abre a última aula vista
  - [x] Limpeza do banco: removidas a tabela `transcricoes` e a coluna `progresso.posicao_segundos`, que ficaram sem uso (patch 15)

- [ ] **Nome do software (by DurceK)**: definir quando houver contrato formal (BEREAN é a marca da Camila, a 1ª cliente)
  - Direção: um acrônimo baseado na função do produto
  - Candidato: "ESintelligence" (ES = Espírito Santo + intelligence). INPI livre em 12/10/2026. Ressalvas: "ES" é lido como o estado do Espírito Santo ou a Espanha; "intelligence" sugere IA/BI, que o app não tem; e é palavra fraca para registro ("Sales Intelligence" foi indeferido duas vezes)
  - Candidato: "ATOS" (Agente de Transmissão e Orientação à Sabedoria; liga aos bereanos de Atos 17:11). "ATOS" sozinho está bloqueado no INPI (13/10/2026): Atos Group tem registros em vigor nas classes 09 e 42 (software); EBC e outro titular na 41 (educação); a "Associação Atos Escola Cristã de Liderança" foi indeferida na 41. Ressalva: "Agente" lembra agente de IA
    - Variação "Atos 17": nenhum registro no INPI (13/10/2026), mas ainda contém "ATOS" (risco menor, não zero; consultar especialista antes de registrar)
    - Dá para usar "Atos" como nome interno do projeto, sem registro
  - Descartados: "Parakletos" (já pedido no INPI na classe 41, educação) e "Mentora" (parecido com Mentorh)
  - [ ] Checar o nome escolhido no INPI (classes 9, 41 e 42) e ver se o domínio está livre
  - [x] O "berean" que sobrou por dentro do código não atrapalha: o domínio de login virou configuração por cliente (`dominioLogin`), e cada app tem o próprio armazenamento no celular

- [x] **Versão por cliente (ícone, nome e cores)**: pasta `clientes/<cliente>/` com `cliente.json`, imagens e `.env`; trocar com `npm run cliente -- <pasta>` (passo a passo em `clientes/LEIAME.md`)
  - [x] Fontes por cliente: `clientes/<cliente>/fontes.ts`

- [x] **Banco em migrations do Supabase CLI**: `supabase/migrations/` (a inicial junta os patches 01 a 15); mudança nova = arquivo novo + `npx.cmd supabase db push`
  - [x] Marcar a migration inicial como aplicada no banco da Camila (`migration repair`)
  - [x] Testar a migration inicial num projeto Supabase vazio de teste (12/10/2026: `db push` criou o banco sem erros)

- [x] **Atualizar pacotes do Expo** (SDK 57: expo 57.0.11 → 57.0.27 e demais pacotes)

- [ ] **Revisar alertas de segurança do npm** (`npm audit` aponta 32, sendo 1 crítico). Avaliar quais afetam o app de verdade antes de rodar `npm audit fix`, que pode quebrar dependências.

## Caminho até vender (avaliação de 12/10/2026)

O produto está pronto para piloto; o que falta para vender é operacional: lojas, servidor, parte legal e suporte.

### Bloqueantes: antes do 1º cliente pagante
1. [ ] **App instalável** (13/10/2026: projeto @kaiquedurce/BEREAN no Expo, `eas.json` com perfil `preview` que gera APK e EAS Update ligado; falta testar o APK no celular). Gerar com EAS Build, testar no celular (TestFlight na Apple e teste interno no Google) e passar pela revisão das lojas. Até hoje quase tudo foi testado no navegador.
2. [ ] **Supabase no plano Pro para clientes pagantes**: o free pausa após 7 dias sem uso e não tem backup automático. Decidir se os projetos ficam na organização da DurceK (um plano para todos, mais o custo de cada banco) ou na conta de cada cliente.
3. [ ] **Parte legal**: política de privacidade publicada num endereço na internet (as lojas exigem), adequação à LGPD (nome, foto e desempenho dos alunos) e modelo de contrato (dono dos dados, suporte, cancelamento).
4. [ ] **Área do mentor publicada na internet** (ver "Painel de administração online" acima).
5. [ ] **Conferir a regra da Apple sobre apagar conta pelo app**: talvez não se aplique, porque quem cria as contas é o mentor, mas confirmar antes da revisão.
6. [ ] **Empresa para emitir nota**: abrir CNPJ e confirmar com um contador o enquadramento (o MEI pode não aceitar desenvolvimento de software).

### Importantes: logo depois de começar
7. [ ] **Piloto real**: 3 a 4 semanas da Camila com uma turma de verdade (10 ou mais alunos), anotando os problemas.
8. [ ] **Piloto pago com desconto ("cliente fundador")** para o militar e o Danilo, em troca de retorno de uso e depoimento.
9. [ ] **Monitoramento de erros** (ex: Sentry), para saber quando o app trava no celular de um aluno.
10. [ ] **EAS Update**: corrigir bugs em todos os clientes sem passar pela revisão das lojas.
11. [ ] **Diminuir o suporte manual**: hoje a senha do mentor e apagar aluno dependem de mexer no banco.
12. [ ] **Testes automáticos** das partes críticas (login, progresso, exercícios).
13. [ ] **Precificação** (decidido em 12/10/2026 para a fase de MVP, cliente típico = professor sozinho):
    - Plano baixo custo para os primeiros clientes fundadores (começando pelo Danilo): R$ 100/mês, sem implantação, no Supabase free, por 1 ano ou até precisar do plano Pro do banco (o que vier primeiro)
    - No contrato: preço de fundador válido por 12 meses; limite de alunos ativos (ex: 50); suporte = dúvidas e correção de erros; dados são do cliente; em troca, depoimento e permissão para citá-lo
    - Avaliar começar só com Android + versão web para iPhone (evita a conta Apple de US$ 99/ano para o professor)
    - Supabase free: criar "despertador" diário (evita a pausa de 7 dias) e backup semanal automático; limite de 2 projetos grátis por conta (Camila + Danilo)
    - Faixas para clientes maiores (referência): implantação R$ 1.500–2.500; R$ 297 / 497 / 797 por até 50 / 200 / 500 alunos, já no Supabase Pro
