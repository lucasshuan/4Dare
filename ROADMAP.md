# Roadmap

Cada fase termina com o jogo jogável. A próxima só melhora o que já funciona. Vou marcando conforme termino (item marcado = commit feito).

## Fase 0 — Base ✅

- [x] Design de todas as telas, design system e fluxo (BPMN)
- [x] Projeto Next.js: inglês/português/japonês, tema claro/escuro, cores e fontes do design
- [x] Regras do jogo escritas como tipos (sala, turno, revelação, o que cada um pode ver)
- [x] Padrão de commit

## Fase 1 — Dá pra jogar (no seu PC)

Roda com `pnpm dev`, sem configurar nada. Cada aba ou cada amigo na mesma rede é um jogador.

- [x] Motor do jogo com testes (2 a 4 jogadores, ninguém vê a própria carta)
- [ ] Servidor local em memória
- [ ] Criar sala, entrar pelo código ou link, começar
- [ ] Escolher personagem digitando o nome
- [ ] Turno: perguntar, todos respondem, palpite, validação por quem escolheu
- [ ] Revelação simples entre etapas e relógio de cada etapa
- [ ] Fim com a colocação de todo mundo
- [ ] README curto: como rodar

## Fase 2 — Online com os amigos

- [ ] Supabase: banco, tempo real, convidado sem login
- [ ] Deploy na Vercel (você cria o projeto no Supabase e cola as chaves)
- [ ] Partida de 2 e de 4 jogadores testada de ponta a ponta

## Fase 3 — Personagens de verdade

- [ ] Biblioteca de personagens com imagem em en/pt/ja
- [ ] Busca com autocomplete e foto
- [ ] Criar personagem com imagem e trocar imagem
- [ ] 300 temas em en/pt/ja, e tema sorteado pela IA

## Fase 4 — Cara de jogo pronto

- [ ] Todas as telas iguais ao design, claro e escuro, nos 3 idiomas
- [ ] Revelação bem animada, relógio recarregando, confetti no acerto
- [ ] Histórico em gaveta (minhas jogadas / todas)
- [ ] Pódio no fim e "jogar de novo"
- [ ] Transições suaves entre todas as etapas
- [ ] Celular

## Fase 5 — Contas e salas

- [ ] Login com Discord e Google, perfil com nome e avatar
- [ ] Salas públicas na tela inicial
- [ ] Sala de espera com "Estou pronto" e configurações (vagas, segundos por etapa)

## Fase 6 — Acabamento

- [ ] Testes automáticos de partida completa
- [ ] PRODUCT.md e ARCHITECTURE.md (curtos)
