/* Scenes 9-10: your character arrives, then the turn order, flowing into the game. */
(function () {
  const { h, icon, players: PL, av, portrait } = K;
  const S = window.SCENES;
  const big = K.bigText;
  const SEAT_ORDER = ["you", "bia", "leo", "rafa"];

  /* four cards in a row: yours face down, the others face up with who picked them */
  function tableRow(c, ids) {
    const { phone } = c;
    const w = phone ? 80 : 150;
    const items = {};
    const cols = ids.map((id) => {
      const p = PL[id];
      const face = p.you
        ? h("span", { class: "s-qface", style: { fontSize: phone ? "46px" : "84px", borderRadius: phone ? "10px" : "16px" } }, "?")
        : h("span", { class: "s-portrait", style: { borderRadius: phone ? "10px" : "16px" }, html: portrait(K.cards[id]) });
      const card = h("div", { class: "s-mini", style: { width: w + "px", padding: phone ? "4px 4px 6px" : "8px 8px 10px", borderRadius: phone ? "14px" : "20px", boxShadow: "var(--shadow-pop)" } },
        face, h("b", { style: { fontSize: phone ? "11px" : "15px" } }, p.you ? "Quem é você?" : K.chars[K.cards[id]].name),
        phone ? null : h("small", null, p.you ? `de ${PL[K.pickerOf(id)].name}` : `por ${PL[K.pickerOf(id)].you ? "você" : PL[K.pickerOf(id)].name}`));
      const num = h("span", { style: { position: "absolute", top: phone ? "-14px" : "-18px", left: "50%", marginLeft: phone ? "-14px" : "-18px", width: phone ? "28px" : "36px", height: phone ? "28px" : "36px", borderRadius: "99px", background: "var(--ink)", color: "var(--on-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: phone ? "15px" : "19px", opacity: 0, zIndex: 2 } }, String(K.order.indexOf(id) + 1));
      const label = h("span", { style: { display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: phone ? "12px" : "15px", whiteSpace: "nowrap" } }, av(p, phone ? 20 : 26), p.you ? "você" : p.name);
      const col = h("div", { style: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: phone ? "8px" : "12px" } }, num, card, label);
      items[id] = { col, card, num, label, face };
      return col;
    });
    const row = h("div", { style: { display: "flex", gap: phone ? "8px" : "26px", alignItems: "flex-start" } }, ...cols);
    return { row, items, w };
  }

  /* ---------------- 9. yours arrives ---------------- */
  S.push({
    id: "received", title: "Seu personagem", sub: "chegou, de quem, e o segredo", dur: 6.9, dot: "var(--seat-4)", dotInk: "var(--on-seat-4)",
    build(c, t0, el) {
      const { tl, phone } = c;
      c.wash(t0, "purple", 0.8);
      el.classList.add("s-center");
      const rafa = PL.rafa;
      const t1 = h("h2", { class: "s-big", style: { fontSize: phone ? "28px" : "44px", display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", flexWrap: "wrap" } }, h("span", { class: "s-pname" }, av(rafa, phone ? 34 : 48), "Rafa"), "escolheu o seu.");
      const t2 = big(c, "Você vê o dos outros. O seu, você descobre.", [44, 28]);
      t2.style.maxWidth = phone ? "330px" : "720px";
      const titles = h("div", { style: { display: "grid", placeItems: "center" } }, t1, t2);
      t1.style.gridArea = t2.style.gridArea = "1 / 1";
      const R = tableRow(c, SEAT_ORDER);
      const you = R.items.you;
      you.card.style.position = "relative";
      const wrap = h("div", { class: "s-center", style: { gap: phone ? "40px" : "56px", paddingBottom: "20px" } }, titles, R.row);
      el.append(wrap);
      const cardR = c.rect(you.card), elR = c.rect(el);
      const k = phone ? 1.65 : 1.45;
      const dx = elR.x + elR.w / 2 - cardR.cx, dy = elR.y + elR.h * (phone ? 0.6 : 0.64) - cardR.cy;
      const others = SEAT_ORDER.filter((i) => i !== "you").map((i) => R.items[i]);

      tl.fromTo(t1, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, immediateRender: true }, t0 + 0.1);
      tl.fromTo(t2, { opacity: 0 }, { opacity: 0, duration: 0.01, immediateRender: true }, t0);
      tl.fromTo(you.card, { x: dx, y: dy - 520, scale: k, rotate: -16 }, { y: dy, rotate: -3, duration: 0.8, ease: "bounce.out", immediateRender: true }, t0 + 0.3);
      tl.fromTo([...others.map((o) => o.col), you.label], { opacity: 0 }, { opacity: 0, duration: 0.01, immediateRender: true }, t0);
      tl.to(you.face, { scale: 1.06, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, t0 + 1);
      c.say(t0 + 1.5, "rafa", "boa sorte com esse kkkk");
      // beat 2: the table
      tl.to(t1, { opacity: 0, y: -12, duration: 0.3 }, t0 + 2.3);
      tl.to(t2, { opacity: 1, duration: 0.5 }, t0 + 2.55);
      tl.from(t2, { y: 16, duration: 0.5, ease: "power3.out", immediateRender: false }, t0 + 2.55);
      tl.to(you.card, { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.7, ease: "power3.inOut" }, t0 + 2.4);
      tl.to(you.label, { opacity: 1, duration: 0.3 }, t0 + 2.9);
      others.forEach((o, i) => {
        tl.to(o.col, { opacity: 1, duration: 0.01 }, t0 + 2.9 + i * 0.18);
        tl.fromTo(o.card, { rotateY: 180, y: 30 }, { rotateY: 0, y: 0, duration: 0.6, ease: "back.out(1.6)", immediateRender: false }, t0 + 2.9 + i * 0.18);
      });
    },
    notes: {
      kicker: "Seu personagem",
      title: "O “?” chega com remetente",
      what: "Sua carta cai do alto enquanto o título diz quem escolheu: “Rafa escolheu o seu.” Depois ela encolhe para a mesa e as outras três viram de frente: Mulher-Maravilha, Homem de Ferro, Hulk. É a regra do jogo, mostrada com as cartas da própria partida.",
      bullets: [
        ["A mesma ilustração da abertura (cartas acima de cada um, a sua com “?”), agora com dados reais: fecha o ciclo da explicação.", "var(--seat-4)"],
        ["Cada carta diz quem escolheu (“por você”, “por Leo”), como o card do jogo já faz.", "var(--sky)"],
      ],
      say: ["Rafa escolheu o seu.", "Você vê o dos outros. O seu, você descobre."],
    },
  });

  /* ---------------- 10. turn order, into the game ---------------- */
  S.push({
    id: "order", title: "Ordem e jogo", sub: "a mesa vira a faixa do jogo", dur: 11.0, dot: "var(--seat-2)", dotInk: "var(--on-seat-2)",
    build(c, t0, el) {
      const { tl, phone } = c;
      el.classList.add("s-center");
      const R = tableRow(c, K.order);
      const kick = h("span", { class: "s-kicker" }, "Ordem dos turnos");
      const call = h("h2", { class: "s-big", style: { fontSize: phone ? "40px" : "64px", display: "flex", alignItems: "center", gap: "14px", justifyContent: "center" } }, h("span", { class: "s-pname" }, av(PL.bia, phone ? 44 : 64), "Bia"), "começa!");
      const heads = h("div", { style: { display: "grid", placeItems: "center" } }, kick, call);
      kick.style.gridArea = call.style.gridArea = "1 / 1";
      const tableBox = h("div", { class: "s-center", style: { gap: phone ? "40px" : "52px", paddingBottom: "20px" } }, heads, R.row);
      el.append(tableBox);
      // where each card starts: its slot in the previous scene (seat order)
      const slots = K.order.map((id) => c.rect(R.items[id].col));
      const slotOf = (id) => slots[SEAT_ORDER.indexOf(id)];

      // the game screen it lands on
      const game = gameScreen(c);
      el.append(game.root);

      tl.fromTo(kick, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, immediateRender: true }, t0 + 0.1);
      tl.fromTo(call, { opacity: 0 }, { opacity: 0, duration: 0.01, immediateRender: true }, t0);
      K.order.forEach((id, i) => {
        const it = R.items[id];
        const from = slotOf(id), to = slots[i];
        const dx = from.x - to.x;
        tl.fromTo(it.col, { x: dx, y: 0 }, { keyframes: { y: [0, i % 2 ? 46 : -46, 0], ease: "none" }, x: 0, duration: 0.9, ease: "power2.inOut", immediateRender: true }, t0 + 0.5 + i * 0.05);
        tl.to(it.num, { opacity: 1, duration: 0.01 }, t0 + 1.6 + i * 0.16);
        tl.from(it.num, { scale: 0, rotate: -40, duration: 0.45, ease: "back.out(3)", immediateRender: false }, t0 + 1.6 + i * 0.16);
      });
      // spotlight on the first
      const bia = R.items.bia;
      tl.to(kick, { opacity: 0, duration: 0.25 }, t0 + 2.4);
      tl.to(call, { opacity: 1, duration: 0.01 }, t0 + 2.55);
      tl.from(call, { scale: 1.7, duration: 0.5, ease: "back.out(2)", immediateRender: false }, t0 + 2.55);
      tl.to(bia.col, { scale: 1.1, duration: 0.45, ease: "back.out(2.4)" }, t0 + 2.5);
      tl.to(bia.card, { boxShadow: "0 0 0 4px rgba(207,112,36,0.9), 0 24px 56px rgba(30,36,51,0.2)", duration: 0.3 }, t0 + 2.5);
      tl.to(K.order.filter((i) => i !== "bia").map((i) => R.items[i].col), { opacity: 0.55, duration: 0.4 }, t0 + 2.5);
      c.wash(t0 + 2.5, "apricot", 1.0);
      c.glyph(t0 + 2.5, "q", "var(--seat-2)");
      c.sys(t0 + 2.8, "Ordem: Bia, Rafa, você, Leo");
      // the table becomes the strip
      tl.to(tableBox, { scale: 0.32, y: phone ? -300 : -330, opacity: 0, duration: 0.7, ease: "power3.in" }, t0 + 4.4);
      tl.to(game.root, { autoAlpha: 1, duration: 0.01 }, t0 + 4.9);
      tl.fromTo(game.strip.children, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.6)", immediateRender: true }, t0 + 4.9);
      tl.fromTo(game.body, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", immediateRender: true }, t0 + 5.3);
      c.clock(t0 + 5.4, 80, Infinity);
      // the history exists from here on: a button left of the theme
      const hb = c.head.histBtn;
      c.track((v) => (hb.hidden = !v), false).at(t0 + 5.2, true);
      tl.fromTo(hb, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.4)", immediateRender: false }, t0 + 5.2);
      const hbR = { cx: phone ? 36 : 32 + 66, cy: phone ? 26 + 32 : 38 };
      const openAt = c.tap(t0 + 7.6, hbR, 0, 0, 0.7);
      c.historyOpen(openAt, true);
      const closeR = { cx: phone ? Math.round(c.W * 0.88) - 36 : 360 - 36, cy: phone ? 40 + 38 : 38 };
      const closeAt = c.tap(t0 + 9.6, closeR, 0, 0, 0.6);
      c.historyOpen(closeAt, false);
      c.hidePointer(closeAt + 0.4);
      c.sys(t0 + 5.6, "Rodada 1 · vez de Bia");
      c.say(t0 + 6.6, "leo", "vai bia 👀");
    },
    notes: {
      kicker: "Ordem e jogo",
      title: "A mesa embaralha, numera e vira a faixa de jogadores",
      what: "As quatro cartas trocam de lugar até a ordem dos turnos, ganham números e a primeira recebe o holofote: “Bia começa!”, com o fundo na cor da Bia. Então a mesa encolhe para o topo e vira a faixa de jogadores da tela de jogo, que fica como está.",
      bullets: [
        ["A ordem é a mesma do sorteio (o círculo): quem escolhe para você joga logo antes de você.", "var(--seat-2)"],
        ["A transição liga o fluxo novo à tela de jogo atual sem corte: a faixa já está no lugar quando a pergunta começa.", "var(--sky)"],
        ["O histórico nasce aqui: um botão à esquerda do tema abre uma barra de altura total à esquerda, que empurra a tela. Na sala e antes dos turnos ele não existe.", "var(--yes)"],
      ],
      say: ["Ordem dos turnos", "Bia começa!"],
    },
  });

  /* the turn screen as it is today, simplified: strip, your card, Bia thinking */
  function gameScreen(c) {
    const { phone } = c;
    const strip = h("div", { class: "s-strip", style: phone ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } : {} },
      ...K.order.map((id) => {
        const p = PL[id];
        const turn = id === "bia";
        const th = p.you
          ? h("span", { class: "s-qface th", style: { fontSize: "20px", borderRadius: "8px" } }, "?")
          : h("span", { class: "s-portrait th", style: { borderRadius: "8px" }, html: portrait(K.cards[id]) });
        return h("div", { style: { boxShadow: turn ? `0 0 0 2px ${K.seat(p)}` : "none", padding: phone ? "6px" : "8px" } },
          av(p, phone ? 24 : 32),
          h("span", { style: { minWidth: 0 } }, h("b", { style: phone ? { fontSize: "12.5px" } : {} }, K.label(p)), h("small", null, turn ? "Perguntando" : "Esperando")),
          phone ? null : th);
      }));
    const yours = h("div", { class: "s-card", style: { width: phone ? "100%" : "250px", flex: "none", flexDirection: phone ? "row" : "column", alignItems: phone ? "center" : "stretch", padding: phone ? "8px" : "12px 12px 16px", borderRadius: phone ? "18px" : "28px", boxShadow: "var(--shadow-card)" } },
      phone ? null : h("span", { style: { alignSelf: "flex-start", background: "var(--sky-soft)", borderRadius: "99px", padding: "1px 12px", fontWeight: 600, fontSize: "13px" } }, "Seu personagem"),
      h("span", { class: "s-qface", style: { fontSize: phone ? "40px" : "120px", width: phone ? "70px" : "100%", flex: "none", borderRadius: phone ? "10px" : "18px" } }, "?"),
      h("span", { style: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 } }, h("b", { class: "s-cname", style: { fontSize: phone ? "20px" : "26px" } }, "Quem é você?"), h("small", { class: "s-corigin", style: { margin: "0 6px" } }, "Escolhido por Rafa")));
    const waiting = h("div", { style: { display: "flex", flexDirection: "column", gap: "18px", flex: 1, minWidth: 0 } },
      h("span", { style: { fontWeight: 500, fontSize: "13px", color: "var(--ink-muted)" } }, "Pergunta 1"),
      h("h1", { class: "s-h1", style: { fontSize: phone ? "26px" : "32px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } }, h("span", { class: "s-pname" }, av(PL.bia, phone ? 28 : 34), "Bia"), "está pensando na pergunta"),
      h("div", { style: { display: "flex", alignItems: "center", gap: "12px" } }, av(PL.bia, 44), h("span", { class: "s-typing" }, h("i"), h("i"), h("i"))),
      h("p", { style: { margin: 0, color: "var(--ink-muted)", fontSize: "15px" } }, "Enquanto isso, olhe as cartas dos outros na faixa de cima."));
    const body = h("div", { style: { display: "flex", gap: phone ? "18px" : "40px", flexDirection: phone ? "column" : "row", alignItems: "flex-start" } }, yours, waiting);
    const root = h("div", { class: "s-abs", style: { left: phone ? "16px" : "32px", right: phone ? "16px" : "32px", top: phone ? "0px" : "4px", display: "flex", flexDirection: "column", gap: phone ? "16px" : "24px", visibility: "hidden", opacity: 0, textAlign: "left" } }, strip, body);
    return { root, strip, body };
  }
})();
