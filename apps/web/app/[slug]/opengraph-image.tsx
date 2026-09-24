import { ImageResponse } from "next/og";
import { getPublicNewsletter } from "@/lib/public-newsletters";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OpenGraphImage({ params }: Props) {
  const { slug } = await params;
  const newsletter = await getPublicNewsletter(slug);

  const name = newsletter?.name ?? slug;
  const description = newsletter?.description ?? "A newsletter on Penna";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000100",
          padding: "40px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "32px",
            maxWidth: "960px",
            width: "100%",
          }}
        >
          {/* Penna branding */}
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
              width={32}
              height={32}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#71717a",
                letterSpacing: "-0.03em",
              }}
            >
              penna
            </div>
          </div>

          {/* Newsletter name */}
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              margin: 0,
              textAlign: "center",
              letterSpacing: "-0.03em",
            }}
          >
            {name}
          </h1>

          {/* Description */}
          {description && (
            <p
              style={{
                fontSize: 28,
                color: "#a1a1aa",
                lineHeight: 1.4,
                margin: 0,
                textAlign: "center",
                maxWidth: "820px",
                fontWeight: 400,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
