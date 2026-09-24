import { ImageResponse } from "next/og";
import { getPublicNewsletter, getPublicPost } from "@/lib/public-newsletters";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string; postId: string }>;
}

export default async function OpenGraphImage({ params }: Props) {
  const { slug, postId } = await params;
  const [newsletter, post] = await Promise.all([
    getPublicNewsletter(slug),
    getPublicPost(slug, postId),
  ]);

  const newsletterName = newsletter?.name ?? slug;
  const subject = post?.subject ?? "Untitled";

  // Truncate long subjects so they don't overflow the image
  const displaySubject =
    subject.length > 80 ? subject.slice(0, 77) + "…" : subject;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#000100",
          padding: "56px 80px",
        }}
      >
        {/* Post subject — main content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: displaySubject.length > 50 ? 52 : 64,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-0.03em",
              maxWidth: "960px",
            }}
          >
            {displaySubject}
          </h1>
        </div>

        {/* Footer — newsletter name + Penna branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid #27272a",
            paddingTop: "28px",
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "#a1a1aa",
              letterSpacing: "-0.01em",
            }}
          >
            {newsletterName}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <img
              src="https://penna.dev/images/logo.png"
              alt="Penna Logo"
              width={28}
              height={28}
            />
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#52525b",
                letterSpacing: "-0.03em",
              }}
            >
              penna
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
