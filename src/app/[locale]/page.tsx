import { setRequestLocale } from "next-intl/server";

// Placeholder: the home screen replaces this.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="p-8">
      <h1 className="font-display text-[64px] leading-none font-extrabold">
        Dare
      </h1>
    </main>
  );
}
