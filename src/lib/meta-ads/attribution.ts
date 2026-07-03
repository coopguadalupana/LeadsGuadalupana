import { getAdData, getCampaignData } from "@/lib/meta-ads/graph-api";
import { query, execute } from "@/lib/db";

interface AttributionResult {
  ad_id: string;
  ad_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  agency_id: number | null;
}

export async function getAdAttribution(adId: string): Promise<AttributionResult | null> {
  if (!adId) return null;

  // Intentar cache primero
  const cached = await query<{
    ad_id: string;
    campaign_id: string;
    campaign_name: string | null;
    ad_name: string | null;
    agency_id: number | null;
  }>(
    `SELECT ad_id, campaign_id, campaign_name, ad_name, agency_id
     FROM lg_ads_cache WHERE ad_id = @adId`,
    { adId }
  );

  if (cached.length > 0) {
    return {
      ad_id: cached[0]!.ad_id,
      ad_name: cached[0]!.ad_name,
      campaign_id: cached[0]!.campaign_id,
      campaign_name: cached[0]!.campaign_name,
      agency_id: cached[0]!.agency_id,
    };
  }

  try {
    // Consultar Graph API
    const ad = await getAdData(adId);
    const campaignId = ad.campaign_id ?? null;
    let campaignName: string | null = null;
    let agencyId: number | null = null;

    if (campaignId) {
      const campaign = await getCampaignData(campaignId);
      campaignName = campaign.name ?? null;

      // Mapear campaign -> agency por nombre
      agencyId = await mapCampaignToAgency(campaignName);
    }

    // Guardar en cache
    await execute(
      `INSERT INTO lg_ads_cache (ad_id, campaign_id, campaign_name, ad_name, agency_id)
       VALUES (@adId, @campaignId, @campaignName, @adName, @agencyId)`,
      {
        adId,
        campaignId: campaignId ?? "",
        campaignName,
        adName: ad.name ?? null,
        agencyId,
      }
    );

    return {
      ad_id: adId,
      ad_name: ad.name ?? null,
      campaign_id: campaignId,
      campaign_name: campaignName,
      agency_id: agencyId,
    };
  } catch (err) {
    console.error(`Ad attribution failed for ${adId}:`, err);
    return null;
  }
}

async function mapCampaignToAgency(campaignName: string | null): Promise<number | null> {
  if (!campaignName) return null;

  // Intentar match por nombre de campana vs subou_ldap de agencia
  const agencias = await query<{ id: number }>(
    `SELECT id FROM lg_agencias
     WHERE @campaignName LIKE '%' + subou_ldap + '%' AND activa = 1`,
    { campaignName }
  );

  if (agencias.length > 0) return agencias[0]!.id;

  return null;
}
