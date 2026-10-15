import Link from "next/link";
import { FOUR, LETTERS, QUESTION } from "@/components/ui/logo";

/**
 * The rail's top: a backstage pass with the 4Dare mark, a perforation and how
 * many rooms are in a match right now.
 */
export function Pass({ href, playing }: { href: string; playing: number }) {
  return (
    <Link
      className="pass"
      href={href}
      aria-label="4Dare, bastidores: visão geral"
    >
      <span className="pass-top">
        <svg className="mark" viewBox="-10 -10 840 850" aria-hidden="true">
          <path fill="#F6E3A1" d={FOUR} />
          <path fill="#2B69C8" d={QUESTION} />
        </svg>
        <span className="wm">
          <svg viewBox="890 60 1990 630" aria-hidden="true">
            {LETTERS.map(([d]) => (
              <path key={d.slice(0, 24)} fill="#fff" d={d} />
            ))}
          </svg>
          <small>Acesso total</small>
        </span>
      </span>
      <span className="pass-cut" />
      <span className="pass-bot">
        <span className="area">Bastidores</span>
        <span
          className={playing ? "live on" : "live"}
          title={`${playing} ${playing === 1 ? "sala" : "salas"} em partida agora`}
        >
          <i />
          <span className="t">{playing} jogando</span>
        </span>
      </span>
    </Link>
  );
}
