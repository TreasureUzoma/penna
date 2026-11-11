import { Check, X } from "lucide-react";

export const Comparison = () => {
  const features = [
    {
      name: "Clean, feature rich dashboard",
      penna: true,
      buttondown: true,
      mailchimp: true,
    },
    {
      name: "Markdown editor",
      penna: true,
      buttondown: true,
      mailchimp: false,
    },
    {
      name: "Subscriber management",
      penna: true,
      buttondown: true,
      mailchimp: true,
    },
    { name: "Segmentation", penna: true, buttondown: true, mailchimp: true },
    {
      name: "Custom domain",
      penna: true,
      buttondown: false,
      mailchimp: true,
    },
    { name: "Open source", penna: true, buttondown: false, mailchimp: false },
    {
      name: "Self-hostable",
      penna: true,
      buttondown: false,
      mailchimp: false,
    },
    {
      name: "Transparent pricing",
      penna: true,
      buttondown: true,
      mailchimp: false,
    },
    {
      name: "Developer-friendly API",
      penna: true,
      buttondown: false,
      mailchimp: false,
    },
    {
      name: "Webhooks / automation triggers",
      penna: true,
      buttondown: true,
      mailchimp: true,
    },
  ];

  const FeatureIcon = ({ value }: { value: boolean }) =>
    value ? (
      <Check className="w-5 h-5 text-green-600" />
    ) : (
      <X className="w-5 h-5 text-muted-foreground" />
    );

  return (
    <section className="p-4 md:p-5 flex items-center justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why switch to Penna?
          </h2>
          <p className="text-lg text-muted-foreground">
            Built for developers, by developers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">Feature</th>
                <th className="text-center py-3 px-4 font-semibold">Penna</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                  Buttondown
                </th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                  Mailchimp
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr
                  key={feature.name}
                  className={`border-b border-border ${
                    idx % 2 === 0 ? "bg-card/30" : ""
                  }`}
                >
                  <td className="py-3 px-4">{feature.name}</td>
                  <td className="py-3 px-4 text-center">
                    <FeatureIcon value={feature.penna} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <FeatureIcon value={feature.buttondown} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <FeatureIcon value={feature.mailchimp} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Comparison last updated July 2026. Features vary by plan.
        </p>
      </div>
    </section>
  );
};
