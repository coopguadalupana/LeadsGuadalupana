import sql from "mssql";

interface DbConfig {
  server: string;
  user: string;
  password: string;
  database: string;
  options?: sql.config["options"];
}

let pool: sql.ConnectionPool | null = null;

function getConfig(): DbConfig {
  const server = process.env.SQL_SERVER;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB;

  if (!server || !user || !password || !database) {
    throw new Error(
      "Missing SQL Server env vars: SQL_SERVER, SQL_USER, SQL_PASSWORD, SQL_DB"
    );
  }

  return { server, user, password, database };
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool;

  const cfg = getConfig();

  pool = new sql.ConnectionPool({
    server: cfg.server,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      ...cfg.options,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
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
