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

  // Buscar en cache (incluye entradas manuales y de API)
  const cached = await query<{
    ad_id: string;
    campaign_id: string;
    campaign_name: string | null;
    ad_name: string | null;
    agency_id: number | null;
    es_manual: boolean;
  }>(
    `SELECT ad_id, campaign_id, campaign_name, ad_name, agency_id, es_manual
     FROM lg_ads_cache WHERE ad_id = @adId`,
    { adId }
  );

  if (cached.length > 0) {
    // Si es entrada manual, devolver inmediato sin llamar a Meta
    if (cached[0]!.es_manual) {
      return {
        ad_id: cached[0]!.ad_id,
        ad_name: cached[0]!.ad_name,
        campaign_id: cached[0]!.campaign_id,
        campaign_name: cached[0]!.campaign_name,
        agency_id: cached[0]!.agency_id,
      };
    }

    // Si es entrada de API, devolver cacheada
    return {
      ad_id: cached[0]!.ad_id,
      ad_name: cached[0]!.ad_name,
      campaign_id: cached[0]!.campaign_id,
      campaign_name: cached[0]!.campaign_name,
      agency_id: cached[0]!.agency_id,
    };
  }

  try {
    // No encontrado en cache: consultar Graph API
    const ad = await getAdData(adId);
    const campaignId = ad.campaign_id ?? null;
    let campaignName: string | null = null;
    let agencyId: number | null = null;

    if (campaignId) {
      const campaign = await getCampaignData(campaignId);
      campaignName = campaign.name ?? null;
      agencyId = await mapCampaignToAgency(campaignName);
    }

    // Guardar en cache como entrada de API (es_manual = 0)
    await execute(
      `INSERT INTO lg_ads_cache (ad_id, campaign_id, campaign_name, ad_name, agency_id, es_manual)
       VALUES (@adId, @campaignId, @campaignName, @adName, @agencyId, 0)`,
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

  const agencias = await query<{ id: number }>(
    `SELECT id FROM lg_agencias
     WHERE @campaignName LIKE '%' + subou_ldap + '%' AND activa = 1`,
    { campaignName }
  );

  if (agencias.length > 0) return agencias[0]!.id;
  return null;
}
