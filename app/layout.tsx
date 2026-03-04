import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Psycho Path",
  description: "검열 없이, 죄책감 없이, 즉각 배출.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#000", color: "#fff", fontFamily: "system-ui" }}>
        <AuthProvider>
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              backdropFilter: "blur(10px)",
              background: "rgba(0,0,0,0.35)",
              padding: 12,
              display: "flex",
              gap: 12,
            }}
          >
            <a href="/" style={linkStrong}>
              Psycho Path
            </a>
            <a href="/feed" style={link}>
              피드
            </a>
            <a href="/me" style={link}>
              내 히스토리
            </a>
          </div>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

const linkStrong: React.CSSProperties = { color: "#fff", textDecoration: "none", fontWeight: 900 };
const link: React.CSSProperties = { color: "#fff", textDecoration: "none", opacity: 0.85 };