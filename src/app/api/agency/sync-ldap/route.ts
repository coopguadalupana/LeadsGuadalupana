import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import { query, execute } from "@/lib/db";

export async function POST() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (!canManageUsers(auth.user.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const ldap = await import("ldapjs");
  const url = process.env.LDAP_URL;
  const baseDN = "OU=Gerencia Negocios,DC=guadalupana,DC=com,DC=gt";
  const serviceUser = process.env.LDAP_SERVICE_USER ?? "";
  const servicePass = process.env.LDAP_SERVICE_PASS ?? "";

  if (!url) {
    return NextResponse.json({ error: "LDAP no configurado" }, { status: 500 });
  }

  const client = ldap.default.createClient({ url });
  try {
    await new Promise<void>((resolve, reject) => {
      client.bind(serviceUser, servicePass, (err: Error | null) => {
        if (err) reject(new Error(`LDAP bind: ${err.message}`));
        else resolve();
      });
    });

    // Search all users under Gerencia Negocios
    const usuarios = await new Promise<Array<{ dn: string; sam: string; nombre: string; mail: string; ou: string }>>((resolve, reject) => {
      const items: Array<{ dn: string; sam: string; nombre: string; mail: string; ou: string }> = [];
      client.search(baseDN, {
        scope: "sub",
        filter: "(&(objectCategory=person)(objectClass=user))",
        sizeLimit: 1000,
        timeLimit: 20,
      }, (err: Error | null, res: any) => {
        if (err && (err as any).lde_message !== "Size Limit Exceeded") return reject(err);
        res.on("searchEntry", (entry: any) => {
          const dn = entry.dn.toString();
          const attrs = entry.attributes;
          const get = (name: string) => attrs.find((a: any) => a.type?.toLowerCase() === name.toLowerCase())?.values?.[0];
          // Extract first OU from DN
          const ouMatch = dn.match(/^OU=([^,]+)/);
          items.push({
            dn,
            sam: get("sAMAccountName") ?? "",
            nombre: get("displayName") ?? get("cn") ?? "",
            mail: get("mail") ?? "",
            ou: ouMatch ? ouMatch[1] : "",
          });
        });
        res.on("end", () => resolve(items));
        res.on("error", (e: any) => {
          if (e.lde_message === "Size Limit Exceeded") resolve(items);
          else reject(e);
        });
      });
    });

    let creados = 0;
    let actualizados = 0;

    for (const u of usuarios) {
      if (!u.sam) continue;

      // Find agency by matching OU name
      const agencias = await query<{ id: number }>(
        "SELECT id FROM lg_agencias WHERE activa = 1 AND subou_ldap = @ou",
        { ou: u.ou }
      );

      if (agencias.length === 0) continue;

      const agenciaId = agencias[0]!.id;
      const existing = await query<{ id: number }>(
        "SELECT id FROM lg_usuarios WHERE ldap_sam = @sam",
        { sam: u.sam }
      );

      if (existing.length > 0) {
        await execute(
          `UPDATE lg_usuarios SET nombre = @nombre, email = @mail, activo = 1, ultimo_sync = GETUTCDATE(), actualizado = GETUTCDATE()
           WHERE id = @id`,
          { id: existing[0]!.id, nombre: u.nombre, mail: u.mail }
        );
        actualizados++;
      } else {
        await execute(
          `INSERT INTO lg_usuarios (ldap_sam, nombre, email, agencia_id, rol, activo, ultimo_sync)
           VALUES (@sam, @nombre, @mail, @agenciaId, 'agent', 1, GETUTCDATE())`,
          { sam: u.sam, nombre: u.nombre, mail: u.mail, agenciaId }
        );
        creados++;
      }
    }

    return NextResponse.json({ creados, actualizados, total: usuarios.length });
  } finally {
    client.unbind(() => {});
  }
}
