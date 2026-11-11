"use client";

import { BookOpen, Code, Terminal, Zap, Shield, Globe } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export default function DocsPage() {
  const sections = [
    {
      title: "Getting Started",
      description:
        "Learn the basics of Penna and how to set up your first newsletter.",
      icon: Zap,
      link: "#",
    },
    {
      title: "API Reference",
      description: "Detailed documentation for our REST API endpoints.",
      icon: Terminal,
      link: "#",
    },
    {
      title: "MCP server",
      description: "Connect an MCP-compatible assistant to your Penna dashboard using secure Penna sign-in.",
      icon: Terminal,
      link: "#mcp",
    },
    {
      title: "SDKs & Libraries",
      description:
        "Integrate Penna into your app using our official libraries.",
      icon: Code,
      link: "#",
    },
    {
      title: "Webhooks",
      description: "Listen for subscriber events in real-time.",
      icon: Globe,
      link: "#",
    },
    {
      title: "Custom Domains",
      description: "Set up your own domain for links and sub-pages.",
      icon: BookOpen,
      link: "#",
    },
    {
      title: "Security",
      description: "Best practices for keeping your newsletter and data secure.",
      icon: Shield,
      link: "#",
    },
  ];

  return (
    <div className="container max-w-5xl py-10 space-y-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground text-lg max-w-2xl text-balance">
          Everything you need to build, manage, and scale your newsletters with
          Penna.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section, i) => (
          <Card
            key={i}
            className="hover:border-primary/50 transition-colors group"
          >
            <CardHeader>
              <div className="mb-4 p-3 bg-muted rounded-xl w-fit group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                <section.icon className="w-6 h-6" />
              </div>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription className="text-balance leading-relaxed">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="link"
                className="p-0 h-auto group-hover:text-primary"
                asChild
              >
                <Link href={section.link}>Read more &rarr;</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted/50 rounded-2xl p-8 border">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="p-5 bg-background rounded-2xl shadow-sm border">
            <pre className="text-xs font-mono">
              <code>{`curl -X POST https://api.penna.dev/v1/subscribers \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "email": "customer@example.com",
    "name": "Jane Doe"
  }'`}</code>
            </pre>
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h2 className="text-2xl font-bold">Try the API</h2>
            <p className="text-muted-foreground">
              Our API is designed to be simple and powerful. Get your API key in
              newsletter settings and start building today.
            </p>
            <Button asChild>
              <Link href="/newsletters">Get API Key</Link>
            </Button>
          </div>
        </div>
      </div>

      <section id="mcp" className="scroll-mt-8 rounded-2xl border bg-muted/50 p-8 space-y-4">
        <h2 className="text-2xl font-bold">Connect an MCP client</h2>
        <p className="max-w-2xl text-muted-foreground">
          Penna's hosted MCP server lets compatible AI tools read and manage your dashboard after you sign in and approve access. Your team and newsletter permissions apply to every action.
        </p>
        <div className="rounded-lg border bg-background p-4 font-mono text-sm">https://api.penna.dev/api/v1/mcp</div>
        <p className="text-sm text-muted-foreground">Add this URL to your MCP client, choose OAuth sign-in, then review the access request in your Penna account. The <code>penna_change</code> tool can make lasting edits and send email, so review those actions carefully.</p>
        <Button asChild variant="outline"><Link href="https://penna.dev/docs/integrations/mcp">Read the MCP setup guide</Link></Button>
      </section>
    </div>
  );
}
