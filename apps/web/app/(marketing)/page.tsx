import { Hero } from "@/components/hero";
import { ProductShowcase } from "@/components/product-showcase";
import { CodeExample } from "@/components/code-example";
import { Comparison } from "@/components/comparison";
import { Pricings } from "@/components/pricings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Penna - Newsletter platform that gets out of your way",
  description:
    "Write, send, and grow your newsletter with a platform that doesn't fight you. Subscribers, segments, analytics, custom domains, and a real API. Open source alternative to Buttondown.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <div className="space-y-20">
      <Hero />
      <ProductShowcase />
      <CodeExample />
      <Comparison />
      <Pricings />
    </div>
  );
}
