export type Template = {
  slug: string;
  name: string;
  subtitle: string;
  desc: string;
  price: number;
  img: string;
  video?: string | null; // Deprecated: Use video_path instead
  video_path?: string | null;
  thumbnail_path?: string | null;
  features: string[];
  software: string[];
  plugins: string[];
  tags?: string[];
  isFeatured?: boolean;
  feature?: boolean;
  is_featured?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  is_free?: boolean;
};

export declare const templates: Template[];

export declare function getTemplateBySlug(slug: string): Template | undefined;

export declare function getFeaturedTemplates(limit?: number): Template[];

