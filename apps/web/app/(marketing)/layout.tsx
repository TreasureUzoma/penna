import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/** Header + footer for the actual marketing site (home, about, contact, privacy, terms) — see the note in app/layout.tsx on why these aren't in the root layout. */
export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
