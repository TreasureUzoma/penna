import { codeToHtml } from "shiki";

export const CodeExample = async () => {
  const codeString = `const response = await fetch(
  'https://api.penna.dev/api/v1/external/newsletters/subscribers',
  {
    headers: {
      'x-penna-public-key': 'penn_your_public_key',
      'x-penna-private-key': 'pk_your_private_key',
    },
  }
);

const subscribers = await response.json();

await fetch(
  'https://api.penna.dev/api/v1/external/newsletters/send',
  {
    method: 'POST',
    headers: {
      'x-penna-public-key': 'penn_your_public_key',
      'x-penna-private-key': 'pk_your_private_key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: 'Weekly Update',
      content: '# Hello subscribers',
      recipientEmails: ['user@example.com'],
    }),
  }
);`;

  const highlightedHtml = await codeToHtml(codeString, {
    lang: "javascript",
    theme: "one-dark-pro",
  });

  return (
    <section className="p-4 md:p-5 flex items-center justify-center">
      <div className="max-w-3xl w-full space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">
            built for developers
          </h2>
          <p className="text-lg text-muted-foreground">
            manage subscribers and send newsletters via a simple REST API.
          </p>
        </div>

        <div className="relative rounded-xl border border-neutral-800 bg-neutral-900 subpixel-antialiased overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-mono text-zinc-400">
            <span>javascript</span>
          </div>
          <div
            className="overflow-x-auto p-5 font-mono text-sm leading-relaxed [&>pre]:!bg-transparent [&>pre]:p-0"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          full api reference in the{" "}
          <a href="/docs" className="underline hover:text-foreground">
            docs
          </a>
          .
        </p>
      </div>
    </section>
  );
};
