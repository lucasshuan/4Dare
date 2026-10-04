/* Scenes 1-4: lobby, the cold open, the theme vote and the theme reveal. */
window.SCENES = [];
(function () {
  const { h, icon, players: PL, av, pname, portrait } = K;
  const S = window.SCENES;
  const big = (c, text, size) => h("h2", { class: "s-big", style: { fontSize: (c.phone ? size[1] : size[0]) + "px" } }, text);
  const mini = (key, w, extra = {}) => {
    const el = h("div", { class: "s-mini", style: { width: w + "px", ...extra } }, h("span", { class: "s-portrait", html: portrait(key) }), h("b", null, K.chars[key].name));
    return el;
  };
  K.mini = mini;
  K.bigText = big;

  /* ---------------- 1. lobby ---------------- */
  S.push({
    id: "lobby", title: "Sala", sub: "a de hoje, com o chat no canto", dur: 8.6, dot: "var(--surface)",
    build(c, t0, el) {
      const { tl, phone } = c;
      el.classList.add("full");
      const tEnd = t0 + 7.0;
      const sm = (svg, w = 16) => svg.replace("<svg", `<svg width="${w}" height="${w}"`);

      // the room, as lobby-screen.tsx draws it (host's view, first round)
      const status = {}, marks = {};
      const rows = ["you", "bia", "leo", "rafa"].map((id) => {
        const p = PL[id];
        const ready = id !== "rafa";
        status[id] = h("small", { html: p.you ? `${sm(icon.crown, 14)}Anfitrião` : ready ? "Confirmou" : "Ainda não confirmou" });
        marks[id] = p.you ? null : h("span", { class: "l-mark", style: { background: ready ? "var(--yes-soft)" : "var(--no-soft)", color: ready ? "var(--yes)" : "var(--no)" }, html: ready ? icon.check : icon.x });
        return h("div", { class: "l-player" }, av(p, 44), h("span", null, h("b", null, K.label(p)), status[id]), marks[id]);
      });
      const section = h("section", { class: "l-section" },
        h("div", { class: "l-top" },
          h("span", { class: "l-back", html: `${icon.back}Sair da sala` }),
          h("h1", { class: "s-h1 l-title" }, "Sala do Caio"),
          h("div", { class: "l-intro" },
            h("div", { class: "l-introtext" },
              h("p", { class: "l-greet" }, "Sala criada. Agora convide alguém."),
              h("p", { class: "l-sub" }, "Mande o link ou dite o código. Você começa a partida quando quiser, com 2 jogadores ou mais.")),
            phone ? null : h("span", { class: "l-qr", html: K.qr() }))),
        h("div", { class: "l-coderow" },
          h("div", { class: "l-code" }, ..."K7Q2M".split("").map((ch) => h("span", null, ch))),
          h("span", { class: "s-btn l-copy", html: `${icon.link}<span>Copiar link</span>` })),
        h("div", { class: "l-playersbox" }, h("b", { class: "l-players" }, "Jogadores · 4/4"), h("div", { class: "l-grid" }, ...rows)));
      const start = h("span", { class: "s-key yes l-start" }, "Começar partida");
      const chips = h("span", { class: "l-chips" }, ...[["Perguntar", "1:20"], ["Responder", "1:20"], ["Palpitar", "1:00"], ["Conferir", "0:40"]].map(([k, v]) => h("span", null, k, h("em", null, v))));
      const aside = h("aside", { class: "l-aside" },
        h("div", { class: "l-gamerow" }, h("span", { class: "l-thumb", html: K.gameThumb() }), h("b", { class: "l-gamename" }, "Quem sou eu?"), start),
        h("ul", { class: "l-list" },
          h("li", { html: `${icon.globe}<span>Pública: qualquer um entra</span>` }),
          h("li", { html: `${icon.users}<span>Até 4 jogadores</span>` }),
          h("li", null, K.frag(icon.clock), chips),
          h("li", { html: `${icon.vote}<span>Todos votam · todos os conjuntos</span>` })),
        h("span", { class: "l-edit" }, "Editar configuração"));
      const wrap = h("div", { class: "l-wrap" }, section, aside);
      const scroll = h("div", { class: "l-scroll" }, wrap);
      el.append(scroll);
      c.lobby(tEnd, scroll);

      // a phone scrolls down to the button, like the real page
      const startR = c.rect(start);
      const room = c.H - (phone ? 74 : 0) - 90;
      const dy = Math.max(0, startR.cy - room);
      const tapR = { cx: startR.cx, cy: startR.cy - dy };

      tl.from(rows, { y: 12, opacity: 0, stagger: 0.06, duration: 0.4, ease: "power3.out", immediateRender: false }, t0);
      // folded: the messages knock on the tab
      c.say(t0 + 0.4, "bia", "cheguei!! 👋");
      c.say(t0 + 1.4, "leo", "bora que hoje eu ganho");
      // a click on its top opens it, a second click folds it
      const openAt = c.tap(t0 + 2.3, c.chatHead(false), phone ? 0 : -40, 0, 0.6);
      c.chatToggle(openAt, true);
      c.say(t0 + 3.4, "rafa", "😂", true);
      const mk = marks.rafa;
      c.html(mk).at(t0 + 3.7, icon.check);
      c.text(status.rafa).at(t0 + 3.7, "Confirmou");
      c.track((v) => { mk.style.background = v ? "var(--yes-soft)" : "var(--no-soft)"; mk.style.color = v ? "var(--yes)" : "var(--no)"; }, false).at(t0 + 3.7, true);
      tl.fromTo(mk, { scale: 0.5 }, { scale: 1, duration: 0.4, ease: "back.out(3)", immediateRender: false }, t0 + 3.7);
      c.sayTyped(t0 + 3.9, "começando!");
      const shutAt = c.tap(t0 + 4.8, c.chatHead(true), phone ? 0 : -40, 0, 0.5);
      c.chatToggle(shutAt, false);
      if (dy) tl.to(scroll, { y: -dy, duration: 0.7, ease: "power3.inOut" }, t0 + 5.2);
      const at = c.tap(t0 + 5.7, tapR, 0, 0, 0.6);
      tl.to(start, { y: 6, duration: 0.09, yoyo: true, repeat: 1 }, at);
      c.sys(t0 + 6.6, "▶ Partida começou");
      c.hidePointer(t0 + 6.6);
      tl.to(scroll, { opacity: 0, scale: 0.97, duration: 0.45, ease: "power2.in" }, tEnd);
      c.wash(tEnd + 0.1, "brand", 0.7);
      c.glyph(tEnd + 0.2, "q", "var(--brand-butter)");
    },
    notes: {
      kicker: "Sala",
      title: "A sala fica como está; o chat é uma aba no canto",
      what: "A sala é a de hoje, sem tirar nem pôr. O chat fica recolhido numa aba no canto inferior direito. Mensagem nova faz a aba pular, ficar azul e mostrar um balão com o texto. Um clique no topo abre o chat de baixo pra cima, e outro clique recolhe.",
      bullets: [
        ["Aberto, o chat passa por cima da tela, sem empurrar nada. A sala e as telas da partida continuam grandes e no centro.", "var(--sky)"],
        ["Só conversa e linhas do sistema (“Partida começou”, “Tema: …”). Sem lista de quem está na sala e sem atalhos de emoji.", "var(--yes)"],
        ["No celular é uma barra embaixo com a última mensagem, e ela sobe do mesmo jeito.", "var(--apricot)"],
      ],
      say: [],
    },
  });

  /* ---------------- 2. cold open ---------------- */
  S.push({
    id: "intro", title: "Abertura", sub: "o jogo em duas frases", dur: 7.6, dot: "var(--brand-stage)", dotInk: "#fff",
    build(c, t0, el) {
      const { tl, phone } = c;
      el.classList.add("s-center");
      el.style.color = "var(--on-brand)";
      el.style.padding = phone ? "0 22px 40px" : "0 60px 40px";
      const l1 = big(c, "Cada um ganha um personagem secreto.", [58, 34]);
      const l2 = big(c, "Só você não vê o seu. Descubra perguntando.", [58, 34]);
      l2.style.position = "absolute";
      const lines = h("div", { style: { position: "relative", display: "grid", maxWidth: phone ? "340px" : "760px" } }, l1, l2);
      l1.style.gridArea = l2.style.gridArea = "1 / 1";
      l2.style.position = "static";
      const cw = phone ? 62 : 104, aw = phone ? 46 : 64;
      const ids = ["bia", "you", "leo", "rafa"];
      const cards = {};
      const people = ids.map((id) => {
        const p = PL[id];
        const face = p.you
          ? h("span", { class: "s-qface", style: { fontSize: phone ? "44px" : "72px", background: "var(--brand-butter)", color: "#2B69C8" } }, "?")
          : h("span", { class: "s-portrait", html: portrait(K.cards[id]) });
        const card = h("div", { class: "s-mini", style: { width: cw + "px", padding: phone ? "4px" : "6px", borderRadius: phone ? "12px" : "18px", transformOrigin: "50% 100%" } }, face);
        cards[id] = card;
        return h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: phone ? "6px" : "10px" } },
          card,
          h("span", { style: { width: "3px", height: phone ? "10px" : "16px", background: "rgba(255,255,255,0.5)", borderRadius: "3px", marginTop: "-6px" } }),
          av(p, aw, ""),
          h("span", { style: { fontWeight: 700, fontSize: phone ? "13px" : "16px" } }, p.you ? "você" : p.name));
      });
      const row = h("div", { style: { display: "flex", justifyContent: "center", gap: phone ? "30px" : "72px", alignItems: "flex-end", marginTop: phone ? "78px" : "104px" } }, ...people);
      // a speech bubble with its tail pointing down at your card
      const bubble = h("div", { style: { position: "absolute", whiteSpace: "nowrap", background: "#fff", color: "#1e2433", borderRadius: "20px", padding: phone ? "8px 12px" : "12px 18px", fontWeight: 700, fontSize: phone ? "15px" : "20px", boxShadow: "0 12px 30px rgba(0,0,0,.25)" } },
        "Eu sou da Marvel?",
        h("span", { style: { position: "absolute", left: "50%", bottom: phone ? "-6px" : "-8px", width: phone ? "14px" : "18px", height: phone ? "14px" : "18px", marginLeft: phone ? "-7px" : "-9px", background: "#fff", borderRadius: "3px", transform: "rotate(45deg)" } }));
      const yes = h("span", { class: "s-answer", style: { position: "absolute", fontSize: phone ? "13px" : "16px", height: phone ? "32px" : "40px" } }, "Sim");
      const yes2 = h("span", { class: "s-answer", style: { position: "absolute", fontSize: phone ? "13px" : "16px", height: phone ? "32px" : "40px", background: "#e7fbf8", color: "#0b7a75" } }, phone ? "Sim" : "Provavelmente sim");
      yes2.style.whiteSpace = "nowrap";
      const box = h("div", { class: "s-center", style: { position: "relative" } }, lines, row, bubble, yes, yes2);
      el.append(box);
      // measure
      const you = c.rect(cards.you), leoC = c.rect(cards.leo), b = c.rect(box);
      const rafaC = c.rect(cards.rafa);
      // over your card, clear of it even once it has grown (it scales up from its bottom)
      bubble.style.left = you.cx - b.x - bubble.offsetWidth / 2 + "px";
      bubble.style.top = you.y - b.y - you.h * 0.12 - bubble.offsetHeight - (phone ? 12 : 16) + "px";
      for (const [chip, at] of [[yes, leoC], [yes2, rafaC]]) {
        chip.style.left = at.cx - b.x - chip.offsetWidth / 2 + "px";
        chip.style.top = at.y - b.y - chip.offsetHeight - (phone ? 8 : 12) + "px";
      }

      tl.fromTo(l1, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", immediateRender: true }, t0 + 0.15);
      tl.fromTo(people, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.09, ease: "back.out(1.5)", immediateRender: true }, t0 + 0.55);
      tl.fromTo(Object.values(cards), { rotateY: 90, scale: 0.6 }, { rotateY: 0, scale: 1, duration: 0.55, stagger: 0.12, ease: "back.out(1.8)", immediateRender: true }, t0 + 1.0);
      tl.to(cards.you, { rotate: -7, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" }, t0 + 2.0);
      // beat 2
      tl.to(l1, { y: -24, opacity: 0, duration: 0.35, ease: "power2.in" }, t0 + 3.4);
      tl.fromTo(l2, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out", immediateRender: true }, t0 + 3.65);
      tl.to([cards.bia, cards.leo, cards.rafa], { opacity: 0.55, scale: 0.92, duration: 0.4 }, t0 + 3.7);
      tl.to(cards.you, { scale: 1.12, duration: 0.45, ease: "back.out(2)" }, t0 + 3.7);
      tl.fromTo(bubble, { opacity: 0, scale: 0.4, transformOrigin: "0% 100%" }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)", immediateRender: true }, t0 + 4.4);
      tl.fromTo([yes, yes2], { opacity: 0, scale: 0.4, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.25, ease: "back.out(2.4)", immediateRender: true }, t0 + 5.2);
      tl.to(box, { y: -40, opacity: 0, duration: 0.45, ease: "power2.in" }, t0 + 7.1);
    },
    notes: {
      kicker: "Abertura · 1ª partida da sala",
      title: "Duas frases, uma ilustração, nenhum texto pra ler",
      what: "Antes da votação, o palco azul apresenta o jogo como um título de programa: cada um com sua carta acima da cabeça, a sua com “?”. Depois, a sua carta cresce e alguém pergunta “Eu sou da Marvel?”, com respostas chegando.",
      bullets: [
        ["Uma frase por vez, grande, no centro. A ilustração usa os jogadores reais da sala, então ninguém precisa imaginar.", "var(--sky)"],
        ["Roda completa (≈7 s) só na primeira partida da sala. Nas seguintes vira um cartão curto de 1,5 s: “Rodada 2”.", "var(--yes)"],
        ["É sincronizada pelo relógio do servidor, igual às revelações: todo mundo vê junto, como num programa de TV.", "var(--apricot)"],
      ],
      say: ["Cada um ganha um personagem secreto.", "Só você não vê o seu. Descubra perguntando."],
    },
  });

  /* ---------------- 3. theme vote ---------------- */
  const OPTS = [
    { emoji: "🦸", set: "Heróis e vilões", name: "Super-heróis" },
    { emoji: "🧸", set: "Desenhos e brinquedos", name: "Desenhos dos anos 90" },
    { emoji: "🎬", set: "Filmes e séries", name: "Vilões da Disney" },
  ];
  K.OPTS = OPTS;
  S.push({
    id: "vote", title: "Votação do tema", sub: "a frase sobe, os temas entram", dur: 8.5, dot: "var(--butter)", dotInk: "var(--on-butter)",
    build(c, t0, el) {
      const { tl, phone } = c;
      c.wash(t0, "butter", 0.8);
      c.glyph(t0, "q", "var(--on-butter)");
      tl.to(c.head.leave, { opacity: 1, duration: 0.3 }, t0);
      const title = big(c, "Agora, escolham juntos um tema.", [58, 34]);
      const sub = h("p", { class: "s-sub", style: { fontSize: phone ? "15px" : "17px", marginTop: "8px" } }, "O mais votado vence. Empate vai pra roleta.");
      title.style.transformOrigin = "50% 0";
      title.style.maxWidth = phone ? "340px" : "720px";
      const top = h("div", { class: "s-center", style: { position: "absolute", left: 0, right: 0, top: phone ? "8px" : "64px", padding: "0 20px" } }, title, sub);
      const shareEls = [], voterBoxes = [], counts = [];
      const cards = OPTS.map((o, i) => {
        const voters = h("span", { class: "s-voters" });
        const count = h("span", null, "Nenhum voto");
        const share = h("span", { class: "s-share", style: { background: ["var(--on-butter)", "var(--sky)", "var(--apricot)"][i] } });
        voterBoxes.push(voters); counts.push(count); shareEls.push(share);
        const card = h("div", { class: `s-opt s-tone-${i}`, style: phone ? { minHeight: "118px", padding: "16px", borderRadius: "26px", flex: "none" } : { minHeight: "250px" } },
          h("span", { class: "s-optlab" }, h("span", { style: { fontSize: "16px" } }, o.emoji), o.set),
          h("span", { class: "s-optname", style: phone ? { fontSize: "27px", margin: "6px 0" } : {} }, o.name),
          h("span", { class: "s-votes" }, voters, count), share);
        return card;
      });
      const row = h("div", { style: { position: "absolute", left: phone ? "16px" : "40px", right: phone ? "16px" : "40px", top: phone ? "132px" : "236px", display: "flex", flexDirection: phone ? "column" : "row", gap: phone ? "10px" : "16px" } }, ...cards);
      const dots = h("span", { class: "s-dots" }, ...[0, 1, 2, 3].map(() => h("i")));
      const prog = h("span", { style: { fontWeight: 600, fontSize: "14px" } }, "0 de 4 votaram");
      const wait = h("span", { style: { fontWeight: 500, fontSize: "13px", color: "var(--ink-muted)" } }, "Ainda votando: todo mundo");
      const foot = h("div", { class: "s-center", style: { position: "absolute", left: 0, right: 0, bottom: phone ? "14px" : "40px", gap: "4px" } }, h("span", { style: { display: "flex", gap: "10px", alignItems: "center" } }, dots, prog), wait);
      el.append(top, row, foot);
      const k = phone ? 0.84 : 0.7;
      const tR = c.rect(title), sR = c.rect(sub), elR = c.rect(el);
      const shrink = tR.h * (1 - k);
      row.style.top = (tR.y - elR.y) + tR.h * k + sR.h + (phone ? 22 : 36) + "px";
      const cardR = cards.map((x) => c.rect(x));

      // beat: the line arrives centred, then rises to become the heading
      const centerY = (elR.y + elR.h / 2) - (tR.y + tR.h / 2);
      tl.fromTo(title, { y: centerY + 30, opacity: 0, scale: 1 }, { y: centerY, opacity: 1, duration: 0.6, ease: "power3.out", immediateRender: true }, t0 + 0.2);
      tl.to(title, { y: 0, scale: k, duration: 0.7, ease: "power3.inOut" }, t0 + 1);
      tl.fromTo(sub, { opacity: 0, y: -shrink + 8 }, { opacity: 1, y: -shrink, duration: 0.4, immediateRender: true }, t0 + 1.5);
      tl.fromTo(cards, { y: 90, opacity: 0, rotate: (i) => [-7, 0, 7][i] }, { y: 0, opacity: 1, rotate: 0, duration: 0.7, stagger: 0.09, ease: "back.out(1.3)", immediateRender: true }, t0 + 1.3);
      tl.fromTo(foot, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: true }, t0 + 1.9);
      c.clock(t0 + 1.7, 20, t0 + 8);
      tl.fromTo(c.head.timer, { scale: 0.6 }, { scale: 1, duration: 0.4, ease: "back.out(2.5)", immediateRender: false }, t0 + 1.7);

      const votes = [[2.5, "bia", 0], [3.4, "you", 0], [4.3, "rafa", 1], [5.2, "leo", 0]];
      const tally = [0, 0, 0];
      const left = new Set(K.order);
      votes.forEach(([dt, who, opt], n) => {
        const t = t0 + dt;
        if (who === "you") {
          const at = c.tap(t - 0.6, cardR[opt], phone ? 60 : 40, 10, 0.6);
          c.cls(cards[opt]).at(at, cards[opt].className + " mine");
          tl.to(cards[opt], { y: -6, duration: 0.3, ease: "back.out(2)" }, at);
          c.hidePointer(at + 0.6);
        }
        const a = av(PL[who], 32);
        voterBoxes[opt].append(a);
        c.shown(a, t);
        tl.from(a, { scale: 0.3, y: 10, opacity: 0, duration: 0.45, ease: "back.out(2.2)", immediateRender: false }, t);
        tally[opt]++;
        const k = tally[opt];
        c.text(counts[opt], "Nenhum voto").at(t, k === 1 ? "1 voto" : `${k} votos`);
        tl.to(shareEls[opt], { scaleX: k / 4, duration: 0.5, ease: "back.out(1.4)" }, t);
        tl.to(dots.children[n], { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, t);
        c.text(prog, "0 de 4 votaram").at(t, `${n + 1} de 4 votaram`);
        left.delete(who);
        c.text(wait).at(t, left.size ? `Ainda votando: ${[...left].map((i) => PL[i].name).join(", ")}` : "Todo mundo votou!");
      });
      c.say(t0 + 2.1, "rafa", "desenhos pfv 🙏");
      c.say(t0 + 5.7, "leo", "heróis!!!");
      c.say(t0 + 6.4, "bia", "rafa perdeu kkkk");
      tl.to([row.children[1], row.children[2]], { opacity: 0.35, scale: 0.95, filter: "saturate(0.4)", duration: 0.4 }, t0 + 6.5);
      tl.to(cards[0], { scale: 1.04, duration: 0.4 }, t0 + 6.5);
      tl.to([top, foot], { opacity: 0, duration: 0.3 }, t0 + 8);
      tl.to(row.children[1], { opacity: 0, y: 30, duration: 0.35 }, t0 + 8);
      tl.to(row.children[2], { opacity: 0, y: 30, duration: 0.35 }, t0 + 8.05);
      el._winner = cards[0];
    },
    notes: {
      kicker: "Votação do tema",
      title: "A frase entra sozinha, sobe e vira título da votação",
      what: "Primeiro só aparece “Agora, escolham juntos um tema.” no centro. Ela sobe, encolhe e vira o cabeçalho; as três cartas são distribuídas como uma mão, e só então o relógio aparece e começa a contar.",
      bullets: [
        ["A votação passa de 13 para 20 segundos: no teste ela acabou rápido demais. Muda VOTE_SECONDS em src/game/types.ts.", "var(--no)"],
        ["A votação atual fica igual (cartas, votos com avatar, barra de proporção, roleta no empate). O que muda é a entrada.", "var(--butter)"],
        ["O relógio só nasce quando as cartas estão na mesa: ninguém perde tempo lendo enquanto o tempo corre.", "var(--sky)"],
        ["Fundo manteiga: cada etapa tem a sua cor, e a mudança de cor por si só avisa que a etapa mudou.", "var(--apricot)"],
      ],
      say: ["Agora, escolham juntos um tema.", "O mais votado vence. Empate vai pra roleta."],
    },
  });

  /* ---------------- 4. theme reveal + the rule ---------------- */
  S.push({
    id: "theme", title: "Tema escolhido", sub: "e a regra, mostrada", dur: 7.4, dot: "var(--no)", dotInk: "var(--on-no)",
    build(c, t0, el) {
      const { tl, phone } = c;
      el.classList.add("s-center");
      const kick = h("span", { class: "s-kicker" }, "O tema é…");
      const card = h("div", { class: "s-opt s-tone-0", style: { flex: "none", width: phone ? "330px" : "620px", minHeight: phone ? "190px" : "290px", padding: phone ? "20px" : "30px", borderRadius: "36px", boxShadow: "var(--shadow-pop)" } },
        h("span", { class: "s-optlab" }, h("span", { style: { fontSize: "18px" } }, "🦸"), "Tema escolhido"),
        h("span", { class: "s-optname", style: { fontSize: phone ? "50px" : "84px", justifyContent: "center" } }, "Super-heróis"),
        h("span", { class: "s-votes" }, h("span", { class: "s-voters" }, av(PL.bia, 30), av(PL.you, 30), av(PL.leo, 30)), h("span", null, "3 votos")));
      const rule = big(c, "Todo personagem tem que ser deste tema.", [34, 23]);
      rule.style.maxWidth = phone ? "320px" : "620px";
      const frame = h("div", { style: { position: "relative", width: phone ? "330px" : "520px", height: phone ? "150px" : "196px", borderRadius: "28px", border: "3px dashed color-mix(in oklab, var(--no) 70%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", gap: phone ? "10px" : "18px" } });
      const mw = phone ? 84 : 112;
      const ok1 = K.mini("spider", mw), ok2 = K.mini("storm", mw), bad = K.mini("shrek", mw);
      const badge = (good) => h("span", { style: { position: "absolute", top: "-10px", right: "-10px", width: "30px", height: "30px", borderRadius: "99px", background: good ? "var(--yes)" : "var(--no)", color: good ? "var(--on-yes)" : "var(--on-no)", display: "flex", alignItems: "center", justifyContent: "center" }, html: (good ? icon.check : icon.x).replace("<svg", '<svg style="width:17px;height:17px"') });
      [ok1, ok2, bad].forEach((m, i) => { m.style.position = "relative"; m.append(badge(i < 2)); });
      frame.append(ok1, ok2, bad);
      const ruleBox = h("div", { class: "s-center", style: { position: "absolute", inset: 0, gap: phone ? "18px" : "26px", paddingBottom: "40px" } }, rule, frame);
      const hero = h("div", { class: "s-center", style: { gap: "18px", paddingBottom: "40px" } }, kick, card);
      el.append(hero, ruleBox);

      tl.fromTo(kick, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, immediateRender: true }, t0);
      tl.fromTo(card, { scale: 0.55, y: phone ? -40 : 0, x: phone ? 0 : -260, opacity: 0.6 }, { scale: 1, x: 0, y: 0, opacity: 1, duration: 0.9, ease: "back.out(1.2)", immediateRender: true }, t0 + 0.05);
      c.confetti(t0 + 0.9);
      c.wash(t0 + 0.9, "theme", 1.1);
      c.glyph(t0 + 0.9, "hero", "var(--ink)");
      c.sys(t0 + 1.0, "🦸 Tema: <b>Super-heróis</b>");
      c.track((v) => (c.head.themeTag.style.visibility = v ? "visible" : "hidden"), false).at(t0 + 2.3, true);
      tl.fromTo(c.head.themeTag, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.2)", immediateRender: false }, t0 + 2.3);
      tl.to(hero, { scale: 0.6, y: phone ? -260 : -290, opacity: 0, duration: 0.55, ease: "power3.in" }, t0 + 2.2);
      tl.fromTo(rule, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: true }, t0 + 2.6);
      tl.fromTo(frame, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, immediateRender: true }, t0 + 2.9);
      tl.fromTo(ok1, { y: 240, rotate: -14, opacity: 0 }, { y: 0, rotate: -3, opacity: 1, duration: 0.6, ease: "back.out(1.6)", immediateRender: true }, t0 + 3.3);
      tl.fromTo(ok2, { y: 240, rotate: 12, opacity: 0 }, { y: 0, rotate: 2, opacity: 1, duration: 0.6, ease: "back.out(1.6)", immediateRender: true }, t0 + 3.75);
      tl.fromTo(bad, { y: 240, rotate: 10, opacity: 0 }, { y: 0, rotate: 4, opacity: 1, duration: 0.55, ease: "back.out(1.4)", immediateRender: true }, t0 + 4.3);
      tl.fromTo([ok1.lastChild, ok2.lastChild, bad.lastChild], { scale: 0 }, { scale: 1, duration: 0.35, stagger: 0.45, ease: "back.out(3)", immediateRender: true }, t0 + 4.0);
      tl.to(bad, { x: phone ? 40 : 90, y: 300, rotate: 50, opacity: 0, duration: 0.8, ease: "power2.in" }, t0 + 5.4);
      tl.to(ruleBox, { opacity: 0, y: -20, duration: 0.4 }, t0 + 7.0);
    },
    notes: {
      kicker: "Tema escolhido",
      title: "A regra do tema aparece como cena, não como frase de rodapé",
      what: "O tema vencedor cresce no centro com confete e o palco ganha a cor do tema. Logo depois, uma frase curta e três cartas: duas entram no quadro com ✓, Shrek bate, ganha ✗ e cai fora.",
      bullets: [
        ["O tema vai para o cabeçalho (como hoje) e fica lá até o fim: é a referência fixa da partida.", "var(--no)"],
        ["Cor e símbolos do fundo vêm do conjunto do tema (🦸 heróis, 🍥 anime, 🎮 games…). Cada tema pinta as próximas telas.", "var(--apricot)"],
        ["Os exemplos ✓ saem dos personagens mais escolhidos do tema; o ✗ sai de um tema bem diferente. Tema digitado pelo anfitrião: só a frase.", "var(--yes)"],
      ],
      say: ["O tema é…", "Todo personagem tem que ser deste tema."],
    },
  });
})();
