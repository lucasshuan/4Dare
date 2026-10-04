"use client";

import { Check, ChevronLeft, Dices, Upload } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AuthButton,
  PROVIDER_NAME,
  ProviderLogo,
} from "@/components/ui/auth-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { randomCritterSeed } from "@/components/ui/critter";
import { ImageDrop, type ImageDropHandle } from "@/components/ui/image-drop";
import { PageLoader } from "@/components/ui/loader";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import { useSignIn } from "@/features/home/use-sign-in";
import { type Avatar as AvatarData, MAX_NAME } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { GAMES } from "@/lib/routes";
import { updateProfile } from "@/server/actions";
import { AVATAR_COLORS, type Me } from "@/server/contract";

export function ProfileScreen() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const { me } = useMe();
  useAuthErrorToast();
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <div className="flex flex-col gap-4">
        <Link
          href={GAMES}
          className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
          {t("back")}
        </Link>
        {!me ? (
          <PageLoader label={tc("loading")} />
        ) : me.isGuest ? (
          <GuestProfile />
        ) : (
          <AccountForm key={me.id} me={me} />
        )}
      </div>
    </Screen>
  );
}

function GuestProfile() {
  const t = useTranslations("profile");
  const { signIn, pending } = useSignIn();
  return (
    <m.section {...riseIn} className="flex max-w-[560px] flex-col gap-5">
      <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
        {t("guestTitle")}
      </h1>
      <p className="text-ink-muted text-lg">{t("guestText")}</p>
      <div className="grid grid-cols-2 gap-2">
        <AuthButton
          provider="discord"
          disabled={pending}
          onClick={() => signIn("discord")}
        />
        <AuthButton
          provider="google"
          disabled={pending}
          onClick={() => signIn("google")}
        />
      </div>
    </m.section>
  );
}

type Kind = "provider" | "upload" | "critter";

function initialKind(me: Me): Kind {
  if (me.avatar.kind !== "image") return "critter";
  return me.avatar.url === me.providerAvatarUrl ? "provider" : "upload";
}

/** Name, avatar (provider picture, an upload or a critter) and background colour. */
function AccountForm({ me }: { me: Me }) {
  const t = useTranslations("profile");
  const toast = useToast();
  const { setMe } = useMe();
  const { run, pending } = useAction();
  const [name, setName] = useState(me.name ?? "");
  const [kind, setKind] = useState<Kind>(initialKind(me));
  const [color, setColor] = useState(me.avatar.color);
  const [seed, setSeed] = useState(() =>
    me.avatar.kind === "critter" ? me.avatar.seed : randomCritterSeed(),
  );
  const [blob, setBlob] = useState<Blob | null>(null);
  const drop = useRef<ImageDropHandle>(null);
  const blobUrl = useMemo(
    () => (blob ? URL.createObjectURL(blob) : null),
    [blob],
  );
  useEffect(
    () => () => void (blobUrl && URL.revokeObjectURL(blobUrl)),
    [blobUrl],
  );

  const keptUpload =
    me.avatar.kind === "image" && me.avatar.url !== me.providerAvatarUrl
      ? me.avatar.url
      : null;
  const uploadUrl = blobUrl ?? keptUpload;
  const preview: AvatarData =
    kind === "provider" && me.providerAvatarUrl
      ? { kind: "image", url: me.providerAvatarUrl, color }
      : kind === "upload" && uploadUrl
        ? { kind: "image", url: uploadUrl, color }
        : { kind: "critter", seed, color };
  const trimmed = name.trim();
  // the random pastel a guest started with stays available next to the palette
  const swatches: readonly string[] = (
    AVATAR_COLORS as readonly string[]
  ).includes(me.avatar.color)
    ? AVATAR_COLORS
    : [me.avatar.color, ...AVATAR_COLORS];
  const canSave = trimmed.length > 0 && (kind !== "upload" || !!uploadUrl);

  const save = async () => {
    const form = new FormData();
    form.set("name", trimmed);
    form.set("color", color);
    // A new picture goes as cropped now: the preview can lag a moment behind it.
    const image =
      kind === "upload" && blob && (await drop.current?.exportCrop());
    if (image) {
      form.set("avatar", "upload");
      form.set("image", image, "avatar.webp");
    } else if (kind === "critter") {
      form.set("avatar", "critter");
      form.set("seed", seed);
    } else {
      form.set("avatar", kind === "upload" ? "keep" : kind);
    }
    const r = await run(() => updateProfile(form));
    if (r.ok) {
      setMe(r.data);
      setBlob(null);
      toast(t("saved"));
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,560px)_minmax(0,380px)] lg:justify-between">
      <m.form
        {...riseIn}
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) void save();
        }}
      >
        <div className="flex flex-col items-start gap-3">
          <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
            {t("title")}
          </h1>
          {me.provider ? (
            <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5 font-semibold text-[13px]">
              <ProviderLogo provider={me.provider} />
              {me.authMode === "local"
                ? t("testAccount")
                : t("connected", { provider: PROVIDER_NAME[me.provider] })}
            </span>
          ) : null}
        </div>

        <TextField
          label={t("name")}
          hint={t("nameHint")}
          value={name}
          max={MAX_NAME}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          className="max-w-90"
        />

        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 font-semibold text-sm">{t("avatar")}</legend>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3 sm:max-w-[480px]">
            {me.provider && me.providerAvatarUrl ? (
              <Tile
                pressed={kind === "provider"}
                onClick={() => setKind("provider")}
                label={t("providerPhoto", {
                  provider: PROVIDER_NAME[me.provider],
                })}
              >
                <Avatar
                  avatar={{
                    kind: "image",
                    url: me.providerAvatarUrl,
                    color,
                  }}
                  isGuest={false}
                  name={trimmed}
                  size={64}
                />
              </Tile>
            ) : null}
            <Tile
              pressed={kind === "upload"}
              onClick={() => setKind("upload")}
              label={t("upload")}
            >
              {uploadUrl ? (
                <Avatar
                  avatar={{ kind: "image", url: uploadUrl, color }}
                  isGuest={false}
                  name={trimmed}
                  size={64}
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-pill border-[1.5px] border-line-strong border-dashed text-ink-muted">
                  <Upload className="size-6" strokeWidth={1.75} />
                </span>
              )}
            </Tile>
            <Tile
              pressed={kind === "critter"}
              onClick={() => setKind("critter")}
              label={t("critter")}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <m.span
                  key={seed}
                  initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6, rotate: 12 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className="flex"
                >
                  <Avatar
                    avatar={{ kind: "critter", seed, color }}
                    isGuest={false}
                    name={trimmed}
                    size={64}
                  />
                </m.span>
              </AnimatePresence>
            </Tile>
          </div>
          <Button
            size="sm"
            className="mt-1 self-start"
            onClick={() => {
              setKind("critter");
              setSeed(randomCritterSeed());
            }}
          >
            <Dices strokeWidth={1.75} />
            {t("shuffle")}
          </Button>
          <AnimatePresence initial={false}>
            {kind === "upload" ? (
              <m.div
                key="drop"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ImageDrop
                  shape="square"
                  ref={drop}
                  onChange={setBlob}
                  className="mt-2 max-w-90"
                />
              </m.div>
            ) : null}
          </AnimatePresence>
        </fieldset>

        {/* a picture brings its own background; only a critter sits on a colour */}
        <AnimatePresence initial={false}>
          {kind === "critter" ? (
            <m.fieldset
              key="color"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
            >
              <legend className="mb-2 font-semibold text-sm">
                {t("color")}
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {swatches.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={c === color}
                    aria-label={t("colorN", { n: i + 1 })}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "flex size-[34px] items-center justify-center rounded-pill text-on-avatar shadow-[0_0_0_1px_var(--line)] transition-shadow duration-200",
                      c === color &&
                        "shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--sky)]",
                    )}
                  >
                    {c === color ? (
                      <Check className="size-4" strokeWidth={2.25} />
                    ) : null}
                  </button>
                ))}
              </div>
            </m.fieldset>
          ) : null}
        </AnimatePresence>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={pending || !canSave}
          className="self-start"
        >
          {t("save")}
        </Button>
      </m.form>

      <Preview name={trimmed} avatar={preview} guestNumber={me.guestNumber} />
    </div>
  );
}

function Tile({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 bg-surface px-3 py-4 font-semibold text-sm transition-[border-color,transform] duration-200 ease-soft hover:-translate-y-px",
        pressed ? "border-sky" : "border-transparent",
      )}
    >
      {children}
      <span className="text-center">{label}</span>
    </button>
  );
}

/** How the chosen name and avatar show up in a list and in the player strip, next to a guest. */
function Preview({
  name,
  avatar,
  guestNumber,
}: {
  name: string;
  avatar: AvatarData;
  guestNumber: number;
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const display = useDisplayName();
  const shown = name || display({ isGuest: true, name: null, guestNumber });
  return (
    <aside className="flex flex-col gap-4 rounded-xl bg-surface p-6">
      <h2 className="font-semibold text-xl">{t("preview")}</h2>
      <div className="flex items-center gap-3">
        <Avatar avatar={avatar} isGuest={false} name={shown} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{shown}</span>
          <span className="font-medium text-[13px] text-ink-muted">
            {t("account")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-lg bg-sunken p-2 pl-2.5">
        <Avatar avatar={avatar} isGuest={false} name={shown} size={32} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-sm">
            {tc("youSuffix", { name: shown })}
          </span>
          <span className="font-medium text-[12px] text-ink-muted">
            {t("asking")}
          </span>
        </div>
        <span className="flex h-12 w-10 items-center justify-center rounded-md bg-sky-soft font-bold font-display text-sky text-xl">
          ?
        </span>
      </div>
      <hr className="border-line" />
      <div className="flex items-center gap-3">
        <Avatar
          avatar={{ kind: "critter", seed: "27", color: "#BFE3EA" }}
          isGuest
          name={null}
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">
            {display({ isGuest: true, name: null, guestNumber: 27 })}
          </span>
          <span className="font-medium text-[13px] text-ink-muted">
            {t("guestNote")}
          </span>
        </div>
      </div>
      <p className="font-medium text-[13px] text-ink-muted">{t("guestRule")}</p>
    </aside>
  );
}
