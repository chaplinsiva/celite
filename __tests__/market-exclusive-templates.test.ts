import { describe, it, expect } from 'vitest';
import {
  isMarketExclusiveTemplate,
  isTemplateAccessibleOnCelite,
  getCeliteMarketUrl,
} from '../lib/templateUtils';

describe('Market Exclusive & Celite Template Helper Functions', () => {
  it('correctly identifies market-exclusive templates (approved, available_on_celite_subscription = false)', () => {
    const marketTemplate = {
      slug: 'japanese-theme-save-date-template',
      name: 'Japanese Theme Save Date Template',
      status: 'approved',
      available_on_celite_subscription: false,
      available_on_celite_market: true,
      price: 299,
    };

    expect(isMarketExclusiveTemplate(marketTemplate)).toBe(true);
  });

  it('correctly identifies subscription-inclusive templates as not market exclusive', () => {
    const subTemplate = {
      slug: 'kerala-wedding-template',
      name: 'Kerala Wedding Template',
      status: 'approved',
      available_on_celite_subscription: true,
      available_on_celite_market: true,
      price: 0,
    };

    expect(isMarketExclusiveTemplate(subTemplate)).toBe(false);
  });

  it('correctly determines template accessibility on Celite (approved vs rejected/pending)', () => {
    const approvedMarketTemplate = {
      slug: 'paper-unfold-preset',
      status: 'approved',
      available_on_celite_subscription: false,
    };
    const approvedSubTemplate = {
      slug: 'sub-template',
      status: 'approved',
      available_on_celite_subscription: true,
    };
    const rejectedTemplate = {
      slug: 'rejected-template',
      status: 'rejected',
      available_on_celite_subscription: false,
    };
    const pendingTemplate = {
      slug: 'pending-template',
      status: 'pending',
      available_on_celite_subscription: false,
    };

    expect(isTemplateAccessibleOnCelite(approvedMarketTemplate)).toBe(true);
    expect(isTemplateAccessibleOnCelite(approvedSubTemplate)).toBe(true);
    expect(isTemplateAccessibleOnCelite(rejectedTemplate)).toBe(false);
    expect(isTemplateAccessibleOnCelite(pendingTemplate)).toBe(false);
    expect(isTemplateAccessibleOnCelite(null)).toBe(false);
  });

  it('generates the correct Celite Market product URL', () => {
    const slug = 'viral-refraction-glass-effect-ae-template';
    expect(getCeliteMarketUrl(slug)).toBe(
      'https://celitemarket.in/product/viral-refraction-glass-effect-ae-template'
    );
  });

  it('filters only market-exclusive templates for the market showcase', () => {
    const list = [
      { slug: 'market-1', status: 'approved', available_on_celite_subscription: false, available_on_celite_market: true },
      { slug: 'sub-1', status: 'approved', available_on_celite_subscription: true, available_on_celite_market: true },
      { slug: 'market-unapproved', status: 'pending', available_on_celite_subscription: false, available_on_celite_market: true },
      { slug: 'market-2', status: 'approved', available_on_celite_subscription: false, available_on_celite_market: true },
    ];

    const result = list.filter(isMarketExclusiveTemplate);
    expect(result.map(t => t.slug)).toEqual(['market-1', 'market-2']);
  });
});
