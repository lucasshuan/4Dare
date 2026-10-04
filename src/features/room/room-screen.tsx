"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";
import { Screen } from "@/components/ui/screen";
import { MatchLockPage } from "@/features/current-match/match-lock";
import { RoomProvider } from "@/features/data/room-context";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { useRoom } from "@/features/data/use-room";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import type { ErrorCode } from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { riseIn } from "@/lib/motion";
import { useRoomTitle } from "@/lib/names";
import { WHO_AM_I } from "@/lib/routes";
import { joinRoom, leaveRoom } from "@/server/actions";
import type { ElsewhereRoom } from "@/server/contract";
import { PasswordDialog } from "./password-dialog";
import { RoomProblem, RoomStage } from "./room-stage";

/**
 * The room this page just left without closing (a link, the back button),
 * told a moment later: React's dev double mount comes straight back to the same
 * room and calls it off.
 */
let leaving: { code: string; timer: number } | null = null;

/** /r/CODE: joins if needed, then shows the screen for the current phase. */
export function RoomScreen({ code }: { code: string }) {
  const { data, error, elsewhere, refresh, apply } = useRoom(code);
  const te = useTranslations("common.errors");
  const router = useRouter();
  const [joinError, setJoinError] = useState<ErrorCode | null>(null);
  const [askPassword, setAskPassword] = useState(false);
  const triedJoin = useRef(false);
  // One room at a time: their seat here went to a room they joined since (another
  // tab, another device). Taking it back is up to them, or two tabs would trade it
  // forever; it stays that way even once they leave that room too.
  const [moved, setMoved] = useState<ElsewhereRoom | null>(null);
  const movedNow = data && error === "not_member" ? elsewhere : null;
  if (movedNow && movedNow.code !== moved?.code) setMoved(movedNow);
  if (!error && moved) setMoved(null);

  const join = useCallback(async () => {
    const r = await joinRoom(code);
    if (r.ok) void refresh();
    else if (r.error === "password_required") setAskPassword(true);
    else setJoinError(r.error);
  }, [code, refresh]);

  // Seated again: a seat lost later (a lobby page closed too long) is taken back too.
  useEffect(() => {
    if (data && !error) triedJoin.current = false;
  }, [data, error]);
  useEffect(() => {
    if (error !== "not_member" || moved || triedJoin.current) return;
    triedJoin.current = true;
    void join();
  }, [error, moved, join]);

  // Closing the page tells the room; a reload or a dropped connection comes back in time.
  // Leaving it for another page of the site tells it too: a lobby at once (the seat is
  // freed, an empty room closes), a match like a closed page.
  const member = !!data;
  const inLobby = useRef(false);
  inLobby.current = data?.view.phase === "lobby";
  useEffect(() => {
    if (!member) return;
    if (leaving?.code === code) {
      window.clearTimeout(leaving.timer);
      leaving = null;
    }
    const gone = () => navigator.sendBeacon(`/api/rooms/${code}/gone`);
    const back = (e: PageTransitionEvent) => {
      if (e.persisted) void refresh();
    };
    window.addEventListener("pagehide", gone);
    window.addEventListener("pageshow", back);
    return () => {
      window.removeEventListener("pagehide", gone);
      window.removeEventListener("pageshow", back);
      const lobby = inLobby.current;
      leaving = {
        code,
        timer: window.setTimeout(() => {
          leaving = null;
          if (lobby) void leaveRoom(code);
          else gone();
        }, 0),
      };
    };
  }, [member, code, refresh]);

  const problem = joinError ?? (error === "not_found" ? "not_found" : null);
  if (problem === "in_match") return <InMatchElsewhere />;
  if (problem) return <RoomProblem code={problem} />;
  if (moved) return <MovedElsewhere room={moved} onStay={join} />;
  if (askPassword)
    return (
      <>
        <RoomLoading />
        <PasswordDialog
          onCancel={() => router.push(WHO_AM_I)}
          onSubmit={async (password) => {
            const r = await joinRoom(code, password);
            if (r.ok) {
              await refresh();
              setAskPassword(false);
              return null;
            }
            if (r.error === "wrong_password" || r.error === "rate_limited")
              return te(r.error);
            setAskPassword(false);
            setJoinError(r.error);
            return null;
          }}
        />
      </>
    );
  if (!data) return <RoomLoading />;
  return (
    <RoomProvider
      code={code}
      view={data.view}
      offset={data.offset}
      refresh={refresh}
      apply={apply}
    >
      <RoomStage />
    </RoomProvider>
  );
}

function RoomLoading() {
  const t = useTranslations("room");
  return (
    <Screen left={null}>
      <PageLoader label={t("loading")} />
    </Screen>
  );
}

/**
 * Another room's link while a match is going: the lock, with the way back or
 * out. Once out (or once that match ends), the page loads again and joins.
 */
function InMatchElsewhere() {
  const tc = useTranslations("common");
  const { match, isLoading } = useCurrentMatch();
  useEffect(() => {
    if (!isLoading && !match) window.location.reload();
  }, [isLoading, match]);
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      {match ? (
        <MatchLockPage match={match} />
      ) : (
        <PageLoader label={tc("loading")} />
      )}
    </Screen>
  );
}

/** Their seat went to another room: the way there, or back into this one. */
function MovedElsewhere({
  room,
  onStay,
}: {
  room: ElsewhereRoom;
  onStay: () => Promise<void>;
}) {
  const t = useTranslations("room.moved");
  const roomTitle = useRoomTitle();
  const [pending, setPending] = useState(false);
  const there = roomTitle(room.name, room.host);
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <motion.div {...riseIn} className="flex max-w-lg flex-col gap-6 pt-10">
        <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
          {t("title")}
        </h1>
        <p className="text-ink-muted text-lg">{t("body", { room: there })}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/r/${room.code}`}
            className={buttonClass("primary", "lg")}
          >
            {t("go")}
          </Link>
          <Button
            size="lg"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onStay();
              setPending(false);
            }}
          >
            {t("stay")}
          </Button>
        </div>
      </motion.div>
    </Screen>
  );
}
