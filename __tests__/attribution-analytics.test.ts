// agent-notes: { ctx: "Unit tests for Attribution Analytics aggregation, assisted conversions, and CSV formatting", deps: ["vitest", "lib/attribution.ts"], state: active, last: "tara@2026-08-16" }
import { describe, it, expect } from 'vitest';
import {
  aggregateAttributionMetrics,
  formatAttributionCsvRow,
} from '../lib/attribution';

describe('Attribution Analytics Aggregation & Reporting', () => {
  const sampleSubscriptions = [
    {
      id: 'sub-1',
      subscription_plan: 'monthly',
      amount: 499,
      first_source: 'Instagram Paid',
      first_campaign: 'August Video Editors',
      first_content: 'DC Blood Band V2',
      first_product_viewed: 'dc-blood-band',
      last_source: 'Google Organic',
      last_campaign: null,
      last_content: null,
      last_product_viewed: 'dc-blood-band',
      confidence_level: 'high',
      created_at: '2026-08-16T10:00:00.000Z',
    },
    {
      id: 'sub-2',
      subscription_plan: 'yearly',
      amount: 4999,
      first_source: 'Instagram Paid',
      first_campaign: 'August Video Editors',
      first_content: 'DC Blood Band V2',
      first_product_viewed: 'dc-blood-band',
      last_source: 'Direct',
      last_campaign: null,
      last_content: null,
      last_product_viewed: 'dc-blood-band',
      confidence_level: 'high',
      created_at: '2026-08-16T11:00:00.000Z',
    },
    {
      id: 'sub-3',
      subscription_plan: 'monthly',
      amount: 499,
      first_source: 'YouTube',
      first_campaign: 'Jailer Templates',
      first_content: 'Jailer Tutorial',
      first_product_viewed: 'jailer-titles',
      last_source: 'YouTube',
      last_campaign: 'Jailer Templates',
      last_content: 'Jailer Tutorial',
      last_product_viewed: 'jailer-titles',
      confidence_level: 'high',
      created_at: '2026-08-16T12:00:00.000Z',
    },
    {
      id: 'sub-4',
      subscription_plan: 'monthly',
      amount: 499,
      first_source: 'Direct',
      first_campaign: null,
      first_content: null,
      first_product_viewed: null,
      last_source: 'Direct',
      last_campaign: null,
      last_content: null,
      last_product_viewed: null,
      confidence_level: 'low',
      created_at: '2026-08-16T13:00:00.000Z',
    },
  ];

  it('aggregates first-touch vs last-touch metrics accurately', () => {
    const result = aggregateAttributionMetrics(sampleSubscriptions as any);

    expect(result.summary.totalSubscriptions).toBe(4);
    expect(result.summary.totalRevenue).toBe(6496);
    expect(result.summary.monthlyCount).toBe(3);
    expect(result.summary.yearlyCount).toBe(1);

    // First touch: Instagram Paid introduced 2 subscribers (₹5498)
    const igFirst = result.firstTouchBreakdown.find((s) => s.source === 'Instagram Paid');
    expect(igFirst?.customers).toBe(2);
    expect(igFirst?.revenue).toBe(5498);

    // Last touch: Direct converted 2 subscribers (₹5498), Google Organic converted 1 (₹499)
    const directLast = result.lastTouchBreakdown.find((s) => s.source === 'Direct');
    expect(directLast?.customers).toBe(2);
  });

  it('computes assisted conversions accurately', () => {
    const result = aggregateAttributionMetrics(sampleSubscriptions as any);

    // Sub 1: Instagram Paid -> Google Organic
    // Sub 2: Instagram Paid -> Direct
    const igToGoogle = result.assistedConversions.find(
      (a) => a.path === 'Instagram Paid → Google Organic'
    );
    expect(igToGoogle?.count).toBe(1);

    const igToDirect = result.assistedConversions.find(
      (a) => a.path === 'Instagram Paid → Direct'
    );
    expect(igToDirect?.count).toBe(1);
  });

  it('formats CSV rows with all attribution fields properly escaped', () => {
    const sub = sampleSubscriptions[0];
    const csvRow = formatAttributionCsvRow(sub as any);

    expect(csvRow).toContain('sub-1');
    expect(csvRow).toContain('Instagram Paid');
    expect(csvRow).toContain('Google Organic');
    expect(csvRow).toContain('499');
    expect(csvRow).toContain('dc-blood-band');
  });
});
