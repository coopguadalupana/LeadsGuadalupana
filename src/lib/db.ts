import sql from "mssql";

let pool: sql.ConnectionPool | null = null;

function env(key: string, def: string): string {
  return process.env[key] ?? def;
}

function envNum(key: string, def: number): number {
  const v = process.env[key];
  return v ? Number(v) : def;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool;

  const server = env("SQL_SERVER", "");
  const user = env("SQL_USER", "");
  const password = env("SQL_PASSWORD", "");
  const database = env("SQL_DB", "");
  const port = envNum("PORTSQL", 1433);

  if (!server || !user || !password || !database) {
    throw new Error("Missing SQL Server env vars: SQL_SERVER, SQL_USER, SQL_PASSWORD, SQL_DB");
  }

  pool = new sql.ConnectionPool({
    server, port, user, password, database,
    options: {
      encrypt: env("SQL_ENCRYPT", "false") === "true",
      trustServerCertificate: env("SQL_TRUST_SERVER", "true") === "true",
    },
    pool: {
      max: envNum("SQL_POOL_MAX", 10),
      min: envNum("SQL_POOL_MIN", 0),
      idleTimeoutMillis: envNum("SQL_POOL_IDLE", 30000),
    },
  });

  pool.on("error", (err) => {
    console.error("SQL Server pool error:", err);
    pool = null;
  });

  await pool.connect();
  return pool;
}

export async function query<T>(
  sqlQuery: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const p = await getPool();
  const request = p.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  const result = await request.query(sqlQuery);
  return result.recordset as T[];
}

export async function execute(
  sqlQuery: string,
  params?: Record<string, unknown>
): Promise<sql.IResult<unknown>> {
  const p = await getPool();
  const request = p.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  return request.query(sqlQuery);
}

export async function closePool(): Promise<void> {
  if (pool?.connected) {
    await pool.close();
    pool = null;
  }
}
