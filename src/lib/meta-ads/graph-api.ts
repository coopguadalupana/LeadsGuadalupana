interface AdData {
  id: string;
  name?: string;
  campaign_id?: string;
  adset_id?: string;
}

interface CampaignData {
  id: string;
  name?: string;
}

interface GraphError {
  error: { message: string; type: string; code: number };
}

async function graphGet<T>(path: string, fields: string): Promise<T> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error("Missing WHATSAPP_TOKEN");

  const url = `https://graph.facebook.com/v25.0/${path}?fields=${encodeURIComponent(fields)}&access_token=${token}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    const err = data as GraphError;
    throw new Error(`Graph API error: ${err.error?.message ?? res.statusText}`);
  }

  return data as T;
}

export async function getAdData(adId: string): Promise<AdData> {
  return graphGet<AdData>(adId, "campaign_id,name,adset_id");
}

export async function getCampaignData(campaignId: string): Promise<CampaignData> {
  return graphGet<CampaignData>(campaignId, "name");
}
