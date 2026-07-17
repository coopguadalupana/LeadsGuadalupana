import ldapjs from "ldapjs";

interface LdapUser {
  dn: string;
  sAMAccountName: string;
  userPrincipalName?: string;
  name: string;
  mail?: string;
  subou_agencia: string;
}

function extractSubouAgencia(dn: string): string | null {
  const parts = dn.split(",");
  // Buscar segundo OU: CN=X,OU=Agencia Y,OU=Gerencia Negocios,DC=...
  let ouCount = 0;
  for (const p of parts) {
    if (p.trim().toUpperCase().startsWith("OU=")) {
      ouCount++;
      if (ouCount === 1) return p.trim().slice(3);
    }
  }
  return null;
}

export async function authenticateLDAP(
  username: string,
  password: string
): Promise<LdapUser | null> {
  const url = process.env.LDAP_URL;
  const baseDN = process.env.LDAP_BASE_DN;
  const serviceUser = process.env.LDAP_SERVICE_USER;
  const servicePass = process.env.LDAP_SERVICE_PASS;

  if (!url || !baseDN) {
    throw new Error("Missing LDAP env vars: LDAP_URL, LDAP_BASE_DN");
  }

  const bindUser = serviceUser ?? "";
  const bindPass = servicePass ?? "";

  const client = ldapjs.createClient({ url });

  try {
    await new Promise<void>((resolve, reject) => {
      client.bind(bindUser, bindPass, (err) => {
        if (err) reject(new Error(`LDAP service bind failed: ${err.message}`));
        else resolve();
      });
    });
    console.log(`[LDAP] Service bind OK. Buscando usuario: ${username}`);

    const safeUsername = username.replace(/[\\*()\0]/g, "\\$&");
    const searchDN = `(&(sAMAccountName=${safeUsername})(objectClass=user))`;

    let entries: ldapjs.SearchEntry[] = [];
    try {
      entries = await new Promise((resolve, reject) => {
        const results: ldapjs.SearchEntry[] = [];
        client.search(
          baseDN,
          {
            scope: "sub",
            filter: searchDN,
            attributes: ["sAMAccountName", "userPrincipalName", "displayName", "cn", "mail"],
          },
          (err, res) => {
            if (err) return reject(new Error(`LDAP search failed: ${err.message}`));
            res.on("searchEntry", (entry) => results.push(entry));
            res.on("error", (e) => reject(e));
            res.on("end", () => resolve(results));
          }
        );
      });
    } catch (e) {
      console.error("[LDAP] Error en búsqueda:", e);
      return null;
    }

    if (entries.length === 0) {
      console.warn(`[LDAP] Usuario no encontrado en AD: ${username}`);
      return null;
    }

    const entry = entries[0]!;
    const userDN = entry.dn.toString();
    const attrs = entry.attributes;
    console.log(`[LDAP] Usuario encontrado. DN: ${userDN}`);

    const getAttr = (name: string): string | undefined => {
      try {
        const a = attrs.find((x) => x?.type?.toLowerCase() === name.toLowerCase());
        // .values es la API actual de ldapjs v3 (.vals está deprecado)
        const val = (a as unknown as { values?: unknown[] })?.values?.[0] ?? a?.vals?.[0];
        return val?.toString();
      } catch {
        return undefined;
      }
    };

    const subou = extractSubouAgencia(userDN);

    const sam = getAttr("sAMAccountName") ?? username;

    // Construir dominio desde baseDN: DC=guadalupana,DC=com,DC=gt → guadalupana.com.gt
    const domain = baseDN
      .split(",")
      .filter((p) => p.trim().toUpperCase().startsWith("DC="))
      .map((p) => p.trim().slice(3))
      .join(".");
    const upn = getAttr("userPrincipalName") ?? `${sam}@${domain}`;

    // Bind con UPN (usuario@dominio) en lugar del DN completo.
    // El DN puede contener caracteres especiales (é, ñ, etc.) que ldapjs
    // codifica como bytes raw (\c3\a9), lo cual hace que AD rechace el bind
    // con code=49 aunque la contraseña sea correcta. UPN no tiene este problema.
    try {
      await new Promise<void>((resolve, reject) => {
        const userClient = ldapjs.createClient({ url });
        userClient.bind(upn, password, (err) => {
          userClient.unbind(() => {});
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (e) {
      const err = e as { code?: number; message?: string; dn?: string; name?: string };
      console.error(`[LDAP] Bind falló para ${username} (upn=${upn}) | code=${err.code} | name=${err.name} | message=${err.message}`);
      return null;
    }
    console.log(`[LDAP] Auth OK → sam=${sam} upn=${upn}`);

    return {
      dn: userDN,
      sAMAccountName: sam,
      userPrincipalName: upn,
      name: getAttr("displayName") ?? getAttr("cn") ?? username,
      mail: getAttr("mail"),
      subou_agencia: subou ?? "",
    };
  } finally {
    client.unbind(() => {});
  }
  return null;
}
