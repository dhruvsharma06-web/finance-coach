"use client";
import "./globals.css";
import { ErrorScreen } from "@/components/error-screen";
export default function GlobalError() {
  return (
    <html lang="en">
      <body className="bg-bg">
        <ErrorScreen />
      </body>
    </html>
  );
}
