"use client";

import { useParams } from "next/navigation";
import { PostEditor } from "@/components/post-editor";

export default function NewPostPage(): React.JSX.Element {
  const params = useParams();
  const newsletterId = params.id as string;

  return <PostEditor newsletterId={newsletterId} />;
}
