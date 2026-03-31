import "./globals.css";
import {type ReactNode} from "react";
import AppProviders from "../components/layout/AppProviders";
import NavBar from "../components/layout/NavBar";

export default async function RootLayout({children}: { children: ReactNode }) {
  return (
    <html lang="en">
    <body>
    <AppProviders>
          <AppChrome>{children}</AppChrome>
    </AppProviders>
    </body>
    </html>
  );
}

function AppChrome({children}: { children: ReactNode }) {
  return (
    <>
      <NavBar/>
      <div className="app-shell">
        <main className="app-main">{children}</main>
      </div>
    </>
  );
}
