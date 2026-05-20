-- ============================================================================
-- OLD TEMPLATE DATA - SAMPLE INSERT STATEMENTS
-- ============================================================================
-- This file contains sample template data in SQL INSERT format.
-- Adjust category_id, subcategory_id, and creator_shop_id values based on your actual database.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SAMPLE TEMPLATES FOR AFTER EFFECTS CATEGORY
-- ============================================================================

-- Template 1: Logo Reveal Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags, is_featured, is_limited_offer,
  category_id, subcategory_id, status, meta_title, meta_description,
  created_at, updated_at
) VALUES (
  'premium-logo-reveal-01',
  'Premium Logo Reveal',
  'Professional logo animation template',
  'A stunning logo reveal animation perfect for brand introductions. Features smooth transitions, particle effects, and customizable colors.',
  2999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'after-effects/logo-reveal/premium-logo-reveal-01.zip',
  '["4K Resolution", "Easy Customization", "Color Controls", "Particle Effects", "Sound Effects Included"]'::jsonb,
  '["After Effects CC 2020+"]'::jsonb,
  '["Trapcode Particular", "Optical Flares"]'::jsonb,
  '["logo", "reveal", "animation", "corporate", "brand"]'::jsonb,
  true,
  false,
  (SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'logo-reveal' LIMIT 1),
  'approved',
  'Premium Logo Reveal - After Effects Template',
  'Professional logo reveal animation template with particle effects and customizable colors. Perfect for brand introductions.',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '5 days'
) ON CONFLICT (slug) DO NOTHING;

-- Template 2: Motion Graphics Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags, is_featured,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'modern-motion-graphics-pack',
  'Modern Motion Graphics Pack',
  'Versatile motion graphics collection',
  'A comprehensive collection of modern motion graphics elements including transitions, backgrounds, and animated shapes.',
  4999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'after-effects/motion-graphics/modern-pack.zip',
  '["100+ Elements", "4K Resolution", "Modular Design", "No Plugins Required"]'::jsonb,
  '["After Effects CC 2019+"]'::jsonb,
  '[]'::jsonb,
  '["motion graphics", "elements", "transitions", "modern", "versatile"]'::jsonb,
  true,
  (SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'motion-graphics' LIMIT 1),
  'approved',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '3 days'
) ON CONFLICT (slug) DO NOTHING;

-- Template 3: Lower Thirds Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'elegant-lower-thirds',
  'Elegant Lower Thirds',
  'Professional lower third graphics',
  'Beautiful lower third graphics with smooth animations. Perfect for interviews, documentaries, and corporate videos.',
  1999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'after-effects/lower-thirds/elegant-lower-thirds.zip',
  '["10+ Styles", "Easy Text Editing", "Color Customization", "HD & 4K"]'::jsonb,
  '["After Effects CC 2020+"]'::jsonb,
  '[]'::jsonb,
  '["lower thirds", "graphics", "professional", "interviews"]'::jsonb,
  (SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'lower-thirds' LIMIT 1),
  'approved',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '2 days'
) ON CONFLICT (slug) DO NOTHING;

-- Template 4: Title Animation Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags, is_limited_offer, limited_offer_duration_days,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'cinematic-title-sequence',
  'Cinematic Title Sequence',
  'Hollywood-style title animations',
  'Create stunning cinematic title sequences with this professional template. Includes multiple style variations.',
  3999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'after-effects/titles/cinematic-title-sequence.zip',
  '["Multiple Styles", "4K Resolution", "Cinematic Look", "Sound Design Included"]'::jsonb,
  '["After Effects CC 2021+"]'::jsonb,
  '["Trapcode Form"]'::jsonb,
  '["titles", "cinematic", "hollywood", "sequence"]'::jsonb,
  true,
  7,
  (SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'titles' LIMIT 1),
  'approved',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SAMPLE TEMPLATES FOR WEBSITE TEMPLATES CATEGORY
-- ============================================================================

-- Template 5: Landing Page Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags, is_featured,
  category_id, subcategory_id, status, meta_title, meta_description,
  created_at, updated_at
) VALUES (
  'modern-landing-page-html',
  'Modern Landing Page',
  'Responsive HTML landing page template',
  'A beautiful, fully responsive landing page template built with HTML5, CSS3, and JavaScript. Perfect for startups and businesses.',
  2999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'website-templates/landing-page/modern-landing-page.zip',
  '["Fully Responsive", "Mobile First", "Modern Design", "SEO Optimized", "Cross Browser Compatible"]'::jsonb,
  '["HTML5", "CSS3", "JavaScript"]'::jsonb,
  '[]'::jsonb,
  '["landing page", "responsive", "modern", "html", "startup"]'::jsonb,
  true,
  (SELECT id FROM public.categories WHERE slug = 'website-templates' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'landing-page' LIMIT 1),
  'approved',
  'Modern Landing Page - Responsive HTML Template',
  'Beautiful, fully responsive landing page template perfect for startups and businesses. Built with HTML5, CSS3, and JavaScript.',
  NOW() - INTERVAL '28 days',
  NOW() - INTERVAL '4 days'
) ON CONFLICT (slug) DO NOTHING;

-- Template 6: Portfolio Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'creative-portfolio-website',
  'Creative Portfolio Website',
  'Showcase your work beautifully',
  'A stunning portfolio website template designed for creatives, designers, and photographers. Features smooth animations and modern design.',
  3999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'website-templates/portfolio/creative-portfolio.zip',
  '["Portfolio Gallery", "Contact Form", "Blog Section", "Smooth Animations", "Dark Mode"]'::jsonb,
  '["HTML5", "CSS3", "JavaScript", "jQuery"]'::jsonb,
  '[]'::jsonb,
  '["portfolio", "creative", "designer", "photography", "showcase"]'::jsonb,
  (SELECT id FROM public.categories WHERE slug = 'website-templates' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'portfolio' LIMIT 1),
  'approved',
  NOW() - INTERVAL '22 days',
  NOW() - INTERVAL '6 days'
) ON CONFLICT (slug) DO NOTHING;

-- Template 7: E-commerce Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags, is_featured,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'responsive-ecommerce-store',
  'Responsive E-commerce Store',
  'Complete online store template',
  'A complete e-commerce website template with shopping cart, product pages, checkout, and admin panel. Built with modern web technologies.',
  5999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'website-templates/e-commerce/responsive-store.zip',
  '["Shopping Cart", "Product Pages", "Checkout System", "Admin Panel", "Payment Integration Ready"]'::jsonb,
  '["HTML5", "CSS3", "JavaScript", "PHP", "MySQL"]'::jsonb,
  '[]'::jsonb,
  '["ecommerce", "store", "shopping", "online", "business"]'::jsonb,
  true,
  (SELECT id FROM public.categories WHERE slug = 'website-templates' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'e-commerce' LIMIT 1),
  'approved',
  NOW() - INTERVAL '18 days',
  NOW() - INTERVAL '7 days'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SAMPLE TEMPLATES FOR PSD TEMPLATES CATEGORY
-- ============================================================================

-- Template 8: Business Card Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'modern-business-cards-psd',
  'Modern Business Cards',
  'Professional business card designs',
  'A collection of 10 modern business card designs in PSD format. Fully editable with organized layers and smart objects.',
  999.00,
  NULL,
  'psd-templates/business-cards/modern-business-cards.zip',
  '["10 Designs", "Fully Editable", "Print Ready", "300 DPI", "CMYK Color Mode"]'::jsonb,
  '["Adobe Photoshop CC 2019+"]'::jsonb,
  '[]'::jsonb,
  '["business cards", "print", "professional", "design", "psd"]'::jsonb,
  (SELECT id FROM public.categories WHERE slug = 'psd-templates' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'business-cards' LIMIT 1),
  'approved',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (slug) DO NOTHING;

-- Template 9: Flyer Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags, is_limited_offer,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'event-flyer-template-pack',
  'Event Flyer Template Pack',
  'Professional event flyer designs',
  'A collection of 15 professional event flyer templates. Perfect for concerts, conferences, workshops, and more.',
  1999.00,
  NULL,
  'psd-templates/flyers/event-flyer-pack.zip',
  '["15 Designs", "Print Ready", "300 DPI", "CMYK", "Fully Customizable"]'::jsonb,
  '["Adobe Photoshop CC 2020+"]'::jsonb,
  '[]'::jsonb,
  '["flyer", "event", "print", "design", "promotion"]'::jsonb,
  true,
  (SELECT id FROM public.categories WHERE slug = 'psd-templates' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'flyers' LIMIT 1),
  'approved',
  NOW() - INTERVAL '10 days',
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Template 10: Social Media Template
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags,
  category_id, subcategory_id, status,
  created_at, updated_at
) VALUES (
  'social-media-graphics-pack',
  'Social Media Graphics Pack',
  'Instagram, Facebook, Twitter templates',
  'A comprehensive pack of social media graphics including Instagram posts, stories, Facebook covers, and Twitter headers.',
  1499.00,
  NULL,
  'psd-templates/social-media/graphics-pack.zip',
  '["50+ Templates", "All Platforms", "Square & Story Formats", "RGB Color Mode"]'::jsonb,
  '["Adobe Photoshop CC 2019+"]'::jsonb,
  '[]'::jsonb,
  '["social media", "instagram", "facebook", "twitter", "graphics"]'::jsonb,
  (SELECT id FROM public.categories WHERE slug = 'psd-templates' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'social-media' LIMIT 1),
  'approved',
  NOW() - INTERVAL '8 days',
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- ADDITIONAL TEMPLATES WITH CREATOR/VENDOR INFORMATION
-- ============================================================================

-- Template 11: With Creator Shop (if creator_shops table exists)
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags, is_featured,
  category_id, subcategory_id, status, creator_shop_id, vendor_name,
  preview_path, video_path, thumbnail_path,
  created_at, updated_at
) VALUES (
  'advanced-transition-pack',
  'Advanced Transition Pack',
  'Professional video transitions',
  'A collection of 20+ professional video transitions for After Effects. Smooth, cinematic, and easy to customize.',
  3499.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'after-effects/transitions/advanced-transition-pack.zip',
  '["20+ Transitions", "4K Resolution", "Easy Customization", "No Plugins Required"]'::jsonb,
  '["After Effects CC 2020+"]'::jsonb,
  '[]'::jsonb,
  '["transitions", "video", "cinematic", "professional"]'::jsonb,
  true,
  (SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'transitions' LIMIT 1),
  'approved',
  NULL, -- Set this to actual creator_shop_id if available
  'Celite Studios',
  'after-effects/transitions/preview/advanced-transition-pack.jpg',
  'after-effects/transitions/video/advanced-transition-pack.mp4',
  'after-effects/transitions/thumbnail/advanced-transition-pack-thumb.jpg',
  NOW() - INTERVAL '35 days',
  NOW() - INTERVAL '10 days'
) ON CONFLICT (slug) DO NOTHING;

-- Template 12: With Meta Information
INSERT INTO public.templates (
  slug, name, subtitle, description, price, video, source_path,
  features, software, plugins, tags,
  category_id, subcategory_id, status,
  meta_title, meta_description,
  created_at, updated_at
) VALUES (
  'corporate-website-template',
  'Corporate Website Template',
  'Professional business website',
  'A complete corporate website template with modern design, responsive layout, and all essential pages for businesses.',
  4999.00,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'website-templates/corporate/corporate-website.zip',
  '["Responsive Design", "Multiple Pages", "Contact Form", "Blog Section", "SEO Optimized"]'::jsonb,
  '["HTML5", "CSS3", "JavaScript", "Bootstrap"]'::jsonb,
  '[]'::jsonb,
  '["corporate", "business", "website", "professional", "responsive"]'::jsonb,
  (SELECT id FROM public.categories WHERE slug = 'website-templates' LIMIT 1),
  (SELECT id FROM public.subcategories WHERE slug = 'corporate' LIMIT 1),
  'approved',
  'Corporate Website Template - Professional Business Website',
  'Complete corporate website template with modern design, responsive layout, and all essential pages. Perfect for businesses.',
  NOW() - INTERVAL '40 days',
  NOW() - INTERVAL '8 days'
) ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check inserted templates
-- SELECT 
--   slug, 
--   name, 
--   price, 
--   is_featured,
--   status,
--   created_at
-- FROM public.templates
-- ORDER BY created_at DESC;

-- Count templates by category
-- SELECT 
--   c.name as category,
--   COUNT(t.slug) as template_count
-- FROM public.categories c
-- LEFT JOIN public.templates t ON t.category_id = c.id
-- GROUP BY c.id, c.name
-- ORDER BY template_count DESC;
