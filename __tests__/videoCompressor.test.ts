// agent-notes: ctx="Unit tests for Admin Replace Video Preview API endpoint and Cloudflare R2 object update", deps="vitest, app/api/admin/replace-video-preview/route, lib/r2Client, lib/supabaseAdmin", state="active", last="vteam@2026-08-02"
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock R2 Client & Supabase Admin
const mockUploadPreviewToR2 = vi.fn();
vi.mock('../lib/r2Client', () => ({
  uploadPreviewToR2: (...args: any[]) => mockUploadPreviewToR2(...args),
}));

const mockUpdate = vi.fn();
const mockAdmin = {
  from: vi.fn().mockReturnValue({
    update: mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
};

vi.mock('../lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

import { POST } from '../app/api/admin/replace-video-preview/route';

describe('Admin Replace Video Preview API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if required parameters are missing', async () => {
    const formData = new FormData();
    formData.append('templateId', 'test-template-slug');
    // missing file and videoPath

    const req = new Request('http://localhost:3000/api/admin/replace-video-preview', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required parameters/i);
  });

  it('replaces video in Cloudflare R2 and updates template record in database', async () => {
    const videoFile = new File(['fake_compressed_video_binary_data'], 'compressed.mp4', {
      type: 'video/mp4',
    });

    mockUploadPreviewToR2.mockResolvedValueOnce({
      url: 'https://preview.celite.in/previews/videos/test-template.mp4',
      key: 'previews/videos/test-template.mp4',
    });

    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('templateId', 'test-template-slug');
    formData.append('videoPath', 'https://preview.celite.in/previews/videos/test-template.mp4');

    const req = new Request('http://localhost:3000/api/admin/replace-video-preview', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.url).toBe('https://preview.celite.in/previews/videos/test-template.mp4');

    // Verify uploadPreviewToR2 was called with buffer and correct object key
    expect(mockUploadPreviewToR2).toHaveBeenCalledWith(
      expect.any(Buffer),
      'previews/videos/test-template.mp4',
      'video/mp4'
    );
  });
});
