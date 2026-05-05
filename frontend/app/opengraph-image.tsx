import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VorzaIQ — AI Recruitment Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#fff",
            marginBottom: 16,
          }}
        >
          VorzaIQ
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 500,
          }}
        >
          AI Recruitment Platform voor MKB
        </div>
      </div>
    ),
    { ...size }
  );
}
