"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseBrowserClient } from "../../../lib/supabaseClient";

type CreatorShop = {
  slug: string;
  name: string;
  description: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_upi_id: string | null;
  direct_upload_enabled?: boolean;
};

type CreatorTemplateRow = {
  slug: string;
  name: string;
  subtitle: string | null;
  video: string | null;
  created_at: string | null;
  downloadCount: number;
  status?: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
};

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user } = useAppContext();

  const [shop, setShop] = useState<CreatorShop | null>(null);
  const [templates, setTemplates] = useState<CreatorTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [totalDownloads, setTotalDownloads] = useState<number>(0);
  const [uniqueUserPeriods, setUniqueUserPeriods] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);

  const [formOpen, setFormOpen] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    subtitle: "",
    video: "",
    video_path: "",
    thumbnail_path: "",
    audio_preview_path: "",
    model_3d_path: "",
    source_path: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    sub_subcategory_id: "",
    features: "",
    software: "",
    plugins: "",
    tags: "",
  });
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewInputRef = useRef<HTMLInputElement | null>(null);
  const model3DInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingSource, setUploadingSource] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingAudioPreview, setUploadingAudioPreview] = useState(false);
  const [uploadingModel3D, setUploadingModel3D] = useState(false);

  // Autofill with AI state
  const [autofillOpen, setAutofillOpen] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillTemplateType, setAutofillTemplateType] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{
    source: number;
    video: number;
    thumbnail: number;
    audio_preview: number;
    model_3d: number;
  }>({
    source: 0,
    video: 0,
    thumbnail: 0,
    audio_preview: 0,
    model_3d: 0,
  });
  const [uploadSpeed, setUploadSpeed] = useState<{
    source: string;
    video: string;
    thumbnail: string;
    audio_preview: string;
    model_3d: string;
  }>({
    source: '',
    video: '',
    thumbnail: '',
    audio_preview: '',
    model_3d: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<
    Subcategory[]
  >([]);
  const [subSubcategories, setSubSubcategories] = useState<Array<{ id: string; subcategory_id: string; name: string; slug: string }>>([]);
  const [filteredSubSubcategories, setFilteredSubSubcategories] = useState<Array<{ id: string; subcategory_id: string; name: string; slug: string }>>([]);

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      subtitle: "",
      video: "",
      video_path: "",
      thumbnail_path: "",
      audio_preview_path: "",
      model_3d_path: "",
      source_path: "",
      description: "",
      category_id: "",
      subcategory_id: "",
      sub_subcategory_id: "",
      features: "",
      software: "",
      plugins: "",
      tags: "",
    });
    setSlugManuallyEdited(false);
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  // Chunk size: 5MB (S3/R2 multipart minimum is 5MB except for last part)
  // NOTE: Requires Vercel Pro plan (50MB body limit). Hobby plan (4.5MB) is too small.
  const CHUNK_SIZE = 5 * 1024 * 1024;
  // Threshold for chunked upload: 4MB (files larger than this use chunked upload)
  const CHUNKED_UPLOAD_THRESHOLD = 4 * 1024 * 1024;
  // Maximum file size: 1GB
  const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;

  // Safe JSON parse helper
  const safeJsonParse = async (response: Response): Promise<any> => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      // If not JSON, return error object with the text
      return { ok: false, error: text || `HTTP ${response.status}` };
    }
  };

  // Direct browser-to-R2 upload using presigned URLs (bypasses Vercel entirely)
  const uploadFileChunked = async (
    kind: 'source' | 'video' | 'thumbnail' | 'audio_preview' | 'model_3d',
    file: File,
    accessToken: string
  ): Promise<{ url: string; key: string }> => {
    // Step 1: Initialize chunked upload and get presigned URLs
    const initRes = await fetch('/api/creator/chunked-upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        kind,
        category_id: form.category_id,
        subcategory_id: form.subcategory_id || null,
        sub_subcategory_id: form.sub_subcategory_id || null,
        slug: form.slug || null,
        template_name: form.name,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });

    const initData = await safeJsonParse(initRes);
    if (!initRes.ok || !initData.ok) {
      throw new Error(initData.error || 'Failed to initialize upload');
    }

    const { uploadId, key, bucket, totalChunks, presignedUrls, publicUrl, chunkSize } = initData;
    const parts: { partNumber: number; eTag: string }[] = [];
    let uploadedBytes = 0;
    const startTime = Date.now();

    // Use the chunk size from server (5MB for S3 minimum)
    const serverChunkSize = chunkSize || CHUNK_SIZE;

    try {
      // Step 2: Upload each chunk directly to R2 using presigned URLs
      for (let i = 0; i < presignedUrls.length; i++) {
        const { partNumber, presignedUrl } = presignedUrls[i];
        const start = (partNumber - 1) * serverChunkSize;
        const end = Math.min(start + serverChunkSize, file.size);
        const chunk = file.slice(start, end);

        // Upload directly to R2 using presigned URL (bypasses Vercel!)
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: chunk,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`Failed to upload part ${partNumber}: ${errorText || uploadRes.status}`);
        }

        // Get ETag from response headers (required for completing multipart upload)
        const eTag = uploadRes.headers.get('ETag');
        if (!eTag) {
          throw new Error(`No ETag received for part ${partNumber}`);
        }

        parts.push({ partNumber, eTag: eTag.replace(/"/g, '') });
        uploadedBytes += (end - start);

        // Update progress
        const progress = Math.round((uploadedBytes / file.size) * 100);
        setUploadProgress((prev) => ({ ...prev, [kind]: progress }));

        // Calculate speed
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0) {
          const speed = uploadedBytes / elapsed;
          setUploadSpeed((prev) => ({ ...prev, [kind]: formatSpeed(speed) }));
        }
      }

      // Step 3: Complete the upload (tell R2 to assemble all parts)
      const completeRes = await fetch('/api/creator/chunked-upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uploadId,
          key,
          bucket,
          kind,
          parts,
        }),
      });

      const completeData = await safeJsonParse(completeRes);
      if (!completeRes.ok || !completeData.ok) {
        throw new Error(completeData.error || 'Failed to complete upload');
      }

      return { url: publicUrl || completeData.url, key: completeData.key };
    } catch (error) {
      // Abort the multipart upload on failure
      try {
        await fetch('/api/creator/chunked-upload/complete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ uploadId, key, bucket }),
        });
      } catch (abortError) {
        console.error('Failed to abort upload:', abortError);
      }
      throw error;
    }
  };

  const uploadFile = async (kind: 'source' | 'video' | 'thumbnail' | 'audio_preview' | 'model_3d', file: File) => {
    if (!form.category_id) {
      setError('Please select a category first');
      return;
    }

    // Check file size limit (1GB max)
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 1GB.');
      return;
    }

    // Compress thumbnail images before uploading
    let fileToUpload = file;
    if (kind === 'thumbnail' && file.type.startsWith('image/')) {
      try {
        // Show compression message
        setMessage('Compressing thumbnail image...');
        const { compressThumbnail } = await import('../../../lib/imageCompression');
        fileToUpload = await compressThumbnail(file);
        const originalSize = (file.size / 1024 / 1024).toFixed(2);
        const compressedSize = (fileToUpload.size / 1024 / 1024).toFixed(2);
        console.log(`Thumbnail compressed: ${originalSize}MB → ${compressedSize}MB`);
      } catch (compressionError) {
        console.warn('Image compression failed, uploading original:', compressionError);
        // Continue with original file if compression fails
      }
    }

    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Reset progress and set uploading state
    setUploadProgress((prev) => ({ ...prev, [kind]: 0 }));
    setUploadSpeed((prev) => ({ ...prev, [kind]: '' }));
    if (kind === 'source') setUploadingSource(true);
    else if (kind === 'video') setUploadingVideo(true);
    else if (kind === 'thumbnail') setUploadingThumbnail(true);
    else if (kind === 'audio_preview') setUploadingAudioPreview(true);
    else if (kind === 'model_3d') setUploadingModel3D(true);

    try {
      // Use chunked upload for large files (> 4MB)
      if (fileToUpload.size > CHUNKED_UPLOAD_THRESHOLD) {
        setMessage(`Uploading large file (${(fileToUpload.size / (1024 * 1024)).toFixed(1)}MB)...`);
        const result = await uploadFileChunked(kind, fileToUpload, session.access_token);

        if (kind === 'source') {
          setForm((f) => ({ ...f, source_path: result.key }));
        } else if (kind === 'video') {
          setForm((f) => ({ ...f, video_path: result.url }));
        } else if (kind === 'thumbnail') {
          setForm((f) => ({ ...f, thumbnail_path: result.url }));
        } else if (kind === 'audio_preview') {
          setForm((f) => ({ ...f, audio_preview_path: result.url }));
        } else if (kind === 'model_3d') {
          setForm((f) => ({ ...f, model_3d_path: result.url }));
        }
        setMessage('File uploaded successfully');
        setUploadProgress((prev) => ({ ...prev, [kind]: 100 }));
        setUploadSpeed((prev) => ({ ...prev, [kind]: '' }));
        return;
      }

      // Regular upload for small files (< 4MB)
      const fd = new FormData();
      fd.append('file', fileToUpload);
      fd.append('kind', kind);
      fd.append('category_id', form.category_id);
      if (form.subcategory_id) fd.append('subcategory_id', form.subcategory_id);
      if (form.sub_subcategory_id) fd.append('sub_subcategory_id', form.sub_subcategory_id);
      if (form.slug) fd.append('slug', form.slug);
      if (form.name) fd.append('template_name', form.name);

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let lastLoaded = 0;
        let lastTime = Date.now();

        // Track upload progress with speed calculation
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress((prev) => ({ ...prev, [kind]: percentComplete }));

            // Calculate speed
            const now = Date.now();
            const timeDelta = (now - lastTime) / 1000;
            if (timeDelta > 0.5) {
              const bytesDelta = e.loaded - lastLoaded;
              const speed = bytesDelta / timeDelta;
              setUploadSpeed((prev) => ({ ...prev, [kind]: formatSpeed(speed) }));
              lastLoaded = e.loaded;
              lastTime = now;
            }
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              if (json.ok && json.url) {
                if (kind === 'source') {
                  setForm((f) => ({ ...f, source_path: json.key }));
                } else if (kind === 'video') {
                  setForm((f) => ({ ...f, video_path: json.url }));
                } else if (kind === 'thumbnail') {
                  setForm((f) => ({ ...f, thumbnail_path: json.url }));
                } else if (kind === 'audio_preview') {
                  setForm((f) => ({ ...f, audio_preview_path: json.url }));
                } else if (kind === 'model_3d') {
                  setForm((f) => ({ ...f, model_3d_path: json.url }));
                }
                setMessage('File uploaded successfully');
                setUploadProgress((prev) => ({ ...prev, [kind]: 100 }));
                setUploadSpeed((prev) => ({ ...prev, [kind]: '' }));
                resolve();
              } else {
                setError(json.error || 'Upload failed');
                reject(new Error(json.error || 'Upload failed'));
              }
            } catch (e) {
              setError('Failed to parse response');
              reject(e);
            }
          } else if (xhr.status === 413) {
            setError('File too large for single upload. Please try again.');
            reject(new Error('File too large'));
          } else {
            try {
              const json = JSON.parse(xhr.responseText);
              setError(json.error || 'Upload failed');
            } catch {
              setError('Upload failed');
            }
            reject(new Error('Upload failed'));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          setError('Upload failed - network error');
          reject(new Error('Upload failed'));
        });

        xhr.addEventListener('abort', () => {
          setError('Upload cancelled');
          reject(new Error('Upload cancelled'));
        });

        // Open and send request
        xhr.open('POST', '/api/creator/upload-r2');
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.send(fd);
      });
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      // Reset uploading state after a short delay to show 100% completion
      setTimeout(() => {
        if (kind === 'source') setUploadingSource(false);
        else if (kind === 'video') setUploadingVideo(false);
        else if (kind === 'thumbnail') setUploadingThumbnail(false);
        else if (kind === 'audio_preview') setUploadingAudioPreview(false);
        else if (kind === 'model_3d') setUploadingModel3D(false);
        setUploadProgress((prev) => ({ ...prev, [kind]: 0 }));
        setUploadSpeed((prev) => ({ ...prev, [kind]: '' }));
      }, 1000);
    }
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Autofill handler - uses Gemini to generate template metadata
  const handleAutofill = async () => {
    if (!autofillTemplateType.trim()) {
      setError("Please enter what kind of template this is");
      return;
    }

    setAutofillLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expired. Please log in again.");
        return;
      }

      const res = await fetch("/api/creator/autofill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ templateType: autofillTemplateType.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to generate content");
        return;
      }

      const result = json.result;

      // Apply generated content to form (but NOT file paths)
      setForm((f) => ({
        ...f,
        name: result.name || f.name,
        slug: result.name && !slugManuallyEdited ? generateSlug(result.name) : f.slug,
        subtitle: result.subtitle || f.subtitle,
        description: result.description || f.description,
        tags: Array.isArray(result.tags) ? result.tags.join(", ") : f.tags,
        features: Array.isArray(result.features) ? result.features.join(", ") : f.features,
        software: Array.isArray(result.software) ? result.software.join(", ") : f.software,
        plugins: Array.isArray(result.plugins) ? result.plugins.join(", ") : f.plugins,
      }));

      setMessage("Content generated successfully!");
      setAutofillOpen(false);
      setAutofillTemplateType("");
    } catch (e: any) {
      console.error("Autofill error:", e);
      setError(e?.message || "Failed to generate content");
    } finally {
      setAutofillLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/creator/dashboard");
        return;
      }

      // Fetch API and categories in parallel for faster loading
      const [apiResponse, catsResult, subsResult, subSubsResult] = await Promise.all([
        fetch("/api/creator/templates", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
        supabase.from("categories").select("id,name,slug").order("name"),
        supabase.from("subcategories").select("id,category_id,name,slug").order("name"),
        supabase.from("sub_subcategories").select("id,subcategory_id,name,slug").order("name"),
      ]);

      const json = await apiResponse.json();

      if (!apiResponse.ok || !json.ok) {
        setError(json.error || "Failed to load creator data.");
        setLoading(false);
        return;
      }

      setShop(json.shop);
      setTemplates(json.templates || []);
      if (json.stats) {
        setTotalDownloads(json.stats.totalDownloads ?? 0);
        setUniqueUserPeriods(json.stats.uniqueUserPeriods ?? 0);
        setRevenue(json.stats.revenue ?? 0);
      } else {
        const fallbackDownloads = (json.templates || []).reduce(
          (sum: number, t: any) => sum + (t.downloadCount || 0),
          0
        );
        setTotalDownloads(fallbackDownloads);
        setUniqueUserPeriods(0);
        setRevenue(0);
      }

      if (!json.shop) {
        // No shop yet – send to onboarding
        router.replace("/start-selling");
        return;
      }

      // Set categories data (already fetched in parallel)
      setCategories((catsResult.data as any) || []);
      setSubcategories((subsResult.data as any) || []);
      setFilteredSubcategories((subsResult.data as any) || []);
      setSubSubcategories((subSubsResult.data as any) || []);
      setFilteredSubSubcategories((subSubsResult.data as any) || []);
    } catch (e: any) {
      console.error("Failed to load creator dashboard:", e);
      setError(e?.message || "Failed to load creator dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  // Keep filtered subcategories in sync with selected category
  useEffect(() => {
    if (form.category_id) {
      const filtered = subcategories.filter(
        (s) => s.category_id === form.category_id
      );
      setFilteredSubcategories(filtered);
      if (
        form.subcategory_id &&
        !filtered.find((s) => s.id === form.subcategory_id)
      ) {
        setForm((f) => ({ ...f, subcategory_id: "", sub_subcategory_id: "" }));
      }
    } else {
      setFilteredSubcategories(subcategories);
      setForm((f) => ({ ...f, subcategory_id: "", sub_subcategory_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id, subcategories]);

  // Keep filtered sub-subcategories in sync with selected subcategory
  useEffect(() => {
    if (form.subcategory_id) {
      const filtered = subSubcategories.filter(
        (s) => s.subcategory_id === form.subcategory_id
      );
      setFilteredSubSubcategories(filtered);
      if (
        form.sub_subcategory_id &&
        !filtered.find((s) => s.id === form.sub_subcategory_id)
      ) {
        setForm((f) => ({ ...f, sub_subcategory_id: "" }));
      }
    } else {
      setFilteredSubSubcategories([]);
      setForm((f) => ({ ...f, sub_subcategory_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subcategory_id, subSubcategories]);

  useEffect(() => {
    if (!user) {
      router.replace("/login?redirect=/creator/dashboard");
      return;
    }
    loadData();
  }, [user, loadData, router]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/creator/dashboard");
        return;
      }

      const slug = (form.slug || generateSlug(form.name)).trim().toLowerCase();
      if (!slug) {
        setError("Please enter a name to generate a slug.");
        setSaving(false);
        return;
      }

      const payload = {
        template: {
          name: form.name,
          slug,
          subtitle: form.subtitle,
          description: form.description,
          video_path: form.video_path,
          thumbnail_path: form.thumbnail_path,
          audio_preview_path: form.audio_preview_path,
          model_3d_path: form.model_3d_path,
          source_path: form.source_path,
          features: form.features
            ? form.features
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            : [],
          software: form.software
            ? form.software
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            : [],
          plugins: form.plugins
            ? form.plugins
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            : [],
          tags: form.tags
            ? form.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            : [],
          category_id: form.category_id || null,
          subcategory_id: form.subcategory_id || null,
          sub_subcategory_id: form.sub_subcategory_id || null,
        },
      };

      const res = await fetch("/api/creator/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to save template.");
        setSaving(false);
        return;
      }

      setMessage("Template saved!");
      resetForm();
      setFormOpen(false);
      await loadData();
    } catch (e: any) {
      console.error("Failed to create template:", e);
      setError(e?.message || "Failed to create template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (slug: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/creator/dashboard");
        return;
      }

      const res = await fetch("/api/creator/templates", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to delete template.");
        return;
      }

      setMessage("Template deleted.");
      await loadData();
    } catch (e: any) {
      console.error("Failed to delete template:", e);
      setError(e?.message || "Failed to delete template.");
    }
  };

  const [active, setActive] = useState<"overview" | "templates" | "settings">(
    "overview"
  );

  if (!user) {
    return null;
  }

  if (loading && !shop) {
    return (
      <main className="bg-zinc-50 min-h-screen text-zinc-900 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm text-center">
          <p className="text-sm text-zinc-500">
            Loading your creator dashboard...
          </p>
        </div>
      </main>
    );
  }

  const getStatusLabel = (status?: string | null) => {
    if (!status || status === "approved") return "Approved";
    if (status === "pending") return "Pending review";
    if (status === "rejected") return "Rejected";
    return status;
  };

  return (
    <main className="bg-zinc-50 min-h-screen text-zinc-900 flex flex-col font-sans">
      {/* Creator Navbar (similar to admin navbar) */}
      <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/logo.png"
              alt="Celite Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="font-bold text-xl tracking-tight text-zinc-900">
              Celite{" "}
              <span className="text-zinc-500 font-normal text-sm ml-1">
                Creator
              </span>
            </span>
          </Link>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100"
        >
          Back to Dashboard
        </Link>
      </header>

      <div className="flex-1 grid grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="border-r border-zinc-200 bg-white px-4 py-6 space-y-4">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.18em] mb-2">
            Creator Panel
          </div>
          <nav className="space-y-1 text-sm">
            <button
              type="button"
              onClick={() => setActive("overview")}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${active === "overview"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
                }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActive("templates")}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${active === "templates"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
                }`}
            >
              My Templates
            </button>
            <button
              type="button"
              onClick={() => setActive("settings")}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${active === "settings"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
                }`}
            >
              Settings
            </button>
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex flex-col h-full overflow-hidden">
          <section className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
            {/* Top header card shared across tabs */}
            <section className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="uppercase tracking-[0.18em] text-[10px] font-semibold text-blue-600">
                    Creator Dashboard
                  </p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-900">
                    {shop?.name || "Your Creator Hub"}
                  </h1>
                  {shop?.description && (
                    <p className="mt-1 text-sm text-zinc-500 max-w-xl">
                      {shop.description}
                    </p>
                  )}
                </div>
                {shop && (
                  <div className="text-right space-y-2">
                    <p className="text-xs text-zinc-500 font-medium">
                      Public page
                    </p>
                    <Link
                      href={`/${shop.slug}`}
                      target="_blank"
                      className="inline-flex items-center rounded-full bg-zinc-900 text-white px-4 py-2 text-xs font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      celite.in/{shop.slug}
                    </Link>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => router.push("/start-selling")}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Edit shop &amp; bank details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Alerts */}
            {(error || message) && (
              <div className="space-y-2">
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-2xl">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-2xl">
                    {message}
                  </div>
                )}
              </div>
            )}

            {/* Overview tab */}
            {active === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-900 mb-4">
                      Quick stats
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Total templates
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {templates.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Total downloads
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {totalDownloads}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Unique users for revenue
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {uniqueUserPeriods}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Each user counted once per 30 days across all your
                          templates.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Revenue
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          ₹{Math.round(revenue).toLocaleString('en-IN')}
                        </p>
                        {revenue > 0 && revenue < 800 && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            Minimum payout: ₹800
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-xs text-zinc-500 mb-1">
                        Public URL
                      </p>
                      <p className="text-xs font-mono text-zinc-800 break-all">
                        {shop
                          ? `celite.in/${shop.slug}`
                          : "Create your shop to get a URL"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-900 mb-2">
                      Recent templates
                    </h2>
                    {templates.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        No templates yet. Switch to &ldquo;My Templates&rdquo; to
                        add one.
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-100 text-sm">
                        {templates.slice(0, 5).map((tpl) => {
                          const status = getStatusLabel(tpl.status);
                          const statusClass =
                            tpl.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : tpl.status === "rejected"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100";

                          return (
                            <li
                              key={tpl.slug}
                              className="py-2 flex items-center justify-between gap-3"
                            >
                              <div>
                                <Link
                                  href={`/product/${tpl.slug}`}
                                  className="font-semibold text-zinc-900 hover:text-blue-600"
                                >
                                  {tpl.name}
                                </Link>
                                <p className="text-xs text-zinc-500">
                                  {tpl.downloadCount}{" "}
                                  {tpl.downloadCount === 1
                                    ? "download"
                                    : "downloads"}{" "}
                                  · {status}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-50 border border-zinc-100 text-zinc-500 font-mono">
                                  {tpl.slug}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}
                                >
                                  {status}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Shop details
                    </h3>
                    {shop ? (
                      <div className="space-y-1 text-xs text-zinc-600">
                        <p>
                          <span className="font-semibold">Name:</span>{" "}
                          {shop.name}
                        </p>
                        <p>
                          <span className="font-semibold">Slug:</span>{" "}
                          {shop.slug}
                        </p>
                        {shop.description && (
                          <p className="mt-1">{shop.description}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        No shop created yet.{" "}
                        <button
                          type="button"
                          onClick={() => router.push("/start-selling")}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Start selling
                        </button>
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Bank &amp; payouts
                    </h3>
                    {shop ? (
                      <div className="space-y-3 text-xs text-zinc-600">
                        {revenue > 0 && (
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 mb-3">
                            <p className="text-xs text-zinc-500 mb-1">
                              Current revenue
                            </p>
                            <p className="text-lg font-bold text-zinc-900">
                              ₹{Math.round(revenue).toLocaleString('en-IN')}
                            </p>
                            {revenue < 800 && (
                              <p className="text-[10px] text-amber-600 mt-1">
                                Minimum payout: ₹800
                              </p>
                            )}
                            {revenue >= 800 && (
                              <p className="text-[10px] text-emerald-600 mt-1">
                                Eligible for payout
                              </p>
                            )}
                          </div>
                        )}
                        <div className="space-y-1">
                          <p>
                            <span className="font-semibold">Account name:</span>{" "}
                            {shop.bank_account_name || "Not set"}
                          </p>
                          <p>
                            <span className="font-semibold">Account number:</span>{" "}
                            {shop.bank_account_number || "Not set"}
                          </p>
                          <p>
                            <span className="font-semibold">IFSC:</span>{" "}
                            {shop.bank_ifsc || "Not set"}
                          </p>
                          <p>
                            <span className="font-semibold">UPI ID:</span>{" "}
                            {shop.bank_upi_id || "Not set"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push("/start-selling")}
                          className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Edit bank details
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        Bank details will appear here after you create your
                        shop.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Templates tab */}
            {active === "templates" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-zinc-900">
                        Your templates
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setFormOpen(!formOpen);
                          if (!formOpen) resetForm();
                        }}
                        className="inline-flex items-center rounded-full bg-blue-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        {formOpen ? "Close" : "Add template"}
                      </button>
                    </div>

                    {/* Autofill Modal */}
                    {autofillOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm" onClick={() => { setAutofillOpen(false); setAutofillTemplateType(""); }}>
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-zinc-900">Autofill with AI</h2>
                              <p className="text-xs text-zinc-500">Generate title, description, tags & more</p>
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-zinc-700 mb-2">What kind of template is this?</label>
                            <input
                              type="text"
                              value={autofillTemplateType}
                              onChange={(e) => setAutofillTemplateType(e.target.value)}
                              placeholder="e.g., Cinematic logo reveal, Wedding invitation, YouTube intro"
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAutofill(); } }}
                            />
                            <p className="text-xs text-zinc-400 mt-2">Be specific for better results. Example: "Dark minimal logo reveal with particles"</p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => { setAutofillOpen(false); setAutofillTemplateType(""); }}
                              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAutofill}
                              disabled={autofillLoading || !autofillTemplateType.trim()}
                              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {autofillLoading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Generate
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {formOpen && (
                      <form
                        onSubmit={handleCreateTemplate}
                        className="space-y-3 mb-6"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Template name
                            </label>
                            <input
                              type="text"
                              value={form.name}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setForm((f) => ({
                                  ...f,
                                  name: newName,
                                  slug: slugManuallyEdited
                                    ? f.slug
                                    : generateSlug(newName),
                                }));
                              }}
                              required
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Slug
                            </label>
                            <input
                              type="text"
                              value={form.slug}
                              onChange={(e) => {
                                setSlugManuallyEdited(true);
                                setForm((f) => ({ ...f, slug: e.target.value }));
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              placeholder="auto-generated-from-name"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Category
                            </label>
                            <select
                              value={form.category_id}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  category_id: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                              <option value="">Select category</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Subcategory
                            </label>
                            <select
                              value={form.subcategory_id}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  subcategory_id: e.target.value,
                                  sub_subcategory_id: "",
                                }))
                              }
                              disabled={!form.category_id}
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                            >
                              <option value="">Select subcategory</option>
                              {filteredSubcategories.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Sub-Subcategory
                            </label>
                            <select
                              value={form.sub_subcategory_id}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  sub_subcategory_id: e.target.value,
                                }))
                              }
                              disabled={!form.subcategory_id}
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                            >
                              <option value="">Select sub-subcategory (Optional)</option>
                              {filteredSubSubcategories.map((subSub) => (
                                <option key={subSub.id} value={subSub.id}>
                                  {subSub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Video File (R2 Storage)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={uploadingVideo ? (form.video_path || `Uploading... ${uploadProgress.video}%`) : (form.video_path || '')}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, video_path: e.target.value }))
                                }
                                placeholder="Upload video to R2 or paste direct link"
                                className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                readOnly={uploadingVideo && !form.video_path}
                              />
                              <button
                                type="button"
                                onClick={() => videoInputRef.current?.click()}
                                disabled={uploadingVideo}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {uploadingVideo ? `Uploading ${uploadProgress.video}%${uploadSpeed.video ? ` • ${uploadSpeed.video}` : ''}` : 'Upload'}
                              </button>
                              <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('video', file); }} />
                            </div>
                            {uploadingVideo && (
                              <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-2 border-blue-200"></div>
                                    <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">Uploading video...</p>
                                    <p className="text-xs text-blue-600">{uploadProgress.video}% complete {uploadSpeed.video && `• ${uploadSpeed.video}`}</p>
                                  </div>
                                </div>
                                <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${uploadProgress.video}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {form.video_path && (
                              <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                                <video src={form.video_path} controls className="h-full w-full" />
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-1">Stored at: preview/video/category/subcategory/{'{templateFolder}'}/{'{filename}'}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Thumbnail Image (R2 Storage)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={uploadingThumbnail ? (form.thumbnail_path || `Uploading... ${uploadProgress.thumbnail}%`) : (form.thumbnail_path || '')}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, thumbnail_path: e.target.value }))
                                }
                                placeholder="Upload thumbnail to R2 or paste direct link"
                                className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                readOnly={uploadingThumbnail && !form.thumbnail_path}
                              />
                              <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                disabled={uploadingThumbnail}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {uploadingThumbnail ? `Uploading ${uploadProgress.thumbnail}%${uploadSpeed.thumbnail ? ` • ${uploadSpeed.thumbnail}` : ''}` : 'Upload'}
                              </button>
                              <input ref={thumbnailInputRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('thumbnail', file); }} />
                            </div>
                            {uploadingThumbnail && (
                              <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-2 border-emerald-200"></div>
                                    <div className="absolute inset-0 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-900">Uploading thumbnail...</p>
                                    <p className="text-xs text-emerald-600">{uploadProgress.thumbnail}% complete {uploadSpeed.thumbnail && `• ${uploadSpeed.thumbnail}`}</p>
                                  </div>
                                </div>
                                <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${uploadProgress.thumbnail}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {form.thumbnail_path && (
                              <div className="mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                                <img src={form.thumbnail_path} alt="Thumbnail preview" className="w-full h-auto" />
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-1">Stored at: preview/thumbnail/category/subcategory/{'{templateFolder}'}/{'{filename}'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Audio Preview (R2 Storage) - Optional
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={uploadingAudioPreview ? (form.audio_preview_path || `Uploading... ${uploadProgress.audio_preview}%`) : (form.audio_preview_path || '')}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, audio_preview_path: e.target.value }))
                                }
                                placeholder="Upload audio preview to R2 or paste direct link"
                                className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                readOnly={uploadingAudioPreview && !form.audio_preview_path}
                              />
                              <button
                                type="button"
                                onClick={() => audioPreviewInputRef.current?.click()}
                                disabled={uploadingAudioPreview}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {uploadingAudioPreview ? `Uploading ${uploadProgress.audio_preview}%${uploadSpeed.audio_preview ? ` • ${uploadSpeed.audio_preview}` : ''}` : 'Upload'}
                              </button>
                              <input ref={audioPreviewInputRef} type="file" accept="audio/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('audio_preview', file); }} />
                            </div>
                            {uploadingAudioPreview && (
                              <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-2 border-purple-200"></div>
                                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-t-transparent animate-spin"></div>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-purple-900">Uploading audio...</p>
                                    <p className="text-xs text-purple-600">{uploadProgress.audio_preview}% complete {uploadSpeed.audio_preview && `• ${uploadSpeed.audio_preview}`}</p>
                                  </div>
                                </div>
                                <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${uploadProgress.audio_preview}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {form.audio_preview_path && (
                              <div className="mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-2">
                                <audio src={form.audio_preview_path} controls className="w-full" />
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-1">Stored at: preview/audio/category/subcategory/{'{templateFolder}'}/{'{filename}'}</p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              3D Model Preview (R2 Storage) - Optional
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={uploadingModel3D ? (form.model_3d_path || `Uploading... ${uploadProgress.model_3d}%`) : (form.model_3d_path || '')}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, model_3d_path: e.target.value }))
                                }
                                placeholder="Upload 3D model to R2 or paste direct link"
                                className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                readOnly={uploadingModel3D && !form.model_3d_path}
                              />
                              <button
                                type="button"
                                onClick={() => model3DInputRef.current?.click()}
                                disabled={uploadingModel3D}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {uploadingModel3D ? `Uploading ${uploadProgress.model_3d}%${uploadSpeed.model_3d ? ` • ${uploadSpeed.model_3d}` : ''}` : 'Upload'}
                              </button>
                              <input ref={model3DInputRef} type="file" accept=".glb,.gltf,.obj" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('model_3d', file); }} />
                            </div>
                            {uploadingModel3D && (
                              <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-2 border-amber-200"></div>
                                    <div className="absolute inset-0 rounded-full border-2 border-amber-600 border-t-transparent animate-spin"></div>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-900">Uploading 3D model...</p>
                                    <p className="text-xs text-amber-600">{uploadProgress.model_3d}% complete {uploadSpeed.model_3d && `• ${uploadSpeed.model_3d}`}</p>
                                  </div>
                                </div>
                                <div className="w-full bg-amber-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${uploadProgress.model_3d}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {form.model_3d_path && (
                              <div className="mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-2">
                                <p className="text-xs text-zinc-600">3D Model: {form.model_3d_path}</p>
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-1">Stored at: preview/model/category/subcategory/{'{templateFolder}'}/{'{filename}'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Source File (R2 Storage)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={uploadingSource ? (form.source_path || `Uploading... ${uploadProgress.source}%`) : (form.source_path || '')}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    source_path: e.target.value,
                                  }))
                                }
                                placeholder="Upload to R2 or paste direct link"
                                className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                readOnly={uploadingSource && !form.source_path}
                              />
                              <button
                                type="button"
                                onClick={() => sourceInputRef.current?.click()}
                                disabled={uploadingSource}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {uploadingSource ? `Uploading ${uploadProgress.source}%${uploadSpeed.source ? ` • ${uploadSpeed.source}` : ''}` : 'Upload'}
                              </button>
                              <input ref={sourceInputRef} type="file" accept="application/zip,application/x-rar-compressed,.zip,.rar" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('source', file); }} />
                            </div>
                            {uploadingSource && (
                              <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-2 border-rose-200"></div>
                                    <div className="absolute inset-0 rounded-full border-2 border-rose-600 border-t-transparent animate-spin"></div>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-rose-900">Uploading source file...</p>
                                    <p className="text-xs text-rose-600">{uploadProgress.source}% complete {uploadSpeed.source && `• ${uploadSpeed.source}`}</p>
                                  </div>
                                </div>
                                <div className="w-full bg-rose-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${uploadProgress.source}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-1">Stored at: category/subcategory/{'{templateFolder}'}/{'{filename}'} (Private bucket: celite-source-files)</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Short description
                          </label>
                          <textarea
                            value={form.description}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                description: e.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            placeholder="Describe what this template includes."
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Features (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.features}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  features: e.target.value,
                                }))
                              }
                              placeholder="e.g. 4K, No plugin required"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Software used (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.software}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  software: e.target.value,
                                }))
                              }
                              placeholder="e.g. After Effects 2024"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Plugins used (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.plugins}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  plugins: e.target.value,
                                }))
                              }
                              placeholder="e.g. Element 3D, Optical Flares"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Tags (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.tags}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  tags: e.target.value,
                                }))
                              }
                              placeholder="e.g. intro, cinematic, title"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setAutofillOpen(true)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 text-xs font-semibold text-violet-700 hover:from-violet-100 hover:to-purple-100 transition-all flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Autofill with AI
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormOpen(false);
                              resetForm();
                            }}
                            className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                          >
                            {saving ? "Saving..." : "Save template"}
                          </button>
                        </div>
                      </form>
                    )}

                    {templates.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500">
                        No templates yet. Use &ldquo;Add template&rdquo; to
                        upload your first one.
                      </div>
                    ) : (
                      <ul className="divide-y divide-zinc-100 mt-2">
                        {templates.map((tpl) => {
                          const status = getStatusLabel(tpl.status);
                          const statusClass =
                            tpl.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : tpl.status === "rejected"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100";

                          return (
                            <li
                              key={tpl.slug}
                              className="py-3 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/product/${tpl.slug}`}
                                    className="text-sm font-semibold text-zinc-900 hover:text-blue-600"
                                  >
                                    {tpl.name}
                                  </Link>
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-mono">
                                    {tpl.slug}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                  {tpl.downloadCount}{" "}
                                  {tpl.downloadCount === 1
                                    ? "download"
                                    : "downloads"}{" "}
                                  {tpl.created_at && (
                                    <>
                                      · added{" "}
                                      {new Date(
                                        tpl.created_at
                                      ).toLocaleDateString()}
                                    </>
                                  )}{" "}
                                  · {status}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}
                                >
                                  {status}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/product/${tpl.slug}`}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    View
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(tpl.slug)}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Tips
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Use clear names and detailed descriptions so buyers can
                      quickly understand your template.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {/* Settings tab */}
            {active === "settings" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-zinc-900 mb-2">
                      Creator settings
                    </h2>
                    <p className="text-sm text-zinc-500 mb-4">
                      Manage your creator profile, shop and payout preferences.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/start-selling")}
                      className="inline-flex items-center rounded-xl bg-blue-600 text-white px-5 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Edit shop &amp; bank details
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Coming soon
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Additional creator settings will appear here in the next
                      iterations (notifications, payout preferences, etc.).
                    </p>
                  </div>
                </section>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="border-t border-zinc-200 py-4 px-6 text-center text-zinc-400 text-xs bg-white">
            &copy; {new Date().getFullYear()} Celite. Creator Panel.
          </footer>
        </div>
      </div>
    </main>
  );
}


