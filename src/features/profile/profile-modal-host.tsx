"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { closeProfile, useOpenProfile } from "./open-profile";

// loaded the first time a profile opens
const ProfileModal = dynamic(() =>
  import("./profile-modal").then((m) => m.ProfileModal),
);

/** Where the profile modal opens: once, for every page. Going to another page closes it. */
export function ProfileModalHost() {
  const handle = useOpenProfile();
  const path = usePathname();
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new path is the trigger
  useEffect(() => closeProfile(), [path]);
  return handle ? <ProfileModal key={handle} handle={handle} /> : null;
}
