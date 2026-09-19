import { meta } from "@workspace/constants/meta";
import { faqs } from "@workspace/constants/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { FaqAi } from "./faq-ai";

export default function Faq() {
  return (
    <section className="w-full max-w-3xl mx-auto p-4 md:py-5 space-y-8">
      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2 flex flex-col gap-4">
          <h3 className="text-3xl md:text-4xl font-bold text-balance">FAQs</h3>
          <p className="text-lg text-muted-foreground text-balance">
            we answered the most asked questions, you can ask {meta.name} ai
            about any other questions
          </p>
        </div>

        <div className="md:col-span-3">
          {faqs.map((faq, idx) => (
            <Accordion key={idx} type="single" collapsible>
              <AccordionItem value={`item-${idx}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}

          <Accordion type="single" collapsible>
            <AccordionItem value="ai-faq">
              <FaqAi />
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
}
