"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import api from "@workspace/axios";

export function OAuthConsent() {
  const params = useSearchParams();
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const responseType = params.get("response_type") ?? "";
  const scope = params.get("scope") ?? "penna:dashboard";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "";
  const serverChallenge = params.get("code_challenge") ?? "";
  const client = useQuery({
    queryKey: ["oauth-client", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => (await api.get(`/oauth/client/${encodeURIComponent(clientId)}`)).data as { client_name: string },
  });
  const approve = useMutation({
    mutationFn: async (approved: boolean) => {
      const result = await api.post(`/oauth/authorize/${approved ? "approve" : "deny"}`, {
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        response_type: responseType,
        scope,
        code_challenge: approved ? serverChallenge : undefined,
        code_challenge_method: approved ? codeChallengeMethod : undefined,
      });
      return result.data as { redirect: string };
    },
    onSuccess: ({ redirect }) => { window.location.assign(redirect); },
  });
  const returnToLogin = `/login?next=${encodeURIComponent(`/oauth/authorize?${params.toString()}`)}`;

  if (!clientId || !redirectUri || !serverChallenge || codeChallengeMethod !== "S256" || responseType !== "code" || scope !== "penna:dashboard") return <ConsentPanel><h1 className="text-xl font-semibold">Invalid authorization request</h1><p className="mt-3 text-sm text-muted-foreground">The client request is missing required security details. Reconnect from your MCP client.</p></ConsentPanel>;
  if (client.isLoading) return <ConsentPanel><p className="text-sm text-muted-foreground">Loading connection details…</p></ConsentPanel>;
  if (client.isError || !client.data) return <ConsentPanel><h1 className="text-xl font-semibold">Unknown MCP client</h1><p className="mt-3 text-sm text-muted-foreground">This client registration is invalid or has expired.</p></ConsentPanel>;

  return <ConsentPanel>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Penna account access</p>
    <h1 className="mt-3 text-2xl font-semibold">Connect {client.data.client_name}?</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">This MCP client will be able to read and make changes to your Penna dashboard. Every request uses your account permissions. You can revoke access by disconnecting the client.</p>
    <div className="mt-6 flex flex-col gap-3 rounded-lg border p-4 text-sm"><span>Read newsletter, subscriber, email, team, domain, and analytics data</span><span>Create, edit, or delete dashboard items, including sending emails</span></div>
    <p className="mt-4 text-sm">Please <a className="underline" href={returnToLogin}>sign in</a> to continue.</p>
    <div className="mt-7 flex gap-3">
      <button className="flex-1 rounded-md border px-4 py-2 text-sm" onClick={() => approve.mutate(false)} disabled={approve.isPending}>Deny</button>
      <button className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => approve.mutate(true)} disabled={approve.isPending}>{approve.isPending ? "Connecting…" : "Allow access"}</button>
    </div>
    {approve.isError && <p role="alert" className="mt-3 text-sm text-destructive">{approve.error.message}</p>}
  </ConsentPanel>;
}

function ConsentPanel({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-lg px-6 py-16"><div className="rounded-xl border bg-background p-7 shadow-sm">{children}</div></main>;
}
