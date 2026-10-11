"use client";

import { Screen } from "@/components/ui/screen";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import type { CharacterSheet } from "@/server/community-contract";
import { CharacterSheetBody } from "./character-sheet";

/** A sheet opened anew (a shared link, a reload): a page of its own; `sheet` is the one read with the page. */
export function SheetScreen({
  id,
  sheet,
}: {
  id: string;
  sheet: CharacterSheet | null;
}) {
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <CharacterSheetBody id={id} mode="page" initial={sheet} />
    </Screen>
  );
}
