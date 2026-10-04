/* Kit: DOM helpers, icons, the four players, critter avatars, character
   portraits and the 4Dare logo. Everything is drawn here, nothing is fetched. */
(function () {
  const K = (window.K = {});

  K.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs)
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k === "html") el.innerHTML = v;
        else if (k.startsWith("--")) el.style.setProperty(k, v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };
  K.frag = function (markup) {
    const t = document.createElement("template");
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
  };

  /* lucide-style strokes */
  const I = (d, w = 2) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  K.icon = {
    play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/></svg>`,
    prev: I('<path d="m15 18-6-6 6-6"/>'),
    next: I('<path d="m9 18 6-6-6-6"/>'),
    restart: I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    monitor: I('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    phone: I('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>'),
    sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: I('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>'),
    chat: I('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>'),
    panel: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>'),
    send: I('<path d="M12 19V5M5 12l7-7 7 7"/>', 2.5),
    check: I('<path d="M20 6 9 17l-5-5"/>', 2.75),
    dice: I('<rect x="2" y="10" width="12" height="12" rx="2"/><path d="m17.9 10.1 3.2-3.2a2 2 0 0 0 0-2.8L19.9 2.9a2 2 0 0 0-2.8 0l-3.2 3.2"/><path d="M6 18h.01M10 14h.01M15 6h.01M18 9h.01"/>', 1.9),
    image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>', 1.9),
    upload: I('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', 1.9),
    heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>`,
    crown: I('<path d="M2 18h20M3 7l5 5 4-7 4 7 5-5-2 11H5z"/>', 1.9),
    history: I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>', 1.9),
    out: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', 1.9),
    x: I('<path d="M18 6 6 18M6 6l12 12"/>', 2.5),
    up: I('<path d="m18 15-6-6-6 6"/>', 2.25),
    link: I('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>', 1.9),
    panelLeft: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>', 1.9),
    panelClose: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/><path d="m8 9 3 3-3 3"/>', 1.9),
    globe: I('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>', 1.75),
    users: I('<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>', 1.75),
    clock: I('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 1.75),
    vote: I('<path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/>', 1.75),
    down: I('<path d="m6 9 6 6 6-6"/>', 2),
    back: I('<path d="m15 18-6-6 6-6"/>', 2),
    pointer: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 3.5v19.2l5.3-5 3.4 7.6 3.6-1.6-3.4-7.4h7.3z" fill="#fff" stroke="#1e2433" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  };

  /* the table: seat colour = person, all flow long */
  K.players = {
    you: { id: "you", name: "Caio", you: true, seat: 1, bg: "#cfe1fb", body: "#fdba74", v: 0 },
    bia: { id: "bia", name: "Bia", seat: 2, bg: "#fde2c8", body: "#a5b4fc", v: 1 },
    leo: { id: "leo", name: "Leo", seat: 3, bg: "#cdeee9", body: "#f0abfc", v: 2 },
    rafa: { id: "rafa", name: "Rafa", seat: 4, bg: "#e7dafa", body: "#fcd34d", v: 3 },
  };
  K.seat = (p) => `var(--seat-${p.seat})`;
  /* the shuffled order is a circle: each one picks for the next, and it is also the turn order */
  K.order = ["bia", "rafa", "you", "leo"];
  K.targetOf = (id) => K.order[(K.order.indexOf(id) + 1) % K.order.length];
  K.pickerOf = (id) => K.order[(K.order.indexOf(id) + K.order.length - 1) % K.order.length];
  K.label = (p) => (p.you ? `${p.name} (você)` : p.name);

  /* critter, after DiceBear "Critters": a blob with big eyes on a pastel */
  K.critter = function (p) {
    const b = p.body;
    const eye = (x, y, r = 5.4) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + 0.8}" cy="${y + 0.6}" r="${r * 0.48}" fill="#1e2433"/><circle cx="${x + 1.9}" cy="${y - 1}" r="1.1" fill="#fff"/>`;
    const extra = [
      `<circle cx="17" cy="27" r="7" fill="${b}"/><circle cx="47" cy="27" r="7" fill="${b}"/><circle cx="17" cy="27" r="3.2" fill="#fda4af" opacity=".7"/><circle cx="47" cy="27" r="3.2" fill="#fda4af" opacity=".7"/>`,
      `<path d="M32 27 L30 13" stroke="${b}" stroke-width="3" stroke-linecap="round"/><circle cx="29.6" cy="11.5" r="4" fill="${b}"/>`,
      `<path d="M18 31 L14 15 L26 27z" fill="${b}"/><path d="M46 31 L50 15 L38 27z" fill="${b}"/>`,
      `<path d="M26 26c2-8 10-10 12-4 2-5 8-3 6 3" fill="${b}"/>`,
    ][p.v];
    const eyes = p.v === 3 ? eye(32, 40, 7.4) : eye(25, 40) + eye(39, 40);
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${p.bg}"/>${extra}<path d="M12 64c0-20 8-38 20-38s20 18 20 38z" fill="${b}"/><ellipse cx="22" cy="50" rx="3.6" ry="2.2" fill="#fda4af" opacity=".55"/><ellipse cx="42" cy="50" rx="3.6" ry="2.2" fill="#fda4af" opacity=".55"/>${eyes}<path d="M28.5 52q3.5 3 7 0" stroke="#1e2433" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
  };
  K.av = function (p, size = 32, extra = "") {
    return K.h("span", { class: `s-av ${extra}`, style: { width: size + "px", height: size + "px" }, html: K.critter(p) });
  };
  /* name with its avatar, always together */
  K.pname = function (p, size = 22, opts = {}) {
    return K.h("span", { class: "s-pname" }, K.av(p, size), K.h("span", null, opts.plain ? p.name : K.label(p)));
  };

  /* character portraits, 4:5, flat illustration */
  const SH = "M4 100c0-22 16-34 36-34s36 12 36 34z";
  const bgGrad = (id, a, b) =>
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="80" height="100" fill="url(#${id})"/>`;
  let gid = 0;
  const P = {
    spider: (g) => `${bgGrad(g, "#bcd4f6", "#7da6e6")}<path d="${SH}" fill="#1f4fa8"/><path d="M26 70 L40 100 L54 70z" fill="#d6332b"/><circle cx="40" cy="44" r="18" fill="#d6332b"/><path d="M40 26v36M22 44h36M27 31l26 26M53 31 27 57" stroke="#7a1712" stroke-width=".9"/><circle cx="40" cy="44" r="9" fill="none" stroke="#7a1712" stroke-width=".9"/><path d="M27 40c3-6 10-5 10 1-3 3-8 4-10-1zM53 40c-3-6-10-5-10 1 3 3 8 4 10-1z" fill="#fff" stroke="#1e2433" stroke-width="1.6"/>`,
    iron: (g) => `${bgGrad(g, "#2b2f3f", "#11131a")}<path d="${SH}" fill="#b3261e"/><circle cx="40" cy="84" r="6" fill="#bff3ff"/><circle cx="40" cy="84" r="9" fill="#7fe3ff" opacity=".3"/><path d="M22 44c0-13 8-20 18-20s18 7 18 20c0 10-6 18-18 20-12-2-18-10-18-20z" fill="#b3261e"/><path d="M28 36h24l-2 18-10 8-10-8z" fill="#f2c14e"/><path d="M30 41h7l-1 3h-6zM50 41h-7l1 3h6z" fill="#bff3ff"/><path d="M35 54h10" stroke="#9c7a1e" stroke-width="1.4"/>`,
    iron2: (g) => `${bgGrad(g, "#e9edf3", "#aab3c2")}<path d="${SH}" fill="#7d8796"/><circle cx="40" cy="84" r="6" fill="#dff8ff"/><path d="M22 44c0-13 8-20 18-20s18 7 18 20c0 10-6 18-18 20-12-2-18-10-18-20z" fill="#8e98a8"/><path d="M28 36h24l-2 18-10 8-10-8z" fill="#c9d0db"/><path d="M30 41h7l-1 3h-6zM50 41h-7l1 3h6z" fill="#1e2433"/><circle cx="26" cy="33" r="1.2" fill="#5d6675"/><circle cx="54" cy="33" r="1.2" fill="#5d6675"/>`,
    iron3: (g) => `<defs><pattern id="${g}d" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="#e85d3f"/></pattern></defs><rect width="80" height="100" fill="#ffd166"/><rect width="80" height="100" fill="url(#${g}d)" opacity=".5"/><path d="${SH}" fill="#c1121f" stroke="#1e2433" stroke-width="2"/><path d="M22 44c0-13 8-20 18-20s18 7 18 20c0 10-6 18-18 20-12-2-18-10-18-20z" fill="#c1121f" stroke="#1e2433" stroke-width="2"/><path d="M28 36h24l-2 18-10 8-10-8z" fill="#ffd166" stroke="#1e2433" stroke-width="2"/><path d="M30 41h7l-1 3h-6zM50 41h-7l1 3h6z" fill="#fff" stroke="#1e2433" stroke-width="1.2"/><circle cx="40" cy="84" r="6" fill="#fff" stroke="#1e2433" stroke-width="2"/>`,
    hulk: (g) => `${bgGrad(g, "#d9c6f2", "#9a74d1")}<path d="M0 100c0-26 18-38 40-38s40 12 40 38z" fill="#4f8f3a"/><path d="M14 100c2-14 8-22 14-26l4 26zM66 100c-2-14-8-22-14-26l-4 26z" fill="#5b2f86"/><circle cx="40" cy="45" r="19" fill="#5fa84a"/><path d="M21 42c0-14 9-21 19-21s19 7 19 21c-4-6-9-8-19-8s-15 2-19 8z" fill="#22261c"/><path d="M31 46l6 2M49 46l-6 2" stroke="#1e2433" stroke-width="2.2" stroke-linecap="round"/><path d="M34 56h12" stroke="#1e2433" stroke-width="2" stroke-linecap="round"/>`,
    wonder: (g) => `${bgGrad(g, "#ffe1d1", "#f2a08b")}<path d="M18 46c0-20 9-26 22-26s22 6 22 26v40H18z" fill="#2a1a14"/><path d="${SH}" fill="#c1272d"/><path d="M14 100c4-10 12-16 26-16s22 6 26 16" fill="#f2c14e" opacity=".9"/><circle cx="40" cy="46" r="16" fill="#c98d6b"/><path d="M24 40c4-9 10-12 16-12s12 3 16 12c-6-4-10-5-16-5s-10 1-16 5z" fill="#2a1a14"/><path d="M27 37l13-5 13 5-13 3z" fill="#f2c14e"/><path d="M40 31.5l1.4 2.6 2.8.4-2 2 .5 2.8-2.7-1.4-2.6 1.4.5-2.8-2-2 2.8-.4z" fill="#c1272d"/><circle cx="34" cy="47" r="1.6" fill="#1e2433"/><circle cx="46" cy="47" r="1.6" fill="#1e2433"/><path d="M36 54q4 2.5 8 0" stroke="#7a3b2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    panther: (g) => `${bgGrad(g, "#c7b8f0", "#5b3fa5")}<path d="${SH}" fill="#15131c"/><path d="M28 70l12 10 12-10" stroke="#b9b4cc" stroke-width="2" fill="none"/><path d="M22 46c0-14 8-22 18-22s18 8 18 22c0 10-7 18-18 19-11-1-18-9-18-19z" fill="#1b1924"/><path d="M24 33l-2-10 8 5zM56 33l2-10-8 5z" fill="#1b1924"/><path d="M29 43c3-3 7-3 9 0-3 2-6 2-9 0zM51 43c-3-3-7-3-9 0 3 2 6 2 9 0z" fill="#e6e1f5"/><path d="M40 30v10M33 52l7 4 7-4" stroke="#8a84a3" stroke-width="1.2" fill="none"/>`,
    storm: (g) => `${bgGrad(g, "#cfe0f2", "#6f8fb5")}<path d="M16 50c0-22 10-30 24-30s24 8 24 30v38H16z" fill="#f4f6fa"/><path d="${SH}" fill="#1f2433"/><circle cx="40" cy="47" r="15" fill="#6b4532"/><path d="M25 42c3-10 9-14 15-14s12 4 15 14c-5-5-9-6-15-6s-10 1-15 6z" fill="#f4f6fa"/><circle cx="34.5" cy="48" r="1.9" fill="#fff"/><circle cx="45.5" cy="48" r="1.9" fill="#fff"/><path d="M36 55q4 2 8 0" stroke="#3a2117" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    chapolin: (g) => `${bgGrad(g, "#fff1c2", "#f6c453")}<path d="${SH}" fill="#d62828"/><path d="M33 80c0-5 7-7 7-2 0-5 7-3 7 2 0 5-7 9-7 10 0-1-7-5-7-10z" fill="#ffd60a"/><text x="40" y="84.5" font-size="5.4" font-family="Arial" font-weight="900" text-anchor="middle" fill="#d62828">CH</text><path d="M31 24c-2-8-6-11-9-12M49 24c2-8 6-11 9-12" stroke="#ffd60a" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="22" cy="12" r="3.4" fill="#ffd60a"/><circle cx="58" cy="12" r="3.4" fill="#ffd60a"/><circle cx="40" cy="45" r="19" fill="#d62828"/><ellipse cx="40" cy="50" rx="11.5" ry="12" fill="#f0b48c"/><circle cx="36" cy="48" r="1.7" fill="#1e2433"/><circle cx="44" cy="48" r="1.7" fill="#1e2433"/><path d="M36 55q4 3 8 0" stroke="#8a4a2b" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    shrek: (g) => `${bgGrad(g, "#e3f0c8", "#a6c46b")}<path d="${SH}" fill="#c9b27e"/><circle cx="40" cy="46" r="18" fill="#8fbf3a"/><path d="M21 40l-7-3 1 7zM59 40l7-3-1 7z" fill="#8fbf3a"/><circle cx="34" cy="45" r="1.8" fill="#1e2433"/><circle cx="46" cy="45" r="1.8" fill="#1e2433"/><path d="M33 54q7 4 14 0" stroke="#3b5a12" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    blank: (g) => `<rect width="80" height="100" fill="var(--sunken)"/><circle cx="40" cy="42" r="15" fill="var(--line)"/><path d="M10 100c0-20 13-32 30-32s30 12 30 32z" fill="var(--line)"/>`,
  };
  K.portrait = function (key) {
    return `<svg viewBox="0 0 80 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${P[key](`g${++gid}`)}</svg>`;
  };
  K.chars = {
    spider: { name: "Homem-Aranha", origin: "Marvel", likes: 42 },
    iron: { name: "Homem de Ferro", origin: "Marvel", likes: 37 },
    wonder: { name: "Mulher-Maravilha", origin: "DC", likes: 31 },
    hulk: { name: "Hulk", origin: "Marvel", likes: 27 },
    panther: { name: "Pantera Negra", origin: "Marvel", likes: 19 },
    storm: { name: "Tempestade", origin: "X-Men", likes: 12 },
    chapolin: { name: "Chapolin Colorado", origin: "Personagem novo" },
    shrek: { name: "Shrek", origin: "DreamWorks" },
  };
  /* the match: who got what (picker -> target's card) */
  K.cards = { leo: "iron", bia: "wonder", rafa: "hulk", you: "panther" };

  /* the 4Dare logo, from src/components/ui/logo.tsx */
  K.FOUR = "M525 0L640 0Q700 0 700 60L700 489Q700 505 716 505L776 505Q820 505 820 549L820 611Q820 655 776 655L716 655Q700 655 688 665L511 809Q485 830 493 797L521 671Q525 655 509 655L70 655Q0 655 0 585L0 545Q0 465 61 414Q254 254 427 46Q465 0 525 0Z";
  K.QUESTION = "M533 454L460 467Q453 443 456 426Q458 409 466 397Q474 384 485 375Q495 365 504 356Q514 346 519 335Q524 324 522 309L522 309Q518 289 505 282Q492 275 471 279L471 279Q459 281 445 287Q431 292 417 300Q403 308 391 318L391 318L373 241Q388 230 404 222Q420 214 437 208Q454 203 469 200L469 200Q495 196 517 198Q540 200 559 210Q579 220 592 238Q605 255 610 282L610 282Q614 306 609 323Q604 340 594 354Q584 367 572 379Q561 390 550 401Q540 412 535 425Q530 437 533 454L533 454M525 596L525 596Q495 602 478 592Q461 582 456 555L456 555Q452 528 464 513Q476 498 506 493L506 493Q537 487 554 497Q571 507 576 534L576 534Q585 586 525 596";
  const LETTERS = [
    ["M1185 660L1009 672L1001 556L1172 544Q1219 540 1249 518Q1279 496 1292 456Q1305 415 1301 356L1301 356Q1297 308 1285 275Q1273 242 1252 221Q1231 200 1200 192Q1169 183 1129 186L1129 186L976 197L967 80L1115 69Q1226 62 1298 92Q1371 122 1408 185Q1445 248 1451 338L1451 338Q1456 408 1443 461Q1430 513 1403 550Q1377 586 1341 610Q1306 634 1265 645Q1225 657 1185 660L1185 660M1086 667L941 677L900 85L1045 74L1086 667", "var(--apricot)"],
    ["M1627 663L1627 663Q1587 659 1558 641Q1529 623 1515 591Q1500 559 1504 516L1504 516Q1508 476 1526 451Q1544 426 1575 413Q1606 400 1649 393Q1693 387 1747 383L1747 383Q1773 381 1791 378Q1809 376 1819 368Q1829 360 1830 343L1830 343Q1832 320 1817 303Q1803 285 1767 282L1767 282Q1742 280 1721 287Q1700 294 1684 310Q1668 326 1659 349L1659 349L1535 300Q1550 264 1573 238Q1597 212 1628 196Q1659 180 1698 175Q1737 170 1780 174L1780 174Q1852 180 1895 207Q1938 234 1956 284Q1974 333 1967 409L1967 409L1961 481Q1958 514 1956 547Q1955 579 1954 612Q1954 645 1954 679L1954 679L1827 668Q1825 647 1824 617Q1823 588 1824 557L1824 557L1807 556Q1791 589 1765 615Q1739 641 1704 654Q1669 666 1627 663M1701 566L1701 566Q1717 568 1734 563Q1752 559 1768 550Q1784 541 1798 527Q1812 513 1819 495L1819 495L1824 424L1843 430Q1825 440 1804 444Q1783 449 1761 450Q1740 452 1720 454Q1699 457 1683 462Q1667 466 1657 476Q1647 486 1645 505L1645 505Q1643 530 1659 547Q1674 564 1701 566", "var(--yes)"],
    ["M2190 660L2045 667L2033 447L2020 193L2138 186L2149 347L2167 346Q2170 283 2186 245Q2202 207 2233 188Q2265 169 2314 166L2314 166Q2321 166 2330 166Q2339 166 2351 167L2351 167L2354 322Q2339 316 2322 314Q2305 313 2293 314L2293 314Q2258 315 2233 330Q2208 345 2195 374Q2181 402 2179 445L2179 445L2190 660", "var(--no)"],
    ["M2624 673L2624 673Q2565 667 2520 646Q2475 625 2446 592Q2416 558 2404 511Q2392 465 2398 406L2398 406Q2404 350 2425 304Q2447 259 2481 227Q2516 196 2563 182Q2610 168 2667 174L2667 174Q2724 180 2765 203Q2807 226 2831 265Q2856 303 2864 356Q2872 409 2860 475L2860 475L2490 439L2498 364L2786 391L2731 421Q2742 377 2734 347Q2725 318 2704 302Q2683 287 2657 284L2657 284Q2626 281 2600 296Q2575 310 2558 341Q2541 372 2536 418L2536 418Q2528 492 2557 528Q2585 565 2634 570L2634 570Q2658 572 2675 567Q2692 562 2703 553Q2715 544 2722 532Q2729 520 2734 509L2734 509L2856 549Q2846 581 2827 606Q2809 631 2780 648Q2752 665 2713 672Q2675 678 2624 673", "var(--sky)"],
  ];
  K.logo = function () {
    return `<svg viewBox="-4 -4 2880 838" role="img" aria-label="4Dare"><path fill="#2B69C8" d="${K.FOUR}"/><path fill="#F6E3A1" d="${K.QUESTION}"/>${LETTERS.map(([d, f]) => `<path fill="${f}" d="${d}"/>`).join("")}</svg>`;
  };
  /* the room's QR card, like src/components/ui/room-qr.tsx: ink modules, sky eyes, the 4 in the middle */
  K.qr = function () {
    const n = 25;
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const eye = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
    const hole = (x, y) => x >= 9 && x < 16 && y >= 9 && y < 16;
    let d = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (!eye(x, y) && !hole(x, y) && rnd() < 0.48)
          d += `M${x + 0.27} ${y + 0.05}h0.46a0.22 0.22 0 0 1 0.22 0.22v0.46a0.22 0.22 0 0 1-0.22 0.22h-0.46a0.22 0.22 0 0 1-0.22-0.22v-0.46a0.22 0.22 0 0 1 0.22-0.22z`;
    const eyes = [[0, 0], [n - 7, 0], [0, n - 7]]
      .map(([x, y]) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="#2b69c8" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="#2b69c8"/>`)
      .join("");
    const k = 5.6 / 840;
    return `<svg viewBox="0 0 ${n} ${n}" aria-hidden="true"><path d="${d}" fill="#1e2433"/>${eyes}<g transform="translate(9.7 9.6) scale(${k})"><path d="${K.FOUR}" fill="#f6e3a1"/><path d="${K.QUESTION}" fill="#2b69c8"/></g></svg>`;
  };
  K.flag = `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#229e45"/><path d="M10 3.6 17 10 10 16.4 3 10z" fill="#f8e509"/><circle cx="10" cy="10" r="3.7" fill="#2b49a3"/></svg>`;
  /* the game's small thumbnail: two critter cards and yours, the "?" one, in the middle */
  K.gameThumb = function () {
    const side = (x, rot, bg) =>
      `<g transform="rotate(${rot} ${x + 20} 56)"><rect x="${x}" y="26" width="40" height="56" rx="6" fill="var(--surface)"/><rect x="${x + 4}" y="30" width="32" height="38" rx="4" fill="${bg}"/><circle cx="${x + 20}" cy="56" r="10" fill="#a5b4fc"/><circle cx="${x + 16}" cy="52" r="2.6" fill="#fff"/><circle cx="${x + 24}" cy="52" r="2.6" fill="#fff"/></g>`;
    return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="100" fill="var(--sky-soft)"/>${side(10, -10, "#fde2c8")}${side(110, 10, "#cdeee9")}<rect x="52" y="12" width="56" height="78" rx="8" fill="var(--butter)"/><path d="${K.QUESTION}" fill="#2b69c8" transform="translate(43 21) scale(0.075)"/></svg>`;
  };
  K.mark = function (fill = "#2B69C8", q = "#F6E3A1") {
    return `<svg viewBox="-10 -10 840 850" aria-hidden="true"><path fill="${fill}" d="${K.FOUR}"/><path class="q" fill="${q}" d="${K.QUESTION}" style="transform-box:fill-box;transform-origin:center"/></svg>`;
  };
})();
