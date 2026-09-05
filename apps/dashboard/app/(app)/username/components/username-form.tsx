"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@workspace/validations";
import type { UpdateProfile } from "@workspace/validations";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@workspace/ui/components/form";
import { useUpdateProfile } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function UsernameForm() {
  const router = useRouter();
  const { mutate, isPending } = useUpdateProfile();

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(values: UpdateProfile) {
    mutate(values, {
      onSuccess: () => {
        router.push("/new");
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="username" {...field} />
              </FormControl>
              <FormDescription>
                This will be used for your project emails (e.g. username@nnewsletter.penna.dev).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Set Username
          </Button>
        </div>
      </form>
    </Form>
  );
}
