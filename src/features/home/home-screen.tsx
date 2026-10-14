"use client";

import { Screen } from "@/components/ui/screen";
import type { HomeData } from "@/server/home";
import { HomeHero } from "./hero/home-hero";
import { HubActions, HubBrand } from "./hub-actions";
import { Community } from "./sections/community";
import { FinalCall } from "./sections/final-call";
import { OpenRooms } from "./sections/open-rooms";
import { Ribbon } from "./sections/ribbon";
import { useAuthErrorToast } from "./use-auth-error";

/**
 * The home: the stage (who's up for which game, the way in, the game on
 * show), the ribbon of what the community just did, the open rooms, the
 * community's rails, and a last call to play.
 */
export function HomeScreen({ data }: { data: HomeData }) {
  useAuthErrorToast();
  return (
    <Screen
      left={<HubBrand />}
      right={<HubActions />}
      stage="brand"
      banner={
        <>
          <HomeHero />
          <Ribbon moments={data.moments} leaders={data.ranks.all} />
        </>
      }
    >
      <OpenRooms />
      <Community data={data} />
      <FinalCall />
    </Screen>
  );
}
