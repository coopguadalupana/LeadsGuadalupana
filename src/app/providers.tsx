"use client";

"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prefix = pathname.match(/^\/(leads|agencia)/)?.[1] ?? "leads";
  return <SessionProvider basePath={`/${prefix}/api/auth`}>{children}</SessionProvider>;
}
