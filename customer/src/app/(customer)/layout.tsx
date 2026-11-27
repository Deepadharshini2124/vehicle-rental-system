import CustomerLayout from "@/components/CustomerLayout";

export default function CustomerPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerLayout>{children}</CustomerLayout>;
}