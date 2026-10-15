"use client";

import dynamic from "next/dynamic";

// the frame plays the match in the browser only: its clock is the page's
const LabFrame = dynamic(() => import("./lab-frame").then((m) => m.LabFrame), {
  ssr: false,
});

export function LabSeat({ seat }: { seat: number }) {
  return <LabFrame seat={seat} />;
}
