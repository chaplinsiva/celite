// <!-- agent-notes: { ctx: "helpers for market-exclusive templates and access checks", deps: ["data/templateData.d.ts"], state: active, last: "sato@2026-09-03" } -->

export interface TemplateAccessRecord {
  slug?: string | null;
  status?: string | null;
  available_on_celite_subscription?: boolean | null;
  available_on_celite_market?: boolean | null;
  price?: number | string | null;
  [key: string]: any;
}

/**
 * Returns true if the template is an approved Celite Market exclusive item
 * (i.e. approved, but not included in the Celite subscription).
 */
export function isMarketExclusiveTemplate(template: TemplateAccessRecord | null | undefined): boolean {
  if (!template) return false;
  const status = template.status ?? 'approved';
  if (status !== 'approved') return false;

  // If available_on_celite_subscription is explicitly false
  return template.available_on_celite_subscription === false;
}

/**
 * Returns true if the template is allowed to be viewed on Celite (either subscription or market-exclusive).
 * Rejects templates that are missing, 'rejected', or 'pending'.
 */
export function isTemplateAccessibleOnCelite(template: TemplateAccessRecord | null | undefined): boolean {
  if (!template) return false;
  return template.status === 'approved';
}

/**
 * Generates the direct URL for purchasing the item on Celite Market.
 */
export function getCeliteMarketUrl(slugOrTemplate: string | TemplateAccessRecord | null | undefined): string {
  const slug = typeof slugOrTemplate === 'string' ? slugOrTemplate : slugOrTemplate?.slug || '';
  return `https://celitemarket.in/product/${encodeURIComponent(slug)}`;
}
