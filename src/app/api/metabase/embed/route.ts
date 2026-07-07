import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY || "";
const METABASE_INSTANCE_URL = process.env.METABASE_INSTANCE_URL || "http://10.60.81.130:3110";

export async function GET() {
  const payload = {
    resource: { dashboard: 8 },
    params: {},
    exp: Math.round(Date.now() / 1000) + 60 * 10,
  };
  const token = jwt.sign(payload, METABASE_SECRET_KEY);

  return NextResponse.json({
    token,
    instanceUrl: METABASE_INSTANCE_URL,
  });
}
