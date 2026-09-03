import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Myanify" },
};

export default function ListenerHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
