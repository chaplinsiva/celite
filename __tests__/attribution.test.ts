import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeSource,
  sanitizeUrl,
  captureAttribution,
  getStoredAttribution,
  setStoredAttribution,
  clearStoredAttribution,
  recordProductView,
  ATTRIBUTION_STORAGE_KEY,
} from '../lib/attribution';

describe('Attribution Source Normalization', () => {
  it('normalizes Instagram Paid correctly with UTM params', () => {
    expect(
      normalizeSource({
        utm_source: 'instagram',
        utm_medium: 'paid_social',
      })
    ).toBe('Instagram Paid');

    expect(
      normalizeSource({
        utm_source: 'instagram',
        utm_medium: 'cpc',
      })
    ).toBe('Instagram Paid');
  });

  it('normalizes Instagram Organic correctly without paid medium', () => {
    expect(
      normalizeSource({
        utm_source: 'instagram',
        utm_medium: 'bio',
      })
    ).toBe('Instagram Organic');

    expect(
      normalizeSource({
        referrer: 'https://l.instagram.com/',
      })
    ).toBe('Instagram Organic');
  });

  it('normalizes Facebook Paid and Facebook Organic', () => {
    expect(
      normalizeSource({
        utm_source: 'facebook',
        utm_medium: 'ads',
      })
    ).toBe('Facebook Paid');

    expect(
      normalizeSource({
        utm_source: 'facebook',
        utm_medium: 'post',
      })
    ).toBe('Facebook Organic');

    expect(
      normalizeSource({
        referrer: 'https://www.facebook.com/',
      })
    ).toBe('Facebook Organic');
  });

  it('normalizes Google Ads and Google Organic', () => {
    expect(
      normalizeSource({
        utm_source: 'google',
        utm_medium: 'cpc',
      })
    ).toBe('Google Ads');

    expect(
      normalizeSource({
        gclid: 'xyz123',
      })
    ).toBe('Google Ads');

    expect(
      normalizeSource({
        referrer: 'https://www.google.com/',
      })
    ).toBe('Google Organic');
  });

  it('normalizes YouTube', () => {
    expect(
      normalizeSource({
        utm_source: 'youtube',
      })
    ).toBe('YouTube');

    expect(
      normalizeSource({
        referrer: 'https://m.youtube.com/',
      })
    ).toBe('YouTube');
  });

  it('normalizes ChatGPT / AI', () => {
    expect(
      normalizeSource({
        utm_source: 'chatgpt',
      })
    ).toBe('ChatGPT / AI');

    expect(
      normalizeSource({
        referrer: 'https://chatgpt.com/',
      })
    ).toBe('ChatGPT / AI');

    expect(
      normalizeSource({
        referrer: 'https://claude.ai/',
      })
    ).toBe('ChatGPT / AI');
  });

  it('normalizes Direct and Referral', () => {
    expect(
      normalizeSource({
        referrer: '',
      })
    ).toBe('Direct');

    expect(
      normalizeSource({
        referrer: 'https://somewebsite.org/blog/review',
      })
    ).toBe('Referral');
  });
});

describe('Sanitize URL', () => {
  it('strips sensitive parameters like password, token, and api_key', () => {
    const input = 'https://celite.in/checkout?utm_source=instagram&token=secret123&password=pass&utm_medium=cpc';
    const sanitized = sanitizeUrl(input);
    expect(sanitized).not.toContain('secret123');
    expect(sanitized).not.toContain('password');
    expect(sanitized).toContain('utm_source=instagram');
    expect(sanitized).toContain('utm_medium=cpc');
  });
});

describe('Touchpoint Capture & Immutability', () => {
  beforeEach(() => {
    clearStoredAttribution();
  });

  it('sets first touch and preserves it when visiting from another source later', () => {
    // 1. First visit from Instagram Ad
    const firstData = captureAttribution({
      url: 'https://celite.in/product/jana-nayagan?utm_source=instagram&utm_medium=paid_social&utm_campaign=august_ads',
      referrer: 'https://l.instagram.com/',
    });

    expect(firstData).not.toBeNull();
    expect(firstData?.firstTouch.source).toBe('Instagram Paid');
    expect(firstData?.firstTouch.campaign).toBe('august_ads');
    expect(firstData?.lastTouch.source).toBe('Instagram Paid');

    // 2. Second visit later from Google Search
    const secondData = captureAttribution({
      url: 'https://celite.in/pricing',
      referrer: 'https://www.google.com/',
    });

    expect(secondData?.firstTouch.source).toBe('Instagram Paid');
    expect(secondData?.firstTouch.campaign).toBe('august_ads');
    expect(secondData?.lastTouch.source).toBe('Google Organic');
    expect(secondData?.lastTouch.landingPage).toBe('/pricing');
  });

  it('records first product viewed and preserves it', () => {
    captureAttribution({
      url: 'https://celite.in/product/jana-nayagan?utm_source=instagram&utm_medium=paid_social',
    });

    recordProductView('jana-nayagan-title-card');
    let stored = getStoredAttribution();
    expect(stored?.firstTouch.productViewed).toBe('jana-nayagan-title-card');
    expect(stored?.lastTouch.productViewed).toBe('jana-nayagan-title-card');

    // View another product later
    recordProductView('wedding-invitation-pack');
    stored = getStoredAttribution();
    expect(stored?.firstTouch.productViewed).toBe('jana-nayagan-title-card');
    expect(stored?.lastTouch.productViewed).toBe('wedding-invitation-pack');
  });
});
