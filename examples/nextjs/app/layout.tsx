import { WhatsNew } from "@sweberdev/derivative-react";
import type { ReactNode } from "react";

export const metadata = { title: "Acme" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ display: "flex", justifyContent: "space-between", padding: "1rem" }}>
          <strong>Acme</strong>
          {/* The package is a client component, so it works in a server layout. */}
          <WhatsNew src="/changelog.json" announce search />
        </header>
        <main style={{ padding: "1rem" }}>{children}</main>
      </body>
    </html>
  );
}
