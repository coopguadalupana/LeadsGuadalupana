import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import { query, execute } from "@/lib/db";

export async function POST() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (!await canManageUsers(auth.user.rol_id)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const ldap = await import("ldapjs");
  const url = process.env.LDAP_URL;
  const baseDN = process.env.LDAP_BASE_DN ?? "OU=Gerencia Negocios,DC=guadalupana,DC=com,DC=gt";
  const serviceUser = process.env.LDAP_SERVICE_USER ?? "";
  const servicePass = process.env.LDAP_SERVICE_PASS ?? "";

  if (!url) {
    return NextResponse.json({ error: "LDAP no configurado" }, { status: 500 });
  }

  // 1. LDAP search
  const client = ldap.default.createClient({ url });
  let usuariosLDAP: Array<{ sam: string; nombre: string; mail: string; ou: string }> = [];

  try {
    await new Promise<void>((resolve, reject) => {
      client.bind(serviceUser, servicePass, (err: Error | null) => {
        if (err) reject(new Error(`LDAP bind: ${err.message}`));
        else resolve();
      });
    });

    usuariosLDAP = await new Promise((resolve, reject) => {
      const items: Array<{ sam: string; nombre: string; mail: string; ou: string }> = [];
      client.search(baseDN, {
        scope: "sub",
        filter: "(&(objectCategory=person)(objectClass=user)(sAMAccountName=*))",
        sizeLimit: 500,
        timeLimit: 15,
      }, (err: Error | null, res: any) => {
        if (err && (err as any).lde_message !== "Size Limit Exceeded") return reject(err);
        res.on("searchEntry", (entry: any) => {
          const dn = entry.dn.toString();
          const get = (name: string) => entry.attributes.find((a: any) => a.type?.toLowerCase() === name.toLowerCase())?.values?.[0];
          const ouMatch = dn.match(/^OU=([^,]+)/);
          items.push({
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
  } finally {
    client.unbind(() => {});
  }

  // 2. Get all existing users + agencies in bulk
  const [existingUsers, agencias] = await Promise.all([
    query<{ id: number; ldap_sam: string }>("SELECT id, ldap_sam FROM lg_usuarios"),
    query<{ id: number; subou_ldap: string; rol_default_sync: string }>(
      "SELECT id, subou_ldap, COALESCE(rol_default_sync, 'agent') as rol_default_sync FROM lg_agencias WHERE activa = 1"
    ),
  ]);

  const existingMap = new Map(existingUsers.map((u) => [u.ldap_sam, u.id]));
  const agenciaMap = new Map(agencias.map((a) => [a.subou_ldap, a]));
  const defaultRol = new Map(agencias.map((a) => [a.id, a.rol_default_sync]));

  let creados = 0;
  let actualizados = 0;

  // 3. Process in bulk: collect updates and inserts
  const updates: Array<{ id: number; nombre: string; mail: string }> = [];
  const inserts: Array<{ sam: string; nombre: string; mail: string; agenciaId: number; rol: string }> = [];

  for (const u of usuariosLDAP) {
    if (!u.sam) continue;
    const a = agenciaMap.get(u.ou);
    if (!a) continue;

    const existingId = existingMap.get(u.sam);
    if (existingId !== undefined) {
      updates.push({ id: existingId, nombre: u.nombre, mail: u.mail });
    } else {
      inserts.push({ sam: u.sam, nombre: u.nombre, mail: u.mail, agenciaId: a.id, rol: a.rol_default_sync });
    }
  }

  // 4. Parallel updates and inserts
  const batchSize = 50;
  const updateBatches = [];
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    updateBatches.push(Promise.all(batch.map((u) =>
      execute(
        `UPDATE lg_usuarios SET nombre = @nombre, mail = @mail, ultimo_sync = GETUTCDATE(), actualizado = GETUTCDATE() WHERE id = @id`,
        { id: u.id, nombre: u.nombre, mail: u.mail ?? null }
      )
    )));
  }
  const updateResults = await Promise.all(updateBatches);
  actualizados = updates.length;

  const insertBatches = [];
  for (let i = 0; i < inserts.length; i += batchSize) {
    const batch = inserts.slice(i, i + batchSize);
    insertBatches.push(Promise.all(batch.map((u) =>
      execute(
        `INSERT INTO lg_usuarios (ldap_sam, nombre, email, agencia_id, rol, activo, ultimo_sync)
         VALUES (@sam, @nombre, @mail, @agenciaId, @rol, 1, GETUTCDATE())`,
        { sam: u.sam, nombre: u.nombre, mail: u.mail ?? null, agenciaId: u.agenciaId, rol: u.rol }
      )
    )));
  }
  const insertResults = await Promise.all(insertBatches);
  creados = inserts.length;

  return NextResponse.json({ creados, actualizados, total: usuariosLDAP.length });
}
