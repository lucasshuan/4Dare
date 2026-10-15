import type { Metadata } from "next";
import { LibraryScreen } from "@/features/admin/library/library-screen";
import { dataMap, libraryPage, pendingPictures } from "@/server/admin/library";
import { adminPage } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Biblioteca" };

/** The library: characters, pictures waiting on a look, the data map. */
export default async function AdminLibraryPage() {
  await adminPage();
  const [first, pending, counts] = await Promise.all([
    libraryPage({ q: "", taste: null, sort: "top", offset: 0 }),
    pendingPictures(),
    dataMap(),
  ]);
  return <LibraryScreen first={first} pending={pending} counts={counts} />;
}
