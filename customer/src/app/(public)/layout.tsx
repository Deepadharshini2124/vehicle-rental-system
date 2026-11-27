import type { ReactNode } from "react";

import PublicLayout from "@/components/PublicLayout";

export default function PublicPagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PublicLayout>
      {children}
    </PublicLayout>
  );
}