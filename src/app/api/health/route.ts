import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    return NextResponse.json({
      status: "healthy",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "unhealthy", db: "disconnected", error: String(err) },
      { status: 503 }
    );
  }
}
