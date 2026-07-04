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
  const baseDN = process.env.LDAP_BASE_DN;
  const serviceUser = process.env.LDAP_SERVICE_USER ?? "";
  const servicePass = process.env.LDAP_SERVICE_PASS ?? "";

  if (!url || !baseDN) {
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

    const entries: Array<{ dn: string; sAMAccountName: string; nombre: string; mail: string }> = [];
    await new Promise((resolve, reject) => {
      const results: Array<{ dn: string; sAMAccountName: string; nombre: string; mail: string }> = [];
      client.search(baseDN, { scope: "sub", filter: "(&(objectCategory=person)(objectClass=user))", sizeLimit: 1000, timeLimit: 30 }, (err: Error | null, res: any) => {
        if (err && (err as any).lde_message !== "Size Limit Exceeded") return reject(err);
        res.on("searchEntry", (entry: any) => {
          const attrs = entry.attributes;
          const get = (name: string) => attrs.find((a: any) => a.type?.toLowerCase() === name.toLowerCase())?.values?.[0];
          results.push({
            dn: entry.dn.toString(),
            sAMAccountName: get("sAMAccountName") ?? "",
            nombre: get("displayName") ?? get("cn") ?? "",
            mail: get("mail") ?? "",
          });
        });
        res.on("end", () => resolve(results));
        res.on("error", (e: any) => {
          if (e.lde_message === "Size Limit Exceeded") resolve(results);
          else reject(e);
        });
      });
    }).then((r) => { entries.push(...(r as any[])); });
    console.log(`LDAP sync: ${entries.length} usuarios encontrados`);

    let creados = 0; let actualizados = 0;

    for (const entry of entries) {
      const parts = entry.dn.split(",");
      let subou = "";
      for (const p of parts) {
        if (p.trim().toUpperCase().startsWith("OU=")) {
          subou = p.trim().slice(3);
          break;
        }
      }

      // Find agency by subou
      const agencias = await query<{ id: number }>(
        "SELECT id FROM lg_agencias WHERE subou_ldap = @subou AND activa = 1",
        { subou }
      );

      if (agencias.length === 0) continue;

      // Upsert user
      const existing = await query<{ id: number }>(
        "SELECT id FROM lg_usuarios WHERE ldap_sam = @sam",
        { sam: entry.sAMAccountName }
      );

      if (existing.length > 0) {
        await execute(
          `UPDATE lg_usuarios SET nombre = @nombre, email = @mail, activo = 1, ultimo_sync = GETUTCDATE(), actualizado = GETUTCDATE()
           WHERE id = @id`,
          { id: existing[0]!.id, nombre: entry.nombre, mail: entry.mail }
        );
        actualizados++;
      } else {
        await execute(
          `INSERT INTO lg_usuarios (ldap_sam, nombre, email, agencia_id, rol, activo, ultimo_sync)
           VALUES (@sam, @nombre, @mail, @agenciaId, 'agent', 1, GETUTCDATE())`,
          { sam: entry.sAMAccountName, nombre: entry.nombre, mail: entry.mail, agenciaId: agencias[0]!.id }
        );
        creados++;
      }
    }

    return NextResponse.json({ creados, actualizados, total: entries.length });
  } finally {
    client.unbind(() => {});
  }
}
