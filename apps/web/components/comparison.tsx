import { Check, X } from "lucide-react";

export const Comparison = () => {
  const features = [
    {
      name: "clean, full-featured dashboard",
      penna: true,
      buttondown: true,
      mailchimp: true,
    },
    {
      name: "markdown editor",
      penna: true,
      buttondown: true,
      mailchimp: false,
    },
    {
      name: "subscriber management",
      penna: true,
      buttondown: true,
      mailchimp: true,
    },
    { name: "segmentation", penna: true, buttondown: true, mailchimp: true },
    {
      name: "custom domain",
      penna: true,
      buttondown: false,
      mailchimp: true,
    },
    { name: "open source", penna: true, buttondown: false, mailchimp: false },
    {
      name: "self-hostable",
      penna: true,
      buttondown: false,
      mailchimp: false,
    },
    {
      name: "transparent pricing",
      penna: true,
      buttondown: true,
      mailchimp: false,
    },
    {
      name: "developer-friendly API",
      penna: true,
      buttondown: false,
      mailchimp: false,
    },
    { name: "webhooks", penna: true, buttondown: false, mailchimp: true },
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
            why switch to penna?
          </h2>
          <p className="text-lg text-muted-foreground">
            built for developers. by developers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">feature</th>
                <th className="text-center py-3 px-4 font-semibold">penna</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                  buttondown
                </th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                  mailchimp
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
          comparison last updated july 2026. features vary by plan.
        </p>
      </div>
    </section>
  );
};
