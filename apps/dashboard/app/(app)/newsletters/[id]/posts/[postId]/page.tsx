"use client";

import { useParams } from "next/navigation";
import { useEmail } from "@/hooks/use-emails";
import { PostEditor } from "@/components/post-editor";
import { Loader2 } from "lucide-react";

export default function EditPostPage(): React.JSX.Element {
  const params = useParams();
  const newsletterId = params.id as string;
  const postId = params.postId as string;

  const { data: email, isLoading } = useEmail(newsletterId, postId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <PostEditor
      newsletterId={newsletterId}
      postId={postId}
      initialData={email}
    />
  );
}
