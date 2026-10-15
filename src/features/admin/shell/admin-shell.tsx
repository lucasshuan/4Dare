"use client";

import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Crown,
  Gamepad2,
  LayoutGrid,
  LogOut,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import { Flag } from "@/components/ui/language-switch";
import { usePlayerCard } from "@/features/profile/use-profile";
import { levelOf } from "@/game/profile/xp";
import type { TuneValue } from "@/game/tune";
import { signOut } from "@/server/actions";
import type { AdminCounts } from "@/server/admin/overview";
import type { Me, Role } from "@/server/contract";
import { DraftProvider } from "../config/draft";
import { Tray } from "../config/tray";
import { NAV, SECTIONS, sectionOf, TABS } from "../nav";
import { PersonDrawerProvider } from "../people/person-drawer";
import { useAdminCounts } from "../use-admin-counts";
import { AdminBaseProvider, useAdminBase, useRelPath } from "./base";
import { Crumbs, CrumbsProvider } from "./crumbs";
import { Pass } from "./pass";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  curator: "Curador",
  player: "Jogador",
};
export const ROLE_ICON = {
  admin: Crown,
  curator: BadgeCheck,
  player: Gamepad2,
};

/** A role as a small pill: crown, badge or gamepad, and its name. */
export function RoleChip({ role }: { role: Role }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className={`role ${role}`}>
      <Icon className="i" />
      {ROLE_LABEL[role]}
    </span>
  );
}

/**
 * The panel's frame: the dark rail with the pass, the sections and the
 * account; the strip on top with the language (Portuguese only, for now) and
 * where you are; on phones the rail is a drawer and a bar at the bottom
 * holds the main sections.
 */
export function AdminShell({
  me,
  base,
  site,
  initialCounts,
  config,
  children,
}: {
  me: Me;
  base: string;
  site: string;
  initialCounts: AdminCounts;
  /** The panel's values in force, for the fields and the tray. */
  config: { v: number; tunes: Record<string, TuneValue> };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  // close the drawer when the page changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on navigation
  useEffect(() => setOpen(false), [path]);
  return (
    <AdminBaseProvider base={base} site={site}>
      <DraftProvider version={config.v} saved={config.tunes}>
        <CrumbsProvider>
          <div className="adm">
            <PersonDrawerProvider>
              <div className="app">
                <Rail
                  me={me}
                  open={open}
                  onClose={() => setOpen(false)}
                  initialCounts={initialCounts}
                />
                {open ? (
                  <button
                    type="button"
                    className="rail-scrim"
                    aria-label="Fechar o menu"
                    onClick={() => setOpen(false)}
                  />
                ) : null}
                <main>
                  <div className="topline">
                    <span
                      className="lang"
                      title="Idioma do painel: só português, por enquanto"
                      aria-disabled="true"
                    >
                      <Flag lang="pt" />
                      <select aria-label="Idioma do painel" disabled value="pt">
                        <option value="pt">Português</option>
                      </select>
                      <span className="code">PT</span>
                      <ChevronDown className="i" />
                    </span>
                    <Crumbs />
                  </div>
                  <div className="view">{children}</div>
                </main>
              </div>
              <TabBar onMenu={() => setOpen(true)} />
              <Tray />
            </PersonDrawerProvider>
          </div>
        </CrumbsProvider>
      </DraftProvider>
    </AdminBaseProvider>
  );
}

function Rail({
  me,
  open,
  onClose,
  initialCounts,
}: {
  me: Me;
  open: boolean;
  onClose: () => void;
  initialCounts: AdminCounts;
}) {
  const { base, site } = useAdminBase();
  const { data } = useAdminCounts();
  const counts = data ?? initialCounts;
  const current = sectionOf(useRelPath());
  return (
    <aside
      className={open ? "rail open" : "rail"}
      aria-label="Painel de controle"
    >
      <Pass href={base || "/"} playing={counts.playing} />
      {NAV.map((g) => (
        <div key={g.group}>
          <h6>{g.group}</h6>
          <nav className="nav">
            {g.items.map((it) => {
              const c = it.count?.(counts);
              return (
                <Link
                  key={it.id}
                  href={`${base}${it.path}` || "/"}
                  title={it.label}
                  aria-current={current?.id === it.id ? "page" : undefined}
                  onClick={onClose}
                >
                  <it.Icon className="i" />
                  <span className="lb">{it.label}</span>
                  {c ? (
                    <span className={c.hot ? "count hot" : "count"}>{c.n}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
      <div className="rail-foot">
        <nav className="nav">
          <a href={site} title="Voltar ao site">
            <ArrowLeft className="i" />
            <span className="lb">Voltar ao site</span>
          </a>
        </nav>
        <MeBox me={me} />
      </div>
    </aside>
  );
}

const subscribeNothing = () => () => {};

/** The signed-in account at the rail's foot, with its menu and the theme. */
function MeBox({ me }: { me: Me }) {
  const { site } = useAdminBase();
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  const { data: card } = usePlayerCard(me.id, true);
  const level = levelOf(card?.numbers?.xp ?? 0).level;
  const name = me.name ?? me.guestName;
  const role = me.role ?? "player";
  const flip = () => setTheme(dark ? "light" : "dark");
  const ThemeIcon = dark ? Sun : Moon;

  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const leave = async () => {
    await signOut();
    window.location.assign(site);
  };

  return (
    <div className="me" ref={box}>
      <button
        type="button"
        className="me-btn"
        aria-haspopup="menu"
        aria-expanded={menu}
        title={`${name} · ${ROLE_LABEL[role]}`}
        onClick={() => setMenu((v) => !v)}
      >
        <span className="av-ring">
          <Avatar avatar={me.avatar} size={34} />
        </span>
        <span className="lb">
          <b>{name}</b>
          <small>
            Nível {level} <RoleChip role={role} />
          </small>
        </span>
        <ChevronUp className="i" />
      </button>
      <button
        type="button"
        className="me-theme"
        aria-label={dark ? "Tema claro" : "Tema escuro"}
        title="Tema"
        onClick={flip}
      >
        <ThemeIcon className="i" />
      </button>
      {menu ? (
        <div className="me-menu" role="menu">
          {me.handle ? (
            <a
              role="menuitem"
              href={`${site.replace(/\/$/, "")}/u/${me.handle}`}
            >
              <UserRound className="i" />
              Meu perfil no site
            </a>
          ) : null}
          <button role="menuitem" type="button" onClick={flip}>
            <ThemeIcon className="i" />
            {dark ? "Tema claro" : "Tema escuro"}
          </button>
          <a role="menuitem" href={site}>
            <ArrowLeft className="i" />
            Voltar ao site
          </a>
          <hr />
          <button role="menuitem" type="button" onClick={leave}>
            <LogOut className="i" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Phones: the main sections at the bottom, and the full menu. */
function TabBar({ onMenu }: { onMenu: () => void }) {
  const { base } = useAdminBase();
  const current = sectionOf(useRelPath());
  const { data } = useAdminCounts();
  const tabs = SECTIONS.filter((s) => TABS.includes(s.id));
  return (
    <nav className="tabbar" aria-label="Atalhos">
      {tabs.map((s) => (
        <Link
          key={s.id}
          href={`${base}${s.path}` || "/"}
          aria-current={current?.id === s.id ? "page" : undefined}
        >
          <s.Icon className="i" />
          {s.label}
        </Link>
      ))}
      <button type="button" onClick={onMenu} aria-label="Abrir o menu completo">
        <LayoutGrid className="i" />
        Menu
        {data?.waiting ? <span className="bd">{data.waiting}</span> : null}
      </button>
    </nav>
  );
}
