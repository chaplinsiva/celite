// agent-notes: { ctx: "Unit tests for Marketing Content Registry name resolution", deps: ["vitest", "lib/attribution.ts"], state: active, last: "tara@2026-08-16" }
import { describe, it, expect } from 'vitest';
import { resolveContentNames, type RegistryMapping } from '../lib/attribution';

describe('Marketing Content Registry Resolution', () => {
  const sampleRegistry: RegistryMapping[] = [
    {
      id: 'reg-1',
      platform: 'Instagram',
      source: 'Instagram',
      medium: 'Paid Social',
      campaign_id: '120250719258570493',
      campaign_name: 'August Video Editors Campaign',
      adset_id: '120250719260000000',
      adset_name: 'Video Editors India',
      ad_or_video_id: '120250719263640493',
      ad_or_video_name: 'DC Blood Band Character Intro V2',
      content_id: '120250719263640493',
      content_name: 'DC Blood Band Character Intro V2',
      product_slug: 'dc-blood-band-character-intro',
      destination_url: 'https://celite.in/product/dc-blood-band-character-intro',
      is_active: true,
    },
    {
      id: 'reg-2',
      platform: 'YouTube',
      source: 'YouTube',
      medium: 'Organic Video',
      campaign_id: 'jailer-campaign',
      campaign_name: 'Jailer Templates Series',
      ad_or_video_id: 'yt_jailer_01',
      ad_or_video_name: 'Jailer Trailer Inspired Tutorial',
      content_id: 'yt_jailer_01',
      content_name: 'Jailer Trailer Inspired Tutorial',
      product_slug: 'jailer-trailer-inspired-titles',
      destination_url: 'https://celite.in/product/jailer-trailer-inspired-titles',
      is_active: true,
    },
  ];

  it('resolves raw Meta Ad ID and Campaign ID to human readable names', () => {
    const resolved = resolveContentNames(
      {
        campaign_id: '120250719258570493',
        content_id: '120250719263640493',
        source: 'Instagram Paid',
      },
      sampleRegistry
    );

    expect(resolved.campaign_name).toBe('August Video Editors Campaign');
    expect(resolved.content_name).toBe('DC Blood Band Character Intro V2');
    expect(resolved.ad_or_video_name).toBe('DC Blood Band Character Intro V2');
    expect(resolved.adset_name).toBe('Video Editors India');
  });

  it('resolves YouTube Video ID to human readable tutorial name', () => {
    const resolved = resolveContentNames(
      {
        content_id: 'yt_jailer_01',
        source: 'YouTube',
      },
      sampleRegistry
    );

    expect(resolved.content_name).toBe('Jailer Trailer Inspired Tutorial');
    expect(resolved.campaign_name).toBe('Jailer Templates Series');
  });

  it('falls back cleanly when ID is not present in registry without guessing', () => {
    const resolved = resolveContentNames(
      {
        campaign_id: 'unregistered_campaign_999',
        content_id: 'unregistered_ad_888',
        source: 'Instagram Paid',
      },
      sampleRegistry
    );

    expect(resolved.campaign_name).toBe('unregistered_campaign_999');
    expect(resolved.content_name).toBe('unregistered_ad_888');
  });
});
