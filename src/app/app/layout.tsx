import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import Sidebar from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as {
    name?: string | null;
    agencia_id: number;
    rol: string;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userName={user.name ?? ""} rol={user.rol} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
