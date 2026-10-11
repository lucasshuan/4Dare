"use client";

import { Screen } from "@/components/ui/screen";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { CharacterSheetBody } from "./character-sheet";

/** A sheet opened anew (a shared link, a reload): a page of its own. */
export function SheetScreen({ id }: { id: string }) {
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <CharacterSheetBody id={id} mode="page" />
    </Screen>
  );
}
