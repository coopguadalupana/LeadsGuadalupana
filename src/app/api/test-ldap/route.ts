import { authenticateLDAP } from "@/lib/auth/ldap-provider";

export async function GET() {
  try {
    const result = await authenticateLDAP("pgssantisteban", "octubre.2024");
    if (!result) return Response.json({ error: "LDAP auth returned null" }, { status: 401 });
    return Response.json({ user: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
