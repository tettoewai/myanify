import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Myanify" },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ListenerHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
