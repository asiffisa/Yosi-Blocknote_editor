import type { Metadata } from "next";
import { Inter } from "next/font/google";
// BlockNote CSS - imported here instead of globals.css for Tailwind v4 compatibility
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Yosi - AI Workspace",
    description: "Your AI-powered workspace and browser companion.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
