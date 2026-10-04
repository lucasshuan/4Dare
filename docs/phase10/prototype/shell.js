/* Shell: the app frame inside the device (backdrop, header, chat) plus the
   timeline helpers the scenes use. State that is not a tween (text, classes,
   visibility, the clock) lives in "tracks": pure functions of the playhead,
   so seeking anywhere, forwards or back, always lands on the right frame. */
(function () {
  const { h, icon, players: PL } = K;
  const SIZES = { desktop: [1280, 800], phone: [390, 844] };
  const WASH = {
    brand: ["var(--brand-stage)", true],
    butter: ["var(--butter)"],
    theme: ["var(--no)"],
    sky: ["var(--seat-1)"],
    apricot: ["var(--seat-2)"],
    teal: ["var(--seat-3)"],
    purple: ["var(--seat-4)"],
  };
  const GLYPH = {
    q: { text: ["?", "?", "?", "?", "?", "?", "?"], cls: "" },
    hero: { text: ["🦸", "⚡", "🛡️", "🦸‍♀️", "💥", "⚡", "🦹"], cls: "emoji" },
  };
  const SPOTS = [[5, 20, 44, 9], [12, 76, 30, 8], [30, 9, 24, 10], [47, 86, 36, 9.5], [66, 13, 28, 8.5], [82, 58, 50, 10.5], [93, 30, 24, 7.5]];

  window.Shell = function build(opts) {
    const phone = opts.device === "phone";
    const [W, H] = SIZES[opts.device];
    const chat = opts.chat; // "open" | "closed"
    
    const stage = h("div", { class: `s-stage${phone ? " is-phone" : ""}`, style: { width: W + "px", height: H + "px" } });


    const tl = gsap.timeline({ paused: true });
    const tracks = [];
    const ctx = { tl, stage, phone, W, H, chat, tracks, P: PL };

    /* ---------- tracks ---------- */
    ctx.track = function (apply, initial) {
      const keys = [];
      const tr = { keys, apply, initial, last: undefined };
      tr.at = (t, v) => (keys.push([t, v]), tr);
      tracks.push(tr);
      return tr;
    };
    ctx.text = (el, initial = el.textContent) => ctx.track((v) => (el.textContent = v), initial);
    ctx.html = (el, initial = el.innerHTML) => ctx.track((v) => (el.innerHTML = v), initial);
    ctx.cls = (el, initial = el.className) => ctx.track((v) => (el.className = v), initial);
    ctx.shown = (el, from, to = Infinity) => {
      ctx.track((v) => (el.hidden = !v), false).at(from, true).at(to, false);
    };
    ctx.live = function (fn) {
      tracks.push({ fn });
    };
    ctx.sync = function (time) {
      for (const tr of tracks) {
        if (tr.fn) { tr.fn(time); continue; }
        let v = tr.initial;
        for (const [t, val] of tr.keys) if (t <= time + 1e-6) v = val;
        if (v !== tr.last) { tr.last = v; tr.apply(v); }
      }
    };
    ctx.type = function (el, t, text, cps = 14, from = "") {
      const tr = ctx.text(el, from);
      for (let i = 0; i <= text.length; i++) tr.at(t + i / cps, text.slice(0, i));
      return t + text.length / cps;
    };

    /* ---------- geometry (logical px) ---------- */
    ctx.rect = function (el) {
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const k = s.width / W;
      return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k, cx: (r.left - s.left + r.width / 2) / k, cy: (r.top - s.top + r.height / 2) / k };
    };

    /* ---------- backdrop ---------- */
    const washes = {};
    for (const [key, [c, solid]] of Object.entries(WASH)) {
      washes[key] = h("div", { class: `s-wash${solid ? " solid" : ""}`, "--c": c });
      stage.append(washes[key]);
    }
    const glyphs = {};
    for (const [key, g] of Object.entries(GLYPH)) {
      const layer = h("div", { class: `s-glyphs ${g.cls}`, style: { opacity: 0 } });
      SPOTS.forEach(([l, t, s, sec], i) =>
        layer.append(h("span", { style: { left: l + "%", top: t + "%", fontSize: (phone ? s * 0.8 : s) + "px", animationDelay: -i * 1.3 + "s" }, "--t": sec + "s" }, g.text[i])),
      );
      glyphs[key] = layer;
      stage.append(layer);
    }
    let washNow = null;
    ctx.wash = function (t, key, dur = 0.9) {
      for (const [k, el] of Object.entries(washes)) {
        if (k === key) tl.to(el, { opacity: 1, duration: dur, ease: "sine.inOut" }, t);
        else if (k === washNow) tl.to(el, { opacity: 0, duration: dur, ease: "sine.inOut" }, t);
      }
      washNow = key;
    };
    ctx.glyph = function (t, key, color = "var(--ink)", dur = 0.8) {
      for (const [k, el] of Object.entries(glyphs)) tl.to(el, { opacity: k === key ? 1 : 0, duration: dur }, t);
      ctx.track((v) => stage.style.setProperty("--gc", v), "var(--ink)").at(t, color);
    };

    /* ---------- main area, header ---------- */
    const main = h("div", { class: "s-main" });
    stage.append(main);
    ctx.main = main;
    if (phone) {
      stage.append(h("div", { class: "s-statusbar" }, h("span", null, "9:41"), h("span", null, "●●● 5G")));
      stage.append(h("div", { class: "s-notch" }));
    }
    const head = h("div", { class: "s-head" });
    main.append(head);
    const themeTag = h("span", { class: "s-tagtheme", style: { visibility: "hidden" } },
      h("span", null, "🦸"), phone ? null : h("small", null, "Tema:"), "Super-heróis");
    head.append(themeTag, h("span", { style: { flex: 1 } }));
    const leave = h("span", { class: "s-ghostbtn", html: icon.out + (phone ? "" : "<span>Sair</span>") });
    if (phone) { leave.style.width = "40px"; leave.style.padding = "0"; leave.style.justifyContent = "center"; }
    const timer = h("span", { class: "s-timer", style: { visibility: "hidden" } }, h("span", null, "0:30"), h("i"));
    // the history: left of the theme, only once the turns start
    const histCount = h("span", { class: "s-hcount" }, "0");
    const histBtn = h("span", { class: "s-histbtn", hidden: true, html: icon.panelLeft + (phone ? "" : "<span>Histórico</span>") });
    histBtn.append(histCount);
    head.prepend(histBtn);
    ctx.histCount = histCount;
    head.append(leave, timer);
    ctx.head = { el: head, themeTag, timer, leave, histBtn };
    leave.querySelector("svg").style.cssText = "width:18px;height:18px";

    /* the step clock: counts down from `secs` starting at t, stops at `until` */
    const clocks = [];
    ctx.clock = function (t, secs, until = Infinity, total = secs) {
      clocks.push({ t, secs, until, total });
    };
    const digits = timer.firstChild, bar = timer.lastChild;
    let shownClock = "";
    ctx.live((time) => {
      let c = null;
      for (const k of clocks) if (time >= k.t && time < k.until) c = k;
      timer.style.visibility = c ? "visible" : "hidden";
      if (!c) return;
      // the prototype runs the clock 12x faster on the long pick, so it moves
      const speed = c.fast || 1;
      const left = Math.max(0, c.secs - (time - c.t) * speed);
      const txt = `${Math.floor(Math.ceil(left) / 60)}:${String(Math.ceil(left) % 60).padStart(2, "0")}`;
      if (txt !== shownClock) { shownClock = txt; digits.textContent = txt; }
      bar.style.transform = `scaleX(${left / c.total})`;
      timer.classList.toggle("low", left <= Math.min(20, c.total / 3));
    });
    ctx.clockFast = (k) => (clocks[clocks.length - 1].fast = k);

    /* ---------- scenes ---------- */
    ctx.scene = function (t0, dur, cls = "") {
      const el = h("div", { class: `s-scene ${cls}` });
      main.append(el);
      ctx.track((v) => (el.style.visibility = v ? "visible" : "hidden"), false).at(t0, true).at(t0 + dur, false);
      return el;
    };

    /* ---------- pointer ---------- */
    const cursor = h("div", { class: phone ? "s-touch" : "s-cursor", html: phone ? "" : icon.pointer });
    const ripple = h("div", { class: "s-ripple" });
    stage.append(ripple, cursor);
    let cur = { x: W * 0.62, y: H * 0.8 };
    ctx.point = function (t, x, y, move = 0.55) {
      if (phone) {
        tl.set(cursor, { x, y }, t);
        tl.fromTo(cursor, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.18 }, t);
      } else {
        tl.fromTo(cursor, { x: cur.x, y: cur.y }, { x, y, duration: move, ease: "power3.inOut", immediateRender: false }, t);
        tl.to(cursor, { opacity: 1, duration: 0.2 }, t);
      }
      cur = { x, y };
      return t + (phone ? 0.2 : move);
    };
    ctx.tap = function (t, el, dx = 0, dy = 0, move) {
      const r = el instanceof Element ? ctx.rect(el) : el;
      const x = r.cx + dx, y = r.cy + dy;
      const at = ctx.point(t, x, y, move);
      tl.fromTo(ripple, { x, y, scale: 0.4, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, at);
      if (phone) tl.to(cursor, { opacity: 0, duration: 0.25 }, at + 0.25);
      else tl.to(cursor, { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 }, at);
      return at;
    };
    ctx.hidePointer = (t) => tl.to(cursor, { opacity: 0, duration: 0.25 }, t);

    /* ---------- confetti ---------- */
    const conf = h("div", { class: "s-confetti" });
    stage.append(conf);
    const COLORS = ["var(--sky)", "var(--apricot)", "var(--butter)", "var(--yes)", "var(--no)", "var(--seat-4)"];
    ctx.confetti = function (t, n = 46) {
      for (let i = 0; i < n; i++) {
        const p = h("i", { style: { left: 50 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 48 + "%", background: COLORS[i % COLORS.length], opacity: 0 } });
        conf.append(p);
        const sx = ((i * 37) % 100) / 100 - 0.5;
        tl.fromTo(p, { y: H * 0.35, x: 0, opacity: 1, rotate: 0 },
          { keyframes: { y: [H * 0.35, H * 0.05 - (i % 7) * 18, H + 40], ease: "none" }, x: sx * W * 0.9, rotate: 540 + i * 20, duration: 2.2 + (i % 5) * 0.25, ease: "power1.out", immediateRender: false }, t);
        tl.set(p, { opacity: 0 }, t + 3.6);
      }
    };

    /* ---------- chat ---------- */
    Chat(ctx);
    History(ctx);

    /* The lobby keeps today's top bar (logo, language, theme, you). When the
       match starts it leaves upwards and the match header takes its place. */
    ctx.lobby = function (tEnd, scroller) {
      const bar = topbar(ctx);
      // a phone page scrolls its header away with it; a desktop one keeps it over the chat bar
      (phone && scroller ? scroller : stage).append(bar);
      tl.fromTo(bar, { yPercent: 0, opacity: 1 }, { yPercent: -100, opacity: 0, duration: 0.45, ease: "power2.in", immediateRender: true }, tEnd);
      ctx.track((v) => (head.style.visibility = v), "hidden").at(tEnd + 0.4, "visible");
      tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, tEnd + 0.4);
      return phone ? 108 : 88;
    };
    return ctx;
  };

  function topbar(ctx) {
    const { phone } = ctx;
    const pad = phone ? "0 16px" : "0 80px";
    const lang = h("span", { class: "s-lang", html: K.flag + (phone ? "" : "<span>Português</span>") + icon.down });
    const theme = h("span", { class: "s-tt" }, ...["sun", "moon", "monitor"].map((k) => h("span", { class: k === "monitor" ? "on" : "", html: icon[k] })));
    const user = h("span", { class: "s-user" }, K.av(PL.you, phone ? 32 : 28), phone ? null : h("span", null, "Caio"), h("span", { class: "chev", html: icon.down }));
    return h("header", { class: "s-topbar", style: { padding: pad } },
      h("span", { class: "s-wordmark", html: K.logo() }),
      h("span", { class: "s-tbr" }, lang, theme, user));
  }

  /* One chat for the lobby and the match, on its own: a tab at the bottom
     right (a bar along the bottom on phones) that grows upwards over the
     screen when its top is clicked and folds back on a second click. A
     message that arrives while it is folded pops a bubble, counts on the tab
     and turns it blue, nudging now and then until someone opens it. */
  function Chat(ctx) {
    const { stage, phone, tl, H } = ctx;
    const SHUT = phone ? 60 : 56;
    const OPEN = Math.round(H * (phone ? 0.66 : 0.62));
    const startOpen = ctx.chat === "open";

    const count = h("span", { class: "s-ccount" }, "0");
    const line = h("span", { class: "s-cline" });
    const faces = h("span", { class: "s-cfaces" });
    const chev = h("span", { class: "s-cchev", html: icon.up });
    const head = h("div", { class: "s-chathead" },
      h("span", { class: "s-cic", html: icon.chat }),
      phone ? line : h("b", null, "Chat"),
      phone ? null : faces,
      h("span", { style: { flex: 1 } }),
      count, chev);
    const msgs = h("div", { class: "s-msgs" });
    const typed = h("span", null, "");
    const placeholder = h("span", { class: "ph" }, "Mandar mensagem…");
    const input = h("div", { class: "s-input" }, h("span", { class: "txt" }, typed, placeholder), h("b", { html: icon.send }));
    const body = h("div", { class: "s-chatbody" }, msgs, h("div", { class: "s-compose" }, input));
    const chat = h("aside", { class: `s-chat${startOpen ? " open" : ""}`, style: { height: (startOpen ? OPEN : SHUT) + "px" } }, head, body);
    const pop = h("div", { class: "s-chatpop" });
    stage.append(pop, chat);
    ctx.chatEl = chat;

    const toggles = [];
    const events = [];
    /* the tab's top, where a click opens or folds it */
    ctx.chatHead = (open) => ({ cx: phone ? ctx.W / 2 : ctx.W - 16 - 170, cy: H - (open ? OPEN : SHUT) + SHUT / 2 });
    ctx.chatToggle = function (t, open) {
      toggles.push([t, open]);
      tl.to(chat, { height: open ? OPEN : SHUT, duration: 0.5, ease: open ? "back.out(1.15)" : "power3.inOut" }, t);
    };
    const isOpen = (t) => {
      let v = startOpen;
      for (const [k, o] of toggles) if (k <= t + 1e-6) v = o;
      return v;
    };

    ctx.say = function (t, who, text, big = false) {
      const p = PL[who];
      const el = p.you
        ? h("div", { class: `s-msg me${big ? " big" : ""}` }, h("p", null, text))
        : h("div", { class: `s-msg${big ? " big" : ""}` }, K.av(p, 28), h("small", null, p.name), h("p", null, text));
      msgs.append(el);
      ctx.shown(el, t);
      tl.from(el, { y: 14, opacity: 0, scale: 0.96, transformOrigin: p.you ? "100% 100%" : "0 100%", duration: 0.35, ease: "back.out(1.6)", immediateRender: false }, t);
      events.push({ t, who, text });
    };
    /* you type it in the box, then it goes */
    ctx.sayTyped = function (t, text) {
      const tr = ctx.text(typed, "");
      for (let i = 0; i <= text.length; i++) tr.at(t + i / 16, text.slice(0, i));
      const end = t + text.length / 16;
      tr.at(end + 0.15, "");
      ctx.track((v) => (placeholder.hidden = !v), true).at(t, false).at(end + 0.15, true);
      ctx.say(end + 0.15, "you", text);
      return end + 0.15;
    };
    ctx.sys = function (t, html) {
      const el = h("div", { class: "s-sys", html });
      msgs.append(el);
      ctx.shown(el, t);
      tl.from(el, { opacity: 0, y: 8, duration: 0.3, immediateRender: false }, t);
    };

    /* after every scene is built: what arrives folded counts as unread */
    ctx.finishChat = function () {
      const all = [...events.map((e) => ({ ...e, kind: "msg" })), ...toggles.map(([t, open]) => ({ t, open, kind: "toggle" }))].sort((a, b) => a.t - b.t);
      const countTr = ctx.text(count, "0");
      const unreadTr = ctx.track((v) => chat.classList.toggle("unread", v), false);
      const openTr = ctx.track((v) => chat.classList.toggle("open", v), startOpen);
      const lineTr = ctx.html(line, "Chat da sala");
      const facesTr = ctx.track((ids) => faces.replaceChildren(...ids.map((id) => K.av(PL[id], 24))), []);
      let unread = 0, senders = [];
      for (const e of all) {
        if (e.kind === "toggle") {
          openTr.at(e.t, e.open);
          if (e.open) { unread = 0; senders = []; countTr.at(e.t, "0"); unreadTr.at(e.t, false); facesTr.at(e.t, []); }
          continue;
        }
        const p = PL[e.who];
        lineTr.at(e.t, `<b>${p.you ? "Você" : p.name}:</b> ${e.text}`);
        if (p.you || isOpen(e.t)) continue;
        unread++;
        senders = [e.who, ...senders.filter((x) => x !== e.who)].slice(0, 3);
        countTr.at(e.t, String(unread));
        unreadTr.at(e.t, true);
        facesTr.at(e.t, senders);
        tl.fromTo(chat, { y: 0 }, { keyframes: { y: [0, -14, 0, -5, 0], ease: "none" }, duration: 0.6, ease: "power1.out", immediateRender: false }, e.t);
        tl.fromTo(count, { scale: 0.3 }, { scale: 1, duration: 0.45, ease: "back.out(3)", immediateRender: false }, e.t);
        if (!phone) {
          const b = h("div", { class: "s-popmsg" }, K.av(p, 30), h("p", null, h("small", null, p.name), e.text));
          pop.append(b);
          // it leaves after 3 s, or at once when the chat is opened
          const opened = toggles.find(([k, o]) => o && k > e.t);
          const gone = Math.min(e.t + 3.05, opened ? opened[0] - 0.1 : Infinity);
          ctx.shown(b, e.t, gone + 0.35);
          tl.fromTo(b, { y: 16, scale: 0.8, opacity: 0, transformOrigin: "85% 100%" }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.8)", immediateRender: false }, e.t);
          tl.to(b, { y: 10, scale: 0.9, opacity: 0, duration: 0.3, ease: "power2.in" }, gone);
        }
      }
    };
  }

  /* The match history: a button left of the theme opens a full-height bar on
     the left. On a computer it pushes the screen aside; on a phone it slides
     over it. It exists only once the turns start. */
  function History(ctx) {
    const { stage, phone, tl, main } = ctx;
    const Wd = phone ? Math.round(ctx.W * 0.88) : 360;
    const close = h("span", { class: "s-iconbtn", html: icon.x });
    const people = h("div", { class: "s-hpeople" });
    const kinds = h("div", { class: "s-hkinds" });
    const caption = h("small", { class: "s-hcap" });
    const list = h("ol", { class: "s-hlist" });
    const panel = h("aside", { class: "s-hist", style: { width: Wd + "px" } },
      h("div", { class: "s-hhead" }, h("b", null, "Histórico"), close),
      h("div", { class: "s-hfilters" }, people, kinds, caption),
      list);
    const scrim = phone ? h("div", { class: "s-scrim", style: { opacity: 0, visibility: "hidden" } }) : null;
    if (scrim) stage.append(scrim);
    stage.append(panel);
    gsap.set(panel, { xPercent: -100 });

    const ANS = { yes: "Sim", probably_yes: "Provavelmente sim", unknown: "Não sei", probably_no: "Provavelmente não", no: "Não", irrelevant: "Irrelevante" };
    ctx.historyFill = function (entries, whose = "you") {
      const mine = (id) => entries.filter((e) => e.by === id).length;
      people.replaceChildren(...["you", ...K.order.filter((i) => i !== "you")].map((id) =>
        h("span", { class: id === whose ? "on" : "" }, K.pname(PL[id], 20), h("em", null, String(mine(id))))));
      const theirs = entries.filter((e) => e.by === whose);
      const q = theirs.filter((e) => e.kind === "q").length;
      kinds.replaceChildren(...[["Tudo", theirs.length], ["Perguntas", q], ["Palpites", theirs.length - q]].map(([k, n], i) =>
        h("span", { class: i === 0 ? "on" : "" }, k, h("em", null, String(n)))));
      caption.textContent = whose === "you"
        ? `Suas perguntas e palpites: ${theirs.length} de ${entries.length} jogadas · a mais recente em cima`
        : `Perguntas e palpites de ${PL[whose].name}: ${theirs.length} de ${entries.length} jogadas · a mais recente em cima`;
      list.replaceChildren(...(theirs.length ? [...theirs].reverse().map((e) =>
        h("li", null,
          h("span", { class: `s-hn${e.by === "you" ? " me" : ""}` }, String(e.n)),
          h("div", null,
            h("small", { class: "s-hwho" }, e.kind === "q" ? "Pergunta · " : "Palpite · ", K.pname(PL[e.by], 18)),
            h("p", null, e.kind === "q" ? e.text : `“${e.text}”`),
            e.kind === "q"
              ? h("div", { class: "s-hans" }, ...e.answers.map(([who, v]) => h("span", null, K.av(PL[who], 20), h("span", { class: `s-chip ${v}` }, h("i"), ANS[v]))))
              : h("span", { class: `s-chip ${e.hit ? "yes" : "unknown"}` }, h("i"), e.hit ? "Acertou" : "Ainda não"),
            e.note ? h("p", { class: "s-hnote" }, K.pname(PL[e.note[0]], 16), `: “${e.note[1]}”`) : null))) :
        [h("li", { class: "s-hempty" }, "Nada por aqui ainda. As perguntas aparecem aqui assim que alguém joga.")]));
    };
    ctx.historyFill([]);
    ctx.histPanel = panel;
    ctx.histClose = close;
    const onTr = ctx.track((v) => ctx.head.histBtn.classList.toggle("on", v), false);
    ctx.historyOpen = function (t, open) {
      tl.to(panel, { xPercent: open ? 0 : -100, duration: open ? 0.55 : 0.4, ease: open ? "power3.out" : "power3.in" }, t);
      if (!phone) tl.to(main, { left: open ? Wd : 0, duration: open ? 0.55 : 0.4, ease: open ? "power3.out" : "power3.in" }, t);
      if (scrim) tl.to(scrim, { autoAlpha: open ? 1 : 0, duration: 0.3 }, t);
      onTr.at(t, open);
    };
  }
})();
