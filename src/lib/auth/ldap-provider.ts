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

    const safeUsername = username.replace(/[\\*()\0]/g, "\\$&");
    const searchDN = `(&(sAMAccountName=${safeUsername})(objectClass=user))`;

    const entries: ldapjs.SearchEntry[] = await new Promise((resolve, reject) => {
      const results: ldapjs.SearchEntry[] = [];
      client.search(baseDN, { scope: "sub", filter: searchDN }, (err, res) => {
        if (err) return reject(new Error(`LDAP search failed: ${err.message}`));
        res.on("searchEntry", (entry) => results.push(entry));
        res.on("error", (e) => reject(e));
        res.on("end", () => resolve(results));
      });
    });

    if (entries.length === 0) return null;

    const entry = entries[0]!;
    const userDN = entry.dn.toString();
    const attrs = entry.attributes;

    const getAttr = (name: string): string | undefined => {
      const a = attrs.find((x) => x.type.toLowerCase() === name.toLowerCase());
      return a?.vals?.[0]?.toString();
    };

    const subou = extractSubouAgencia(userDN);

    await new Promise<void>((resolve, reject) => {
      const userClient = ldapjs.createClient({ url });
      userClient.bind(userDN, password, (err) => {
        userClient.unbind(() => {});
        if (err) reject(new Error("Credenciales invalidas"));
        else resolve();
      });
    });

    return {
      dn: userDN,
      sAMAccountName: getAttr("sAMAccountName") ?? username,
      userPrincipalName: getAttr("userPrincipalName"),
      name: getAttr("displayName") ?? getAttr("cn") ?? username,
      mail: getAttr("mail"),
      subou_agencia: subou ?? "",
    };
  } finally {
    client.unbind(() => {});
  }
}
