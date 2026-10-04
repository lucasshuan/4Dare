/* Player: builds the flow into the device, drives the timeline, and fills the
   chapter rail, the notes, the chat mock-ups and the timing chart. */
(function () {
  const { h, icon } = K;
  const $ = (s) => document.querySelector(s);
  const SC = window.SCENES;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = innerWidth < 700;
  // the chat starts folded; the flow opens and folds it itself
  const state = { device: narrow ? "phone" : "desktop", chat: "closed", speed: 1 };
  document.querySelectorAll("[data-device]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.device === state.device)));
  let c = null, cur = -1, starts = [], total = 0, loopCall = null;

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  function paintTheme() {
    for (const b of document.querySelectorAll("[data-theme-btn]")) b.setAttribute("aria-pressed", String((b.dataset.themeBtn === "dark") === isDark()));
  }
  document.querySelectorAll("[data-theme-btn]").forEach((b) => b.addEventListener("click", () => { root.dataset.theme = b.dataset.themeBtn; paintTheme(); }));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintTheme);
  paintTheme();

  /* ---------- toggles ---------- */
  function bindSeg(attr, key, rebuild = true) {
    document.querySelectorAll(`[${attr}]`).forEach((b) => {
      b.addEventListener("click", () => {
        state[key] = b.getAttribute(attr);
        document.querySelectorAll(`[${attr}]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        if (rebuild) build(c ? c.tl.time() : 0, c ? !c.tl.paused() : true);
      });
    });
  }
  bindSeg("data-device", "device");
  document.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => {
    state.speed = Number(b.dataset.speed);
    document.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    c?.tl.timeScale(state.speed);
  }));

  /* ---------- rail, bar ---------- */
  const rail = $("#rail"), bar = $("#bar");
  SC.forEach((s, i) => {
    const b = h("button", { class: "chap", type: "button", "--chap": s.dot, "--chap-ink": s.dotInk || "var(--ink)" },
      h("span", { class: "dot" }, String(i + 1)),
      h("b", null, s.title, s.tag ? h("span", { class: "tag" }, s.tag) : null),
      h("em", null, `${Math.round(s.dur)} s`),
      h("small", null, s.sub));
    b.addEventListener("click", () => jump(i));
    rail.append(b);
    const seg = h("button", { type: "button", "aria-label": `Cena ${i + 1}: ${s.title}`, style: { flex: `${s.dur} 1 0` } }, h("span", { class: "n" }, String(i + 1)), h("span", { class: "track" }, h("span", { class: "fill" })));
    seg.addEventListener("click", (e) => {
      const r = seg.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      c.tl.time(starts[i] + p * s.dur);
      c.sync(c.tl.time());
      ui();
    });
    bar.append(seg);
  });
  const chaps = [...rail.querySelectorAll(".chap")], segs = [...bar.children];

  /* ---------- build ---------- */
  function build(time = 0, play = !reduce) {
    if (loopCall) loopCall.kill();
    if (c) c.tl.kill();
    const frame = $("#frame");
    frame.className = `device-frame${state.device === "phone" ? " phone" : ""}`;
    c = Shell(state);
    frame.replaceChildren(c.stage);
    if (state.device === "desktop") frame.append(h("span", { class: "device-dots" }, h("i"), h("i"), h("i")));
    fit();
    starts = [];
    let t = 0;
    for (const s of SC) {
      starts.push(t);
      const layer = c.scene(t, s.dur);
      s.build(c, t, layer);
      t += s.dur;
    }
    if (c.slipLand) c.slipLand(0, 0);
    c.finishChat();
    total = t;
    c.tl.eventCallback("onUpdate", () => { c.sync(c.tl.time()); ui(); });
    c.tl.eventCallback("onComplete", () => { loopCall = gsap.delayedCall(2.2, () => c.tl.restart()); });
    c.tl.timeScale(state.speed);
    c.tl.time(Math.min(time, total - 0.01));
    c.sync(c.tl.time());
    if (play) c.tl.play(); else c.tl.pause();
    cur = -1;
    ui();
  }

  function fit() {
    if (!c) return;
    const vp = $("#viewport"), dev = $("#device"), frame = $("#frame");
    const pad = state.device === "phone" ? 12 : 10;
    const fw = c.W + pad * 2, fh = c.H + pad * 2;
    const availW = vp.clientWidth - parseFloat(getComputedStyle(vp).paddingLeft) * 2;
    const maxH = Math.max(420, Math.min(state.device === "phone" ? 720 : 760, innerHeight - 170));
    const k = Math.min(1, availW / fw, maxH / fh);
    frame.style.transform = `scale(${k})`;
    dev.style.width = fw * k + "px";
    dev.style.height = fh * k + "px";
  }
  addEventListener("resize", fit);

  /* ---------- transport ---------- */
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function sceneAt(t) {
    let i = 0;
    for (let k = 0; k < starts.length; k++) if (t >= starts[k] - 1e-6) i = k;
    return i;
  }
  function ui() {
    if (!c) return;
    const t = c.tl.time();
    const i = sceneAt(t);
    segs.forEach((seg, k) => {
      const f = k < i ? 1 : k > i ? 0 : (t - starts[k]) / SC[k].dur;
      seg.querySelector(".fill").style.width = Math.min(100, f * 100) + "%";
      seg.classList.toggle("on", k === i);
    });
    $("#clock").textContent = `${fmt(t)} / ${fmt(total)}`;
    const playing = !c.tl.paused();
    const pb = $("#play");
    if (pb.dataset.on !== String(playing)) {
      pb.dataset.on = String(playing);
      pb.innerHTML = playing ? icon.pause : icon.play;
      pb.setAttribute("aria-label", playing ? "Pausar" : "Tocar");
    }
    if (i !== cur) { cur = i; chapter(i); }
  }
  function chapter(i) {
    chaps.forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-current", k === i ? "step" : "false"); });
    const n = SC[i].notes;
    $("#n-kicker").textContent = `Cena ${i + 1} de ${SC.length} · ${n.kicker}`;
    $("#n-title").textContent = n.title;
    $("#n-what").textContent = n.what;
    $("#n-list").replaceChildren(...n.bullets.map(([text, color]) => h("li", { "--li": color }, h("span", null, text))));
    const say = $("#n-say");
    say.replaceChildren(...n.say.map((s) => h("span", null, s)));
    $("#n-saywrap").hidden = !n.say.length;
  }
  function jump(i) {
    if (loopCall) loopCall.kill();
    c.tl.time(starts[i] + 0.001);
    c.sync(c.tl.time());
    ui();
  }
  $("#play").addEventListener("click", () => {
    if (c.tl.time() >= total - 0.05) c.tl.restart();
    else c.tl.paused(!c.tl.paused());
    ui();
  });
  $("#prev").addEventListener("click", () => {
    const t = c.tl.time(), i = sceneAt(t);
    jump(t - starts[i] > 1.2 || i === 0 ? i : i - 1);
  });
  $("#next").addEventListener("click", () => jump(Math.min(SC.length - 1, sceneAt(c.tl.time()) + 1)));
  $("#restart").addEventListener("click", () => { jump(0); c.tl.play(); ui(); });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === " " && e.target === document.body) { e.preventDefault(); $("#play").click(); }
    if (e.key === "ArrowRight" && e.target === document.body) $("#next").click();
    if (e.key === "ArrowLeft" && e.target === document.body) $("#prev").click();
  });

  /* ---------- chat mock-ups: the same shell, frozen at one moment ---------- */
  const MOCKS = [
    { el: "#mock-shut", device: "desktop", chat: "closed", scene: "pick", at: 7.75 },
    { el: "#mock-open", device: "desktop", chat: "open", scene: "vote", at: 6.75 },
    { el: "#mock-hist", device: "desktop", chat: "closed", scene: "order", at: 9.3, history: true },
    { el: "#mock-peek", device: "phone", chat: "closed", scene: "target", at: 2.4 },
    { el: "#mock-sheet", device: "phone", chat: "open", scene: "vote", at: 7.6 },
  ];
  /* a few turns in, seen through Bia's filter */
  const SAMPLE = [
    { n: 1, by: "bia", kind: "q", text: "Eu sou da Marvel?", answers: [["rafa", "no"], ["you", "no"], ["leo", "probably_no"]] },
    { n: 2, by: "rafa", kind: "q", text: "Eu sou verde?", answers: [["you", "yes"], ["leo", "yes"], ["bia", "yes"]] },
    { n: 5, by: "bia", kind: "q", text: "Eu sou uma mulher?", answers: [["rafa", "yes"], ["you", "yes"], ["leo", "yes"]], note: ["leo", "com certeza 😂"] },
    { n: 9, by: "bia", kind: "g", text: "Tempestade", hit: false },
  ];
  const mockShells = [];
  function mocks() {
    mockShells.length = 0;
    for (const m of MOCKS) {
      const box = $(m.el);
      const sc = SC.find((s) => s.id === m.scene);
      const mc = Shell({ device: m.device, chat: m.chat });
      const inner = h("div", { style: { position: "absolute", left: 0, top: 0, transformOrigin: "0 0" } }, mc.stage);
      box.replaceChildren(inner);
      const k = box.clientWidth / mc.W;
      inner.style.transform = `scale(${k})`;
      box.style.height = mc.H * k + "px";
      mc.say(0.02, "bia", "cheguei!! 👋");
      mc.say(0.04, "leo", "bora que hoje eu ganho");
      mc.sys(0.06, "▶ Partida começou");
      mc.wash(0, m.scene === "vote" ? "butter" : "teal", 0.01);
      if (m.scene !== "vote") {
        mc.sys(0.08, "🦸 Tema: <b>Super-heróis</b>");
        mc.head.themeTag.style.visibility = "visible";
      }
      sc.build(mc, 0, mc.scene(0, sc.dur));
      mc.finishChat();
      if (m.history) {
        mc.historyFill(SAMPLE, "bia");
        mc.histCount.textContent = String(SAMPLE.length);
      }
      mc.tl.time(m.at);
      mc.sync(m.at);
      mc.tl.pause();
      mockShells.push({ box, inner, mc });
    }
  }
  addEventListener("resize", () => {
    for (const { box, inner, mc } of mockShells) {
      const k = box.clientWidth / mc.W;
      inner.style.transform = `scale(${k})`;
      box.style.height = mc.H * k + "px";
    }
  });

  /* ---------- timing chart ---------- */
  function chart() {
    const ROWS = [
      ["Hoje", "como está", [["vote", 13], ["theme", 3], ["pick", 120]]],
      ["Proposta", "1ª partida da sala", [["intro", 7], ["line", 1], ["vote", 20], ["theme", 6], ["draw", 4.5], ["target", 2.5], ["pick", 120], ["yours", 4.3], ["order", 4]]],
      ["Proposta", "rodadas seguintes", [["intro", 1.5], ["vote", 20], ["theme", 3], ["draw", 3], ["target", 3], ["pick", 120], ["yours", 3], ["order", 3]]],
    ];
    const KIND = {
      intro: ["Abertura", "color-mix(in oklab, var(--sky) 45%, var(--surface))"],
      line: ["Frase do tema", "var(--butter-soft)"],
      vote: ["Votação", "var(--butter)"],
      theme: ["Tema (+ regra)", "var(--no-soft)"],
      draw: ["Sorteio", "var(--sky-soft)"],
      target: ["Para quem", "color-mix(in oklab, var(--seat-3) 32%, var(--surface))"],
      pick: ["Escolha, até 2 min", "var(--yes-soft)"],
      yours: ["Seu personagem", "color-mix(in oklab, var(--seat-4) 32%, var(--surface))"],
      order: ["Ordem", "var(--apricot-soft)"],
    };
    const num = (n) => n.toLocaleString("pt-BR");
    const max = 180;
    const tl = $("#tl");
    for (const [name, sub, segs] of ROWS) {
      const track = h("div", { class: "tl-track" });
      let x = 0;
      for (const [kind, s] of segs) {
        const [label, color] = KIND[kind];
        track.append(h("span", { class: "tl-seg", title: `${label}: ${num(s)} s`, style: { left: (x / max) * 100 + "%", width: `calc(${(s / max) * 100}% - 3px)`, background: color } }, s >= 10 ? `${label} · ${num(s)} s` : ""));
        x += s;
      }
      const fixed = segs.filter(([k]) => k !== "pick").reduce((a, s) => a + s[1], 0);
      tl.append(h("div", { class: "tl-row" }, h("span", null, name, h("small", null, `${sub} · ${num(fixed)} s além da escolha`)), track));
    }
    const axis = h("div", null);
    for (let s = 0; s <= max; s += 30) axis.append(h("i", { style: { left: (s / max) * 100 + "%" } }, `${s} s`));
    tl.append(h("div", { class: "tl-axis" }, h("span"), axis));
    $("#tl-legend").replaceChildren(...Object.values(KIND).map(([label, color]) => h("span", null, h("i", { style: { background: color } }), label)));
  }

  /* ---------- go ---------- */
  const start = () => {
    build(reduce ? (() => { let t = 0; for (const s of SC) { if (s.id === "pick") return t + 9.5; t += s.dur; } return 0; })() : 0, !reduce);
    mocks();
    chart();
  };
  (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(start));
})();
