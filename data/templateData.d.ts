export type Template = {
  slug: string;
  name: string;
  subtitle: string;
  desc: string;
  price: number;
  img: string;
  video: string | null;
  features: string[];
  software: string[];
  plugins: string[];
  tags?: string[];
  isFeatured?: boolean;
  feature?: boolean;
  is_featured?: boolean;
};

export declare const templates: Template[];

export declare function getTemplateBySlug(slug: string): Template | undefined;

export declare function getFeaturedTemplates(limit?: number): Template[];

