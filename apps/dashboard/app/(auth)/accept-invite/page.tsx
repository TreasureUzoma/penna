import { Metadata } from "next";
import { AcceptInviteForm } from "../components/accept-invite-form";

export const metadata: Metadata = {
  title: "Accept Invite - Penna",
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const token = (await searchParams).token;
  return (
    <div className="flex min-h-screen md:min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        <AcceptInviteForm token={token} />
      </div>
    </div>
  );
}
