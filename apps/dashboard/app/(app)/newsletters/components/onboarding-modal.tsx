"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Layout,
  UserPlus,
  Mail,
  X,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import Link from "next/link";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const steps = [
    {
      title: "Create your first newsletter",
      description: "Set up a home for your newsletter or blog.",
      icon: Layout,
      completed: false,
      href: "/new",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Penna! 🎉</DialogTitle>
          <DialogDescription className="text-base">
            We're excited to have you here! Follow these steps to get your
            newsletter up and running in minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {steps.map((step, i) => (
            <Card
              key={i}
              className="group hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => {
                window.location.href = step.href;
              }}
            >
              <CardContent className="p-0">
                <div className="flex items-center p-4 gap-4">
                  <div className="relative">
                    {step.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="p-2.5 bg-muted rounded-lg group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    <step.icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold">Need help?</h3>
              <p className="text-sm text-muted-foreground">
                Check out our documentation for deep dives on every feature.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/docs">Go to Docs</Link>
            </Button>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            I'll do this later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
