"use client";

import dynamic from "next/dynamic";

// the scene plays in the browser only: its clock is the tab's
const Frame = dynamic(() => import("./scene-frame").then((m) => m.SceneFrame), {
  ssr: false,
});

export function SceneSeat() {
  return <Frame />;
}
