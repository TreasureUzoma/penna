import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Penna - Newsletter platform that gets out of your way";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000100",
        backgroundSize: "100px 100px",
        padding: "40px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <img
            src="https://penna.dev/images/logo.png"
            alt="Penna Logo"
            width={50}
            height={50}
          />
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.04em",
            }}
          >
            penna
          </div>
        </div>

        {/* Main Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "24px",
            maxWidth: "900px",
          }}
        >
          <h1
            style={{
              fontSize: 50,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            the newsletter platform
            <br />
            that gets out of your way
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "800px",
              fontWeight: 500,
            }}
          >
            write, send, and grow your newsletter with subscribers, segments,
            analytics, and your own domain
          </p>
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
