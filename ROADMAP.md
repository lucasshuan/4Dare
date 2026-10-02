# Roadmap

Cada fase termina com o jogo jogável; a próxima só melhora. Item marcado = feito e commitado.

## Fase 0 — Base ✅

- [x] Design das telas, design system e fluxo (BPMN)
- [x] Next.js em inglês, português e japonês, tema claro e escuro
- [x] Regras do jogo escritas como tipos
- [x] Padrão de commit

## Fase 1 — Dá pra jogar (no seu PC) ✅

- [x] Motor do jogo com testes: 2 a 4 jogadores, ninguém vê a própria carta
- [x] Servidor local em memória (`pnpm dev`, sem configurar nada)
- [x] Sala pública ou privada; entra por link ou código
- [x] Cada um escolhe o personagem de outro jogador (em roda)
- [x] Pergunta de sim ou não; todos os outros respondem: Sim, Provavelmente sim, Não sei, Provavelmente não, Não, Irrelevante, com comentário opcional
- [x] Palpite: nome parecido vale na hora; senão, só quem escolheu decide
- [x] Passar a vez e desistir
- [x] Tempo por etapa; quem some não trava a partida
- [x] Fim com a colocação de todo mundo
- [x] README curto

## Fase 2 — Online com os amigos

- [ ] Supabase: banco, tempo real, fotos, convidado sem login
- [x] Supabase configurado num comando (`pnpm setup:supabase`): tabelas, convidados, Discord, Google, URLs, chaves
- [x] Servidor na mesma região do banco (São Paulo)
- [ ] Login de verdade com Discord e Google
- [ ] Deploy na Vercel com a integração do Supabase
- [ ] Biblioteca de personagens no Supabase (`pnpm seed`)
- [ ] Partida de 2 e de 4 jogadores testada online

## Fase 3 — Personagens e temas

- [x] Gerador da biblioteca revisado: filtros de conteúdo, nomes em pt-br, memória
- [x] Biblioteca grande em cada idioma, com foto (8 mil por idioma, 91–98% com foto)
- [x] Biblioteca revisada: sem criminosos, ditadores ou conteúdo adulto; nomes do Brasil e do Japão; origens e duplicatas corrigidas
- [x] Biblioteca aceita grupos e espécies: duplas, famílias, equipes, bandas, Pikachu, Chocobo
- [x] Busca com autocomplete e foto
- [x] Busca instantânea: índice do idioma baixado uma vez (cache), cada tecla responde na memória em menos de 1 ms, sem servidor
- [x] Criar personagem com nome e foto própria (com recorte)
- [x] Trocar a foto de qualquer personagem (vira a da biblioteca)
- [x] Tema sorteado pela IA; sem chave, sai de 322 temas simples
- [x] Temas em que o "personagem" é um grupo: duplas, trios, irmãos, famílias, bandas, espécies (Pikmin)
- [x] Temas no banco: liga e desliga sem deploy; os que a IA cria ficam guardados

## Fase 4 — Cara de jogo pronto ✅

- [x] Telas iguais ao design: imagens grandes, cores suaves, claro e escuro, 3 idiomas
- [x] Bandeiras de verdade; idioma e tema só na tela inicial e na sala de espera
- [x] Idioma num seletor (bandeira + nome)
- [x] Cursor de mão em tudo que é clicável
- [x] Código da sala sem botão: no 5º caractere já entra, ou diz por que não dá
- [x] Tela inicial escolhe o jogo: cartões num carrossel, com prévia animada; "Quem sou eu?" é o primeiro
- [x] Logo própria (balão em D com "?" e "are" colorido), ícone quadrado e favicon; logo no topo de toda tela, menos na sala de espera e na partida; home só com os jogos
- [x] Nenhuma tela rola no desktop: tudo cabe de 1024×640 a 1920×1080
- [x] Usuário no canto superior direito, depois do tema: avatar e nome; clicando, um popover diz se é convidado e oferece Discord e Google
- [x] Revelação para todos: as respostas (6 a 10 s, conforme o tamanho) e o palpite (2,5 a 3,5 s)
- [x] Relógio da etapa seguinte parado durante a revelação, recarregando
- [x] Confetti por alguns segundos no acerto
- [x] Transições suaves e dinâmicas em todas as telas, criar sala e erros da sala inclusos
- [x] Ações respondem na hora: a resposta já traz a sala, sem segunda busca; "Estou pronto" muda no clique
- [x] Histórico rolável em gaveta, na web e no celular: "Minhas jogadas" (padrão) ou "Todas"
- [x] Pódio com os vencedores mais altos e cada jogador embaixo da sua carta; "Jogar de novo"
- [x] Celular

## Fase 5 — Contas e salas ✅

- [x] Convidado: nome sorteado (GatoCorajoso, WonderfulCat, すてきなネコ; 27 mil combinações) e bichinho Critters
- [x] Conta Discord ou Google: escolhe nome, foto ou bichinho, e cor (sem Supabase, entra numa conta de teste)
- [x] Salas públicas na tela do jogo: com vaga primeiro, "Ver mais" mostra as cheias e em partida
- [x] Criar sala: pública ou privada, 2 a 4 vagas, segundos por etapa (padrão 120)
- [x] Criar sala em `/who-am-i/new`, com a barra do topo e o "Voltar" acima do título
- [x] Sala de espera: anfitrião edita a configuração e começa; os outros marcam "Estou pronto" (✓ verde, ✗ vermelho)
- [x] Começa sozinha em 2 minutos ou assim que enche
- [x] Partidas salvas por jogador: personagem, quem escolheu, como terminou e quanto tempo levou
- [x] Convidado não perde as partidas ao entrar com Discord ou Google (mesmo numa conta que já existia)

## Fase 6 — Acabamento ✅

- [x] Testes de partida completa no navegador
- [x] PRODUCT.md e ARCHITECTURE.md curtos
