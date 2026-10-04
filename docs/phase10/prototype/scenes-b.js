/* Scenes 5-8: the draw, "you pick for…", picking, and picking a new name
   with the clock running out. */
(function () {
  const { h, icon, players: PL, av, portrait } = K;
  const S = window.SCENES;
  const big = K.bigText;
  const onSeat = (p) => `var(--on-seat-${p.seat})`;

  /* ---------------- 5. the draw ---------------- */
  S.push({
    id: "draw", title: "Sorteio", sub: "quem escolhe pra quem", dur: 5.4, dot: "var(--brand-stage)", dotInk: "#fff",
    build(c, t0, el) {
      const { tl, phone } = c;
      c.wash(t0, "brand", 0.7);
      c.glyph(t0, "q", "var(--brand-butter)");
      el.classList.add("s-center");
      el.style.color = "var(--on-brand)";
      const line = big(c, "Cada um escolhe o personagem de outra pessoa.", [46, 28]);
      line.style.maxWidth = phone ? "330px" : "700px";
      const u = phone ? 170 : 230;
      const urn = h("div", { class: "s-urn", style: { width: u + "px", height: u * 1.01 + "px" }, html: K.mark("#F6E3A1", "#2B69C8") });
      const avs = K.order.map((id) => av(PL[id], phone ? 52 : 68));
      const row = h("div", { style: { display: "flex", gap: phone ? "26px" : "60px" } }, ...avs);
      // written exactly like the next screen's top (same sizes and gaps), so nothing has to change size later
      const slipFace = av(PL.leo, phone ? 120 : 150);
      slipFace.style.cssText += `;outline: 6px solid ${K.seat(PL.leo)}; outline-offset: 6px`;
      const slip = h("div", { class: "s-slip", style: { width: "max-content", padding: phone ? "24px 30px 22px" : "30px 44px 26px", gap: phone ? "12px" : "14px", color: "var(--ink)" } },
        h("span", { style: { fontWeight: 700, fontSize: phone ? "19px" : "24px", color: "var(--ink-muted)" } }, "Você escolhe para"),
        slipFace,
        big(c, "Leo", [96, 64]));
      // comic shake marks beside the bubble, outside it so they don't tilt with it
      const marks = [-1, 1].flatMap((side) => [0, 1].map((k) => h("span", { class: "s-shake", style: {
        [side < 0 ? "left" : "right"]: -(phone ? 22 : 30) - k * (phone ? 12 : 16) + "px",
        top: 26 + k * 6 + "%", height: 34 - k * 10 + "%",
        [side < 0 ? "borderLeftColor" : "borderRightColor"]: "var(--brand-butter)",
      } })));
      const urnBox = h("div", { style: { position: "relative" } }, urn, ...marks);
      const box = h("div", { class: "s-center", style: { gap: phone ? "26px" : "30px", position: "relative" } }, line, urnBox, row);
      el.append(box, slip);
      slip.style.left = "50%"; slip.style.top = "50%";
      // where the slip and its pieces rest once it lands (centred), for the next screen to pick up
      {
        const r = c.rect(slip);
        const piece = (n) => { const k = c.rect(slip.children[n]); return { cx: k.cx - r.w / 2, cy: k.cy - r.h / 2, w: k.w, h: k.h }; };
        c.slipEnd = { card: { x: r.x - r.w / 2, y: r.y - r.h / 2, w: r.w, h: r.h }, pre: piece(0), face: piece(1), name: piece(2) };
        c.slipRest = { cx: r.x, cy: r.y };
      }
      const uR = c.rect(urn), avR = avs.map((a) => c.rect(a)), elR = c.rect(el);
      const q = urn.querySelector(".q");
      // where the slip comes out: the top of the bubble, relative to the middle of the screen
      const mouth = uR.y + uR.h * 0.2 - (elR.y + elR.h / 2);

      tl.fromTo(line, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: true }, t0 + 0.2);
      tl.fromTo(urn, { scale: 0.3, opacity: 0, rotate: -12 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "back.out(1.7)", immediateRender: true }, t0 + 0.3);
      tl.fromTo(avs, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: "back.out(2)", immediateRender: true }, t0 + 0.6);
      // each avatar hops into the bubble
      avs.forEach((a, i) => {
        const dx = uR.cx - avR[i].cx, dy = uR.y + uR.h * 0.32 - avR[i].cy;
        const t = t0 + 1.4 + i * 0.22;
        tl.to(a, { keyframes: { x: [0, dx * 0.5, dx], y: [0, dy - 90, dy], ease: "none" }, scale: 0.35, duration: 0.6, ease: "power1.inOut" }, t);
        tl.to(a, { opacity: 0, duration: 0.12 }, t + 0.5);
        // the bubble swallows: a squash, and the "?" inside hops
        tl.to(urn, { scaleY: 0.92, scaleX: 1.06, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: "50% 100%" }, t + 0.55);
        tl.to(q, { y: -18, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.out" }, t + 0.55);
      });
      // anticipation: it stretches up and takes a breath
      tl.to(urn, { scaleX: 0.9, scaleY: 1.1, duration: 0.22, ease: "power2.out", transformOrigin: "50% 100%" }, t0 + 2.45);
      // the shake: the whole 4 tilts on its tail like a jar, faster then slower,
      // squashing on each swing; the "?" sloshes a beat behind
      tl.to(urn, {
        keyframes: {
          rotate: [0, -11, 10, -9, 8, -6, 5, -3, 0],
          x: [0, -10, 10, -9, 8, -6, 4, -2, 0],
          scaleX: [0.9, 1.06, 0.95, 1.06, 0.96, 1.04, 0.98, 1.02, 1],
          scaleY: [1.1, 0.94, 1.05, 0.94, 1.04, 0.96, 1.02, 0.99, 1],
          ease: "sine.inOut",
        },
        transformOrigin: "50% 92%", duration: 1.15, ease: "none",
      }, t0 + 2.67);
      tl.to(q, { keyframes: { rotate: [0, 16, -15, 13, -11, 9, -6, 3, 0], x: [0, 10, -10, 9, -8, 6, -4, 2, 0], ease: "sine.inOut" }, transformOrigin: "50% 50%", duration: 1.15, ease: "none" }, t0 + 2.75);
      tl.fromTo(marks, { opacity: 0, scale: 0.6 }, { keyframes: { opacity: [0, 1, 0.2, 1, 0.3, 1, 0], scale: [0.6, 1, 0.9, 1.05, 0.9, 1, 0.8] }, duration: 1.1, ease: "none", immediateRender: true }, t0 + 2.7);
      tl.to(line, { opacity: 0, y: -16, duration: 0.3 }, t0 + 3.4);
      // it swells, the "?" grows with it, then it squeezes and spits the slip out of its top
      tl.to(urn, { scale: 1.16, rotate: 0, x: 0, duration: 0.28, ease: "power2.in", transformOrigin: "50% 92%" }, t0 + 3.85);
      tl.to(q, { scale: 1.35, duration: 0.28, ease: "power2.in", transformOrigin: "50% 50%" }, t0 + 3.85);
      tl.to(urn, { scaleX: 1.22, scaleY: 0.82, duration: 0.1, ease: "power3.out" }, t0 + 4.13);
      tl.to(q, { scale: 0, duration: 0.12, ease: "power2.in" }, t0 + 4.13);
      // out of the top, straight to where it will stay: "Para quem" tells it where (dx, dy from the middle)
      c.slipLand = (dx, dy) => {
        c.slipLand = null;
        tl.fromTo(slip, { xPercent: -50, yPercent: -50, x: dx, y: mouth, scale: 0.15, opacity: 0 },
          { y: dy, scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.4)", immediateRender: true }, t0 + 4.13);
      };
      // it rises from behind the bubble, then comes to the front
      box.style.zIndex = 1;
      c.track((v) => (slip.style.zIndex = v), "0").at(t0 + 4.3, "2");
      tl.to(urn, { scaleX: 1, scaleY: 1, scale: 0.8, opacity: 0, duration: 0.45, ease: "power2.in" }, t0 + 4.3);
      tl.to(row, { opacity: 0, scale: 0.85, duration: 0.4 }, t0 + 4.2);
      c.wash(t0 + 5.0, "teal", 0.8);
      c.glyph(t0 + 5.0, "hero", "var(--ink)");
    },
    notes: {
      kicker: "Sorteio",
      title: "Amigo secreto de personagens",
      what: "Os avatares pulam dentro do 4 amarelo do logo. Ele respira fundo e é chacoalhado como um pote, inclinando sobre a ponta, com o “?” balançando lá dentro. Depois incha, aperta e cospe um papel pelo topo, que vira no ar: “Você escolhe para Leo”. A brincadeira de amigo secreto é conhecida, então ninguém precisa de explicação.",
      bullets: [
        ["Não muda a regra: o servidor já embaralha a ordem e cada um escolhe para o próximo do círculo. A animação só mostra isso.", "var(--sky)"],
        ["O papel de cada tela mostra o próprio alvo. Todo mundo vê a mesma animação, ao mesmo tempo.", "var(--yes)"],
        ["Quando o papel abre, o fundo já ganha a cor de Leo: a cor passa a dizer pra quem você está escolhendo.", "var(--seat-3)"],
      ],
      say: ["Cada um escolhe o personagem de outra pessoa.", "Você escolhe para Leo"],
    },
  });

  /* ---------------- 6. for whom ---------------- */
  S.push({
    id: "target", title: "Para quem", sub: "nome, cara e a dica", dur: 4.6, dot: "var(--seat-3)", dotInk: "var(--on-seat-3)",
    build(c, t0, el) {
      const { tl, phone } = c;
      el.classList.add("s-center");
      const leo = PL.leo;
      const pre = h("span", { style: { fontWeight: 700, fontSize: phone ? "19px" : "24px", color: "var(--ink-muted)" } }, "Você escolhe para");
      const face = av(leo, phone ? 120 : 150);
      face.style.cssText += `;outline: 6px solid ${K.seat(leo)}; outline-offset: 6px`;
      const name = big(c, "Leo", [96, 64]);
      const hint = h("p", { class: "s-sub", style: { fontSize: phone ? "18px" : "22px", fontWeight: 600, color: "var(--ink)", maxWidth: phone ? "300px" : "560px" } }, "Escolha um personagem que Leo conheça.");
      // the circle: each one picks for the next, in turn order
      const R = phone ? 62 : 74, A = phone ? 34 : 40, size = R * 2 + A + 24;
      const pos = { bia: [0, -R], rafa: [R, 0], you: [0, R], leo: [-R, 0] };
      const ring = h("div", { class: "s-ring", style: { width: size + "px", height: size + "px" } });
      const cx = size / 2;
      const GAP = 0.44; // radians kept clear around each avatar
      const arc = (id, cls, color, w) => {
        const [x1, y1] = pos[id], [x2, y2] = pos[K.targetOf(id)];
        const a1 = Math.atan2(y1, x1) + GAP, a2 = Math.atan2(y2, x2) - GAP;
        const p = (a) => [cx + R * Math.cos(a), cx + R * Math.sin(a)];
        const [sx, sy] = p(a1), [ex, ey] = p(a2);
        // the head sits at the end, pointing along the circle (clockwise)
        const deg = (a2 * 180) / Math.PI + 90;
        return `<path class="${cls}" d="M${sx} ${sy} A${R} ${R} 0 0 1 ${ex} ${ey}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
          `<g transform="translate(${ex} ${ey}) rotate(${deg})"><path class="${cls}-head" d="M-${w + 3} -${w + 2.5}L${w + 1.5} 0L-${w + 3} ${w + 2.5}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      };
      ring.append(K.frag(`<svg class="arrows" viewBox="0 0 ${size} ${size}">${K.order.map((id) => arc(id, "base", "var(--line-strong)", 2)).join("")}${arc("you", "mine", K.seat(leo), 4.5)}</svg>`));
      const faces = {};
      for (const id of K.order) {
        const [x, y] = pos[id];
        const a = av(PL[id], A);
        Object.assign(a.style, { position: "absolute", left: cx + x - A / 2 + "px", top: cx + y - A / 2 + "px" });
        faces[id] = a;
        ring.append(a);
      }
      const cap = h("span", { style: { fontWeight: 600, fontSize: "14px", color: "var(--ink-muted)" } }, "Todo mundo escolhe para alguém.");
      const ringBox = h("div", { class: "s-center", style: { gap: "4px" } }, ring, cap);
      const box = h("div", { class: "s-center", style: { gap: phone ? "12px" : "14px" } }, pre, face, name, hint);
      const wrap = h("div", { class: "s-center", style: { gap: phone ? "20px" : "26px", paddingBottom: "30px", position: "relative", zIndex: 1 } }, box, ringBox);
      el.append(wrap);
      const bases = [...ring.querySelectorAll("path.base")], heads = [...ring.querySelectorAll("path.base-head")];
      const mine = ring.querySelector("path.mine"), mineHead = ring.querySelector("path.mine-head");
      for (const p of [...bases, mine]) p.style.strokeDasharray = p.getTotalLength();

      let from = c.slipEnd;
      if (from && c.slipLand) {
        // the slip landed with its face on this face; move every piece of it by the same amount
        const fR0 = c.rect(face);
        const dx = fR0.cx - from.face.cx, dy = fR0.cy - from.face.cy;
        c.slipLand(dx, dy);
        const sh = (p) => ({ ...p, cx: p.cx + dx, cy: p.cy + dy });
        from = { card: { ...from.card, x: from.card.x + dx, y: from.card.y + dy }, pre: sh(from.pre), face: sh(from.face), name: sh(from.name) };
      } else from = null;
      if (from) {
        // the slip's paper dissolves; what was written on it grows into place here
        const elR = c.rect(el);
        const paper = h("div", { class: "s-paper", style: { left: from.card.x - elR.x + "px", top: from.card.y - elR.y + "px", width: from.card.w + "px", height: from.card.h + "px" } });
        el.prepend(paper);
        // the words are already where they belong: only the paper goes
        tl.fromTo(paper, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.12, duration: 0.35, ease: "power2.out", immediateRender: true }, t0);
      } else {
        tl.fromTo(pre, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, immediateRender: true }, t0);
        tl.fromTo(face, { scale: 0.2, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.7, ease: "back.out(2)", immediateRender: true }, t0 + 0.1);
        tl.fromTo(name, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out", immediateRender: true }, t0 + 0.45);
      }
      tl.fromTo(hint, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: true }, t0 + 0.65);
      // the circle builds itself quickly: faces pop in turn order, the arrows run round, then yours lights up
      const T = t0 + 1.3;
      tl.fromTo(ringBox, { opacity: 0 }, { opacity: 1, duration: 0.2, immediateRender: true }, T);
      tl.fromTo(K.order.map((id) => faces[id]), { scale: 0 }, { scale: 1, duration: 0.35, stagger: 0.07, ease: "back.out(2.6)", immediateRender: true }, T);
      bases.forEach((p, i) => {
        const at = T + 0.22 + i * 0.13;
        tl.fromTo(p, { strokeDashoffset: p.getTotalLength(), opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 0.16, ease: "none", immediateRender: true }, at);
        tl.fromTo(heads[i], { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.2, ease: "back.out(3)", immediateRender: true }, at + 0.14);
      });
      const lit = T + 0.22 + 4 * 0.13 + 0.15;
      tl.fromTo(mine, { strokeDashoffset: mine.getTotalLength(), opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 0.3, ease: "power2.out", immediateRender: true }, lit);
      tl.fromTo(mineHead, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.25, ease: "back.out(3)", immediateRender: true }, lit + 0.26);
      for (const id of ["you", "leo"]) {
        tl.fromTo(faces[id], { boxShadow: `0 0 0 0px ${K.seat(leo)}` }, { boxShadow: `0 0 0 3px ${K.seat(leo)}`, duration: 0.25, immediateRender: true }, lit + (id === "leo" ? 0.26 : 0));
        tl.to(faces[id], { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" }, lit + (id === "leo" ? 0.26 : 0));
      }
      tl.to(wrap, { opacity: 0, scale: 0.94, duration: 0.4 }, t0 + 4.2);
    },
    notes: {
      kicker: "Para quem",
      title: "Pra quem você escolhe vem antes de qualquer campo",
      what: "O papel do sorteio já sai do 4 reto, no tamanho final e direto pro lugar onde tudo vai ficar. Quando ele chega, só o papel some: o que estava escrito nele já é esta tela. Cara grande, nome enorme, anel na cor da pessoa e uma única dica: escolher alguém que ela conheça. Embaixo, um círculo pequeno mostra que todo mundo escolhe para alguém, com a sua seta destacada.",
      bullets: [
        ["Era o ponto mais confuso no teste. Agora não tem como entrar na escolha sem saber o alvo.", "var(--seat-3)"],
        ["A dica muda o critério: não é “um personagem difícil”, é “um que Leo conheça”. Partidas melhores, menos desistência.", "var(--apricot)"],
        ["O círculo é a mesma ordem dos turnos, e volta no fim do fluxo.", "var(--sky)"],
      ],
      say: ["Você escolhe para Leo", "Escolha um personagem que Leo conheça."],
    },
  });

  /* ---------------- the pick table, shared by 7 and 8 ---------------- */
  function pickTable(c, el, { hand = true } = {}) {
    const { phone } = c;
    const leo = PL.leo;
    const W = phone ? 224 : 270;
    const title = h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: phone ? "21px" : "28px", letterSpacing: "-0.015em" } },
      "Um personagem para", h("span", { class: "s-pname" }, av(leo, phone ? 26 : 32), "Leo"));
    const pic = h("span", { class: "s-portrait", html: portrait("blank") });
    const ghost = h("span", { class: "s-fill", style: { opacity: 0 } });
    const pic2 = h("span", { class: "s-fill", style: { opacity: 0 } });
    const pic3 = h("span", { class: "s-fill", style: { opacity: 0 } });
    pic.append(ghost, pic2, pic3);
    const drop = h("span", { class: "s-dropzone", style: { opacity: 0 }, html: `${icon.image}<span>Solte, cole ou busque uma imagem</span><small>ou fica sem, tudo bem</small>` });
    pic.append(drop);
    const swap = h("span", { class: "s-swap", style: { opacity: 0 }, html: `${icon.image}Trocar imagem` });
    pic.append(swap);
    const typed = h("span", null, "");
    const ph = h("span", { class: "ph" }, "Digite um nome…");
    const caret = h("span", { class: "s-caret", hidden: true });
    const field = h("div", { class: "s-field", style: phone ? { fontSize: "19px", height: "48px" } : {} }, typed, caret, ph);
    const origin = h("span", { class: "s-corigin", style: { margin: "0 4px", minHeight: "18px" } }, "");
    const ddown = h("div", { class: "s-drop", style: { opacity: 0, visibility: "hidden" } });
    const fieldWrap = h("div", { style: { position: "relative" } }, field, ddown);
    const card = h("div", { class: "s-card", style: { width: W + "px", zIndex: 5 } }, pic, fieldWrap, origin);
    const sticker = h("span", { class: "s-sticker", style: { right: "-16px", top: "20px", background: "var(--butter)", color: "var(--on-butter)", transform: "rotate(8deg)", opacity: 0 } }, "Novo!");
    card.append(sticker);
    const confirm = h("span", { class: "s-key yes", style: { height: phone ? "56px" : "64px", padding: phone ? "0 22px" : "0 30px", fontSize: phone ? "19px" : "21px" }, html: `${icon.check}<span>Confirmar</span>` });
    const dice = h("span", { class: "s-btn", html: `${icon.dice}<span>Sortear</span>` });
    const rule = h("small", { style: { color: "var(--ink-muted)", fontWeight: 600, fontSize: "13px", lineHeight: 1.4, maxWidth: "190px", display: "flex", gap: "6px" } }, "⏱", h("span", null, "Acabou o tempo? Vai a carta do jeito que estiver."));
    const actions = h("div", { style: phone ? { display: "flex", gap: "10px", alignItems: "center", justifyContent: "center" } : { display: "flex", flexDirection: "column", gap: "14px", alignItems: "flex-start", width: "210px" } },
      confirm, dice, phone ? null : rule);
    // the hand: the theme's most picked characters, peeking from the bottom
    const handKeys = ["spider", "wonder", "hulk", "panther", "storm"];
    const handCards = handKeys.map((k, i) => {
      const m = K.mini(k, phone ? 70 : 92);
      const likes = h("small", { html: `<span style="color:var(--no);display:inline-flex;width:11px;height:11px">${icon.heart}</span>${K.chars[k].likes}` });
      m.append(likes);
      m.style.transform = `rotate(${(i - 2) * 6}deg) translateY(${Math.abs(i - 2) * 8}px)`;
      m.style.margin = phone ? "0 -9px" : "0 -6px";
      return m;
    });
    const handLabel = h("span", { style: { fontWeight: 700, fontSize: "13px", color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: "6px" }, html: `<span style="color:var(--no);display:inline-flex;width:14px;height:14px">${icon.heart}</span>Os mais escolhidos em Super-heróis` });
    const handRow = h("div", { style: { display: "flex", justifyContent: "center", alignItems: "flex-start" } }, ...handCards);
    const handBox = h("div", { class: "s-center", style: { position: "absolute", left: 0, right: 0, bottom: phone ? "-60px" : "-70px", gap: "8px", visibility: hand ? "inherit" : "hidden" } }, handLabel, handRow);
    const center = h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: phone ? "14px" : "40px", flexDirection: phone ? "column" : "row" } },
      phone ? null : h("div", { style: { width: "210px" } }), card, actions);
    const col = h("div", { class: "s-center", style: { position: "absolute", left: 0, right: 0, top: phone ? "0px" : "4px", gap: phone ? "16px" : "22px" } }, title, center);
    el.append(col, handBox);
    return { title, pic, ghost, pic2, pic3, drop, swap, typed, ph, caret, field, origin, ddown, card, sticker, confirm, dice, actions, handBox, handCards, col, W };
  }
  K.pickTable = pickTable;

  const row = (key, q, sub, hi) => {
    const nm = K.chars[key].name;
    const i = nm.toLowerCase().indexOf(q.toLowerCase());
    const label = i >= 0 ? `${nm.slice(0, i)}<mark>${nm.slice(i, i + q.length)}</mark>${nm.slice(i + q.length)}` : nm;
    return h("div", { class: `s-row${hi ? " hi" : ""}` }, h("span", { class: "s-portrait", html: portrait(key) }), h("span", null, h("b", { html: label }), h("small", null, sub)));
  };

  /* ---------------- 7. picking ---------------- */
  S.push({
    id: "pick", title: "Escolha", sub: "escrever já é escolher", dur: 13.8, dot: "var(--seat-3)", dotInk: "var(--on-seat-3)",
    build(c, t0, el) {
      const { tl, phone } = c;
      const T = pickTable(c, el);
      const r1 = row("spider", "Homem", "Marvel · 42 escolhas", true), r2 = row("iron", "Homem", "Marvel · 37 escolhas", false);
      T.ddown.append(r1, r2);
      const tray = h("div", { class: "s-tray", style: { opacity: 0, visibility: "hidden" } });
      const alts = ["iron", "iron2", "iron3"].map((k, i) => {
        const p = h("span", { class: "s-portrait", html: portrait(k) });
        if (i === 0) p.style.boxShadow = "0 0 0 3px var(--surface), 0 0 0 5px var(--sky)";
        return p;
      });
      tray.append(...alts, h("span", { class: "s-up", html: `${icon.upload}<span>Enviar a sua</span>` }));
      T.card.append(tray);
      tray.style.left = phone ? "6px" : "calc(100% - 40px)";
      tray.style.top = phone ? "140px" : "150px";
      T.pic2.innerHTML = portrait("iron");
      T.pic3.innerHTML = portrait("iron3");
      T.ghost.innerHTML = portrait("spider");
      const done = h("div", { class: "s-center", style: { gap: "10px", opacity: 0, position: "absolute", left: 0, right: 0, bottom: phone ? "78px" : "34px" } });
      const doneAv = K.order.map((id) => {
        const a = av(PL[id], 36);
        const ok = id === "you" || id === "leo";
        const wrap = h("span", { style: { position: "relative", display: "inline-flex", opacity: ok ? 1 : 0.45 } }, a);
        const tick = h("span", { style: { position: "absolute", right: "-4px", bottom: "-4px", width: "18px", height: "18px", borderRadius: "99px", background: "var(--yes)", color: "var(--on-yes)", display: "flex", alignItems: "center", justifyContent: "center", opacity: ok ? 1 : 0 }, html: icon.check.replace("<svg", '<svg style="width:11px;height:11px"') });
        wrap.append(tick);
        return { id, wrap, tick };
      });
      const doneText = h("b", { style: { fontWeight: 700, fontSize: "16px" } }, "Feito! Esperando Bia e Rafa");
      done.append(h("div", { style: { display: "flex", gap: "10px" } }, ...doneAv.map((d) => d.wrap)), doneText);
      el.append(done);
      // measure before any tween moves things
      const fR = c.rect(T.field), r2R = c.rect(r2), picR = c.rect(T.pic), altR = c.rect(alts[2]), cfR = c.rect(T.confirm);

      tl.fromTo(T.title, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, immediateRender: true }, t0);
      tl.fromTo(T.card, { scale: 0.8, rotate: -5, opacity: 0, y: 30 }, { scale: 1, rotate: 0, opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.6)", immediateRender: true }, t0 + 0.1);
      tl.fromTo(T.handCards, { y: 160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: "back.out(1.4)", immediateRender: true }, t0 + 0.6);
      tl.fromTo(T.handBox.firstChild, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: true }, t0 + 0.9);
      tl.fromTo(T.actions, { opacity: 0, x: phone ? 0 : 20 }, { opacity: 1, x: 0, duration: 0.5, immediateRender: true }, t0 + 0.8);
      c.clock(t0 + 0.4, 120, t0 + 13.8);
      c.clockFast(4);
      // typing straight on the card
      const fieldCls = c.cls(T.field).at(t0 + 1.1, T.field.className + " focus");
      c.shown(T.ph, -1, t0 + 1.6);
      const endType = c.type(T.typed, t0 + 1.6, "Homem", 9);
      tl.to(T.ddown, { autoAlpha: 1, duration: 0.2 }, t0 + 1.9);
      tl.from(T.ddown, { y: -8, duration: 0.3, ease: "power3.out", immediateRender: false }, t0 + 1.9);
      tl.to(T.ghost, { opacity: 0.45, duration: 0.3 }, t0 + 2);
      // pick the second match
      c.point(t0 + 2.7, r2R.cx + 20, r2R.cy, 0.6);
      c.cls(r1).at(t0 + 3.2, "s-row");
      c.cls(r2).at(t0 + 3.2, "s-row hi");
      tl.to(T.ghost, { opacity: 0, duration: 0.15 }, t0 + 3.2);
      const pickAt = c.tap(t0 + 3.4, r2R, 20, 0, 0.15);
      tl.to(T.ddown, { autoAlpha: 0, duration: 0.2 }, pickAt + 0.1);
      c.text(T.typed, "").at(pickAt + 0.1, "Homem de Ferro");
      c.text(T.origin).at(pickAt + 0.1, "Marvel · da biblioteca");
      tl.to(T.pic2, { opacity: 1, duration: 0.01 }, pickAt + 0.1);
      tl.fromTo(T.pic, { rotateY: -70 }, { rotateY: 0, duration: 0.6, ease: "back.out(1.5)", immediateRender: false }, pickAt + 0.1);
      c.shown(T.caret, t0 + 1.1, pickAt + 0.1);
      fieldCls.at(pickAt + 0.1, "s-field");
      // change the picture
      c.point(t0 + 4.6, picR.cx + 30, picR.cy + 40, 0.6);
      tl.to(T.swap, { opacity: 1, y: 0, duration: 0.25 }, t0 + 5);
      const swR = { cx: picR.x + picR.w - 70, cy: picR.y + picR.h - 28 };
      const trayAt = c.tap(t0 + 5.4, swR, 0, 0, 0.4);
      tl.to(tray, { autoAlpha: 1, duration: 0.2 }, trayAt + 0.05);
      tl.from(tray, { scale: 0.8, y: 10, transformOrigin: "0 0", duration: 0.35, ease: "back.out(2)", immediateRender: false }, trayAt + 0.05);
      const altAt = c.tap(t0 + 6.5, altR, 0, 0, 0.5);
      c.track((v) => { alts[0].style.boxShadow = v ? "none" : "0 0 0 3px var(--surface), 0 0 0 5px var(--sky)"; alts[2].style.boxShadow = v ? "0 0 0 3px var(--surface), 0 0 0 5px var(--sky)" : "none"; }, false).at(altAt, true);
      tl.to(T.pic3, { opacity: 1, duration: 0.45 }, altAt + 0.05);
      tl.to(tray, { autoAlpha: 0, duration: 0.25 }, altAt + 0.7);
      tl.to(T.swap, { opacity: 0, duration: 0.25 }, altAt + 0.9);
      c.say(t0 + 7, "leo", "pelo amor de deus algo fácil 😅");
      // confirm
      const cfAt = c.tap(t0 + 8, cfR, 0, 0, 0.7);
      tl.to(T.confirm, { y: 6, duration: 0.09, yoyo: true, repeat: 1 }, cfAt);
      c.hidePointer(cfAt + 0.4);
      tl.to(T.handBox, { y: 200, opacity: 0, duration: 0.5, ease: "power2.in" }, cfAt + 0.1);
      tl.to(T.actions, { opacity: 0, duration: 0.3 }, cfAt + 0.1);
      // chosen: the card just grows a little, straight and centred, growing down from its top
      tl.to(T.card, { scale: 1.08, transformOrigin: "50% 0%", duration: 0.5, ease: "back.out(2)" }, cfAt + 0.15);
      tl.to(done, { opacity: 1, duration: 0.4 }, cfAt + 0.5);
      tl.from(done, { y: 16, duration: 0.4, immediateRender: false }, cfAt + 0.5);
      const bia = doneAv.find((d) => d.id === "bia"), rafa = doneAv.find((d) => d.id === "rafa");
      [[bia, t0 + 10.2], [rafa, t0 + 11.6]].forEach(([d, t]) => {
        tl.to(d.wrap, { opacity: 1, duration: 0.2 }, t);
        tl.to(d.tick, { opacity: 1, duration: 0.01 }, t);
        tl.from(d.tick, { scale: 0, duration: 0.4, ease: "back.out(3)", immediateRender: false }, t);
      });
      c.text(doneText).at(t0 + 10.2, "Feito! Esperando Rafa").at(t0 + 11.6, "Todo mundo escolheu!");
      c.say(t0 + 10.6, "rafa", "kkkkk calma tô pensando");
      tl.to(el, { opacity: 0, duration: 0.4 }, t0 + 13.4);
      tl.set(el, { opacity: 1 }, t0 + 13.8);
    },
    notes: {
      kicker: "Escolha · 2 min",
      title: "A carta é o formulário",
      what: "A tela é uma carta só, no centro, com o título dizendo pra quem ela é. Escrever no nome já é escolher: a carta mostra uma prévia enquanto você digita, a lista completa o nome, e a imagem troca ali mesmo, sem sair da carta.",
      bullets: [
        ["Sem modos (“buscar”, “criar”, “trocar imagem”): um campo, uma carta, sempre visível. O botão “Criar personagem novo” some.", "var(--seat-3)"],
        ["Embaixo, a mão de cartas com os mais escolhidos e curtidos do tema (o histórico e as curtidas que já existem). Tocar numa carta joga ela na carta principal.", "var(--no)"],
        ["“Sortear” fica ao lado de “Confirmar”, grande. O relógio daqui anda 4× mais rápido só pra caber na demo: o real continua 2:00.", "var(--sky)"],
        ["Depois de confirmar, a carta fica na mesa e aparecem os avatares de quem já terminou.", "var(--yes)"],
      ],
      say: ["Um personagem para Leo", "Os mais escolhidos em Super-heróis", "Acabou o tempo? Vai a carta do jeito que estiver."],
    },
  });

  /* ---------------- 8. a new name, and time running out ---------------- */
  S.push({
    id: "new", title: "Nome novo", sub: "e o tempo acabando", tag: "variação", dur: 9.6, dot: "var(--seat-3)", dotInk: "var(--on-seat-3)",
    build(c, t0, el) {
      const { tl, phone } = c;
      const T = pickTable(c, el);
      T.pic2.innerHTML = portrait("chapolin");
      const none = h("div", { class: "s-row", style: { color: "var(--ink-muted)", fontWeight: 600, fontSize: "14px", padding: "10px 12px" } }, "Não tem no tema ainda. Vira um personagem novo.");
      T.ddown.append(none);
      const file = h("div", { class: "s-mini", style: { position: "absolute", width: "88px", opacity: 0, zIndex: 40 } }, h("span", { class: "s-portrait", html: portrait("chapolin") }), h("b", null, "chapolin.png"));
      el.append(file);
      const stamp = h("div", { class: "s-sticker", style: { left: "50%", top: "42%", fontSize: phone ? "26px" : "34px", padding: "10px 18px", background: "var(--no)", color: "var(--on-no)", borderRadius: "16px", opacity: 0, zIndex: 30, boxShadow: "var(--shadow-pop)" } }, "Tempo! Foi esse.");
      el.append(stamp);
      const picR = c.rect(T.pic), elR = c.rect(el);
      c.cls(T.field).at(t0, T.field.className + " focus").at(t0 + 2.5, "s-field");
      c.shown(T.caret, t0, t0 + 2.5);

      tl.fromTo(T.col, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: true }, t0);
      tl.fromTo(T.handBox, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: true }, t0);
      c.clock(t0 + 0.3, 8, t0 + 9.6, 120);
      c.shown(T.ph, -1, t0 + 0.6);
      c.type(T.typed, t0 + 0.6, "Chapolin Colorado", 13);
      tl.to(T.ddown, { autoAlpha: 1, duration: 0.2 }, t0 + 1.3);
      tl.to(T.ddown, { autoAlpha: 0, duration: 0.2 }, t0 + 2.4);
      tl.to(T.drop, { opacity: 1, duration: 0.3 }, t0 + 2.2);
      tl.to(T.sticker, { opacity: 1, duration: 0.01 }, t0 + 2.4);
      tl.from(T.sticker, { scale: 2.2, rotate: -20, duration: 0.45, ease: "back.out(2.4)", immediateRender: false }, t0 + 2.4);
      c.text(T.origin).at(t0 + 2.4, "Personagem novo · fica salvo no tema");
      // drag a picture in from outside the card
      const sx = phone ? elR.x + elR.w - 110 : elR.x + elR.w - 170, sy = elR.y + elR.h - 210;
      tl.set(file, { x: sx - elR.x, y: sy - elR.y, rotate: 10 }, t0 + 3.0);
      tl.to(file, { opacity: 1, duration: 0.2 }, t0 + 3.0);
      c.point(t0 + 2.7, sx + 50, sy + 60, 0.4);
      const tx = picR.cx - elR.x - 44, ty = picR.cy - elR.y - 70;
      tl.to(file, { x: tx, y: ty, rotate: -4, duration: 0.9, ease: "power2.inOut" }, t0 + 3.3);
      c.point(t0 + 3.3, picR.cx + 6, picR.cy - 10, 0.9);
      c.cls(T.drop).at(t0 + 3.9, T.drop.className + " hot");
      tl.to(T.drop, { scale: 1.02, duration: 0.2 }, t0 + 3.9);
      tl.to(file, { scale: 0.4, opacity: 0, duration: 0.25 }, t0 + 4.3);
      tl.to(T.drop, { opacity: 0, duration: 0.2 }, t0 + 4.35);
      tl.to(T.pic2, { opacity: 1, duration: 0.01 }, t0 + 4.35);
      tl.fromTo(T.pic, { scale: 1.06 }, { scale: 1, duration: 0.5, ease: "back.out(2)", immediateRender: false }, t0 + 4.35);
      c.point(t0 + 5.0, picR.cx + 160, picR.cy + 120, 1.2);
      c.say(t0 + 5.2, "bia", "10 segundos gente");
      c.hidePointer(t0 + 7.0);
      // clock hits zero: the card goes as it is
      tl.to(stamp, { opacity: 1, duration: 0.01 }, t0 + 8.3);
      tl.fromTo(stamp, { xPercent: -50, yPercent: -50, scale: 2.4, rotate: -16 }, { scale: 1, rotate: -8, duration: 0.45, ease: "back.out(2.6)", immediateRender: true }, t0 + 8.3);
      tl.to(T.card, { scale: 1.08, transformOrigin: "50% 0%", duration: 0.4, ease: "back.out(2)" }, t0 + 8.35);
      tl.to(T.handBox, { y: 200, opacity: 0, duration: 0.4 }, t0 + 8.4);
      tl.to(el, { opacity: 0, duration: 0.35 }, t0 + 9.2);
      tl.set(el, { opacity: 1 }, t0 + 9.6);
    },
    notes: {
      kicker: "Variação · nome que não existe",
      title: "Personagem novo sem botão de criar",
      what: "Digitou um nome que não está no tema? A carta continua a mesma: ganha o selo “Novo!” e o espaço da imagem vira área de soltar, colar ou buscar. Se o relógio zera, vai a carta como está.",
      bullets: [
        ["Regra nova do tempo: o rascunho de cada um (nome, imagem, id da biblioteca) é salvo no servidor enquanto edita. No zero, ele vira a escolha. Sorteio só se a carta estiver vazia.", "var(--no)"],
        ["Personagem sem imagem também vale: a carta usa a silhueta, como hoje.", "var(--line-strong)"],
        ["Trocar imagem de um personagem da biblioteca continua mudando a imagem dele para as próximas partidas.", "var(--sky)"],
      ],
      say: ["Novo!", "Personagem novo · fica salvo no tema", "Tempo! Foi esse."],
    },
  });
})();
