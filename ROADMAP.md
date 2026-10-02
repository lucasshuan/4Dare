# Roadmap

O que já tem e o que falta pro Dare ficar jogável. Vou marcando conforme termino (cada item marcado = commit feito).

## Feito

- [x] Design de todas as telas, design system e fluxo (BPMN)
- [x] Projeto Next.js criado: inglês/português/japonês, tema claro/escuro, cores e fontes do design
- [x] Regras do jogo escritas como tipos (sala, turno, revelação entre etapas, o que cada jogador pode ver)
- [x] Padrão de commit definido

## 1. Regras do jogo

- [ ] Motor: sala, escolha de personagem, turnos, respostas, palpite, validação, revelação, fim
- [ ] Testes do motor (partidas de 2 e 4 jogadores, ninguém vê a própria carta)

## 2. Servidor

- [ ] Modo local: roda sem configurar nada (tudo em memória)
- [ ] Ações: criar sala, entrar, pronto, começar, escolher, perguntar, responder, palpitar, validar, desistir, jogar de novo
- [ ] Biblioteca de personagens: busca, criar personagem, trocar imagem
- [ ] Tema sorteado pela IA, com banco de temas de reserva
- [ ] Supabase: banco, login com Discord/Google, tempo real, imagens

## 3. Conteúdo

- [ ] 300 temas em en/pt/ja
- [ ] Biblioteca de personagens com imagem em en/pt/ja

## 4. Componentes

- [ ] Básicos: botão, campo, avatar, carta, idioma, tema claro/escuro, código da sala
- [ ] Relógio com animação de recarga e confetti
- [ ] Gaveta de histórico (minhas jogadas / todas), revelação animada, pódio

## 5. Telas

- [ ] Início, perfil, criar sala
- [ ] Sala de espera (anfitrião e convidado, "Estou pronto")
- [ ] Escolha do personagem (busca, criar, trocar imagem)
- [ ] Turno: perguntar, responder, adivinhar, validar, esperando
- [ ] Revelação entre etapas (respostas e palpites, confetti no acerto)
- [ ] Fim da partida com pódio e "jogar de novo"
- [ ] Celular

## 6. Conferir

- [ ] Partida completa com 2 e com 4 jogadores no navegador
- [ ] Telas comparadas com o design, claro e escuro, nos 3 idiomas

## 7. Entregar

- [ ] PRODUCT.md, ARCHITECTURE.md e README.md (curtos)
- [ ] Pronto pra Vercel (você só cria o projeto no Supabase e cola as chaves)
