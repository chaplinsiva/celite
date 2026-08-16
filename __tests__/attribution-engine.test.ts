// agent-notes: { ctx: "Unit tests for Universal Attribution Engine normalization, sanitization, and classification", deps: ["vitest", "lib/attribution.ts"], state: active, last: "tara@2026-08-16" }
import { describe, it, expect } from 'vitest';
import {
  normalizeSource,
  sanitizeUrl,
  classifyDirectTraffic,
  calculateConfidence,
  detectClientEnvironment,
} from '../lib/attribution';

describe('Universal Attribution Engine - Normalization & Classification', () => {
  it('correctly classifies Instagram Paid and Organic sources', () => {
    // Paid via utm_medium
    expect(
      normalizeSource({
        utm_source: 'instagram',
        utm_medium: 'paid_social',
      })
    ).toBe('Instagram Paid');

    // Paid via source name
    expect(
      normalizeSource({
        utm_source: 'ig_paid',
        utm_medium: 'cpc',
      })
    ).toBe('Instagram Paid');

    // Organic via referrer
    expect(
      normalizeSource({
        referrer: 'https://l.instagram.com/',
      })
    ).toBe('Instagram Organic');

    // Organic via utm_source without paid medium
    expect(
      normalizeSource({
        utm_source: 'instagram',
        utm_medium: 'bio_link',
      })
    ).toBe('Instagram Organic');
  });

  it('correctly classifies Facebook Paid and Organic sources', () => {
    // Paid via fbclid
    expect(
      normalizeSource({
        utm_source: 'facebook',
        fbclid: 'fb_ad_click_123',
      })
    ).toBe('Facebook Paid');

    // Organic via referrer
    expect(
      normalizeSource({
        referrer: 'https://m.facebook.com/',
      })
    ).toBe('Facebook Organic');
  });

  it('correctly classifies YouTube Organic and Paid', () => {
    // Organic YouTube
    expect(
      normalizeSource({
        referrer: 'https://www.youtube.com/watch?v=abc123xyz',
      })
    ).toBe('YouTube Organic');

    // Paid YouTube
    expect(
      normalizeSource({
        utm_source: 'youtube',
        utm_medium: 'cpc',
        gclid: 'goog_click_999',
      })
    ).toBe('YouTube Paid');
  });

  it('correctly classifies Google Ads vs Google Organic', () => {
    // Google Ads with gclid
    expect(
      normalizeSource({
        gclid: 'gclid_example_123',
      })
    ).toBe('Google Ads');

    // Google Ads with cpc medium
    expect(
      normalizeSource({
        utm_source: 'google',
        utm_medium: 'cpc',
      })
    ).toBe('Google Ads');

    // Google Organic
    expect(
      normalizeSource({
        referrer: 'https://www.google.co.in/',
      })
    ).toBe('Google Organic');
  });

  it('correctly classifies Search Engines (Bing, Yahoo, DuckDuckGo)', () => {
    expect(
      normalizeSource({
        referrer: 'https://www.bing.com/',
      })
    ).toBe('Bing Search');

    expect(
      normalizeSource({
        referrer: 'https://duckduckgo.com/',
      })
    ).toBe('DuckDuckGo Search');
  });

  it('correctly classifies AI Search Assistants (ChatGPT, Claude, Perplexity)', () => {
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

    expect(
      normalizeSource({
        utm_source: 'perplexity',
        utm_medium: 'referral',
      })
    ).toBe('ChatGPT / AI');
  });

  it('correctly classifies Referral Websites and extracts domains', () => {
    expect(
      normalizeSource({
        referrer: 'https://zorcha.com/reviews/celite',
      })
    ).toBe('Referral');
  });

  it('correctly classifies Messaging (WhatsApp, Email)', () => {
    expect(
      normalizeSource({
        utm_source: 'whatsapp',
        utm_medium: 'chat',
      })
    ).toBe('WhatsApp');

    expect(
      normalizeSource({
        utm_source: 'newsletter',
        utm_medium: 'email',
      })
    ).toBe('Email');
  });

  it('disambiguates Direct traffic correctly without guessing', () => {
    // 1. Genuine Direct (no prior touch)
    expect(
      classifyDirectTraffic({
        hasPriorTouches: false,
        referrer: null,
        hasMarketingParams: false,
      })
    ).toBe('Genuine Direct');

    // 2. Direct (Previously Attributed)
    expect(
      classifyDirectTraffic({
        hasPriorTouches: true,
        referrer: null,
        hasMarketingParams: false,
      })
    ).toBe('Direct (Previously Attributed)');

    // 3. Unknown / Referrer Missing
    expect(
      classifyDirectTraffic({
        hasPriorTouches: false,
        referrer: '',
        isAppWebview: true,
        hasMarketingParams: false,
      })
    ).toBe('Unknown / Referrer Missing');
  });

  it('calculates data confidence score accurately', () => {
    // High confidence: has UTMs and campaign or click ID
    expect(
      calculateConfidence({
        utm_source: 'instagram',
        utm_campaign: 'august_video_editors',
        fbclid: '123',
      }).level
    ).toBe('high');

    // Medium confidence: known referrer domain
    expect(
      calculateConfidence({
        referrer: 'https://www.youtube.com/',
      }).level
    ).toBe('medium');

    // Low confidence: no referrer, no UTMs
    expect(
      calculateConfidence({
        referrer: '',
      }).level
    ).toBe('low');
  });

  it('sanitizes sensitive query parameters strictly', () => {
    const dirtyUrl = 'https://celite.in/checkout?token=secret123&auth=abcdef&utm_source=instagram&utm_campaign=summer&password=mypassword#step2';
    const cleanUrl = sanitizeUrl(dirtyUrl);

    expect(cleanUrl).toContain('utm_source=instagram');
    expect(cleanUrl).toContain('utm_campaign=summer');
    expect(cleanUrl).not.toContain('token=secret123');
    expect(cleanUrl).not.toContain('auth=abcdef');
    expect(cleanUrl).not.toContain('password=mypassword');
  });
});
