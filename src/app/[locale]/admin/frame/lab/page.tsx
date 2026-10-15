import { LabSeat } from "@/features/lab/lab-seat";

/** One seat's screen of the lab's match, bare, for the lab's iframe. */
export default async function LabFramePage({
  searchParams,
}: PageProps<"/[locale]/admin/frame/lab">) {
  const { seat } = await searchParams;
  const n = Number(typeof seat === "string" ? seat : 0);
  return <LabSeat seat={Number.isInteger(n) && n >= 0 ? n : 0} />;
}
