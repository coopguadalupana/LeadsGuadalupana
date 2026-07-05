import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { canManageUsers, canViewAllConversations } from "@/lib/auth/permissions";
import { query, execute } from "@/lib/db";

export async function GET() {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;

  if (canViewAllConversations(auth.user.rol)) {
    const ads = await query(
      `SELECT a.ad_id, a.campaign_id, a.campaign_name, a.ad_name, a.agency_id, a.es_manual, a.ultima_actualizacion,
              ag.nombre AS agencia_nombre
       FROM lg_ads_cache a
       LEFT JOIN lg_agencias ag ON ag.id = a.agency_id
       ORDER BY a.ultima_actualizacion DESC`
    );
    return NextResponse.json(ads);
  }

  const ads = await query(
    `SELECT a.ad_id, a.campaign_id, a.campaign_name, a.ad_name, a.agency_id, a.es_manual, a.ultima_actualizacion,
            ag.nombre AS agencia_nombre
     FROM lg_ads_cache a
     LEFT JOIN lg_agencias ag ON ag.id = a.agency_id
     WHERE a.agency_id = @agenciaId
     ORDER BY a.ultima_actualizacion DESC`,
    { agenciaId: auth.user.agencia_id }
  );
  return NextResponse.json(ads);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthSession();
  if (!auth.user) return auth.response;
  if (!canManageUsers(auth.user.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ad_id, agency_id, campaign_name } = await req.json();
  if (!ad_id || !agency_id) {
    return NextResponse.json({ error: "ad_id y agency_id requeridos" }, { status: 400 });
  }

  // Upsert: insert or update
  await execute(
    `MERGE lg_ads_cache AS target
     USING (SELECT @adId AS ad_id) AS source
     ON target.ad_id = source.ad_id
     WHEN MATCHED THEN UPDATE SET
       agency_id = @agencyId,
       campaign_name = @campaignName,
       es_manual = 1,
       ultima_actualizacion = GETUTCDATE()
     WHEN NOT MATCHED THEN INSERT (ad_id, campaign_id, campaign_name, agency_id, es_manual)
       VALUES (@adId, '', @campaignName, @agencyId, 1)`,
    {
      adId: ad_id,
      agencyId: Number(agency_id),
      campaignName: campaign_name ?? null,
    }
  );

  return NextResponse.json({ success: true });
}
