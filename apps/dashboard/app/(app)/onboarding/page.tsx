"use client";

import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Rocket,
  UserPlus,
  Mail,
  Layout,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

export default function OnboardingPage() {
  const steps = [
    {
      title: "Create your first newsletter",
      description: "Set up a home for your newsletter or blog.",
      icon: Layout,
      completed: true, // Assuming if they are here, they might have one or we show how
      href: "/newsletters/new",
    },
    {
      title: "Add your first subscriber",
      description: "Import existing contacts or add them manually.",
      icon: UserPlus,
      completed: false,
      href: "/newsletters",
    },
    {
      title: "Send your first post",
      description: "Write something amazing and share it with the world.",
      icon: Mail,
      completed: false,
      href: "/newsletters",
    },
  ];

  return (
    <div className="container max-w-3xl py-10 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Penna
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          We're excited to have you here! Follow these steps to get your
          newsletter up and running in minutes.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <Card
            key={i}
            className="group hover:border-primary/50 transition-colors"
          >
            <CardContent className="p-0">
              <Link href={step.href} className="flex items-center p-6 gap-6">
                <div className="relative">
                  {step.completed ? (
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  ) : (
                    <Circle className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                  <step.icon className="w-6 h-6" />
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-8 flex items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-bold text-xl">Need help?</h3>
            <p className="text-muted-foreground">
              Check out our documentation for deep dives on every feature.
            </p>
          </div>
          <Button asChild>
            <Link href="/docs">Go to Docs</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
