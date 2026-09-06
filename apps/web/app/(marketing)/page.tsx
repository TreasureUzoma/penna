import { Hero } from "@/components/hero";
import { ProductShowcase } from "@/components/product-showcase";
import { CodeExample } from "@/components/code-example";
import { Comparison } from "@/components/comparison";
import { Pricings } from "@/components/pricings";

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
