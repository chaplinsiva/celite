-- Migration: Move "Save Date" from a top-level category to a sub-subcategory
-- Path: Video Templates > After Effects > Save Date
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- Before running, verify your category/subcategory IDs match your database.

-- Step 1: Get the Video Templates category ID
-- (Adjust if your slug differs)
DO $$
DECLARE
  v_video_templates_cat_id UUID;
  v_after_effects_subcat_id UUID;
  v_save_date_cat_id UUID;
  v_save_date_sub_subcat_id UUID;
BEGIN
  -- Get Video Templates category
  SELECT id INTO v_video_templates_cat_id
  FROM categories
  WHERE slug = 'video-templates'
  LIMIT 1;

  IF v_video_templates_cat_id IS NULL THEN
    RAISE EXCEPTION 'Video Templates category not found';
  END IF;

  -- Get or create "After Effects" subcategory under Video Templates
  SELECT id INTO v_after_effects_subcat_id
  FROM subcategories
  WHERE category_id = v_video_templates_cat_id
    AND (slug = 'after-effects' OR slug = 'after-effects-templates')
  LIMIT 1;

  IF v_after_effects_subcat_id IS NULL THEN
    INSERT INTO subcategories (category_id, name, slug)
    VALUES (v_video_templates_cat_id, 'After Effects Templates', 'after-effects')
    RETURNING id INTO v_after_effects_subcat_id;
    RAISE NOTICE 'Created After Effects subcategory: %', v_after_effects_subcat_id;
  ELSE
    RAISE NOTICE 'Found existing After Effects subcategory: %', v_after_effects_subcat_id;
  END IF;

  -- Get or create "Save Date" sub-subcategory under After Effects
  SELECT id INTO v_save_date_sub_subcat_id
  FROM sub_subcategories
  WHERE subcategory_id = v_after_effects_subcat_id
    AND slug = 'save-date'
  LIMIT 1;

  IF v_save_date_sub_subcat_id IS NULL THEN
    INSERT INTO sub_subcategories (subcategory_id, name, slug)
    VALUES (v_after_effects_subcat_id, 'Save Date', 'save-date')
    RETURNING id INTO v_save_date_sub_subcat_id;
    RAISE NOTICE 'Created Save Date sub-subcategory: %', v_save_date_sub_subcat_id;
  ELSE
    RAISE NOTICE 'Found existing Save Date sub-subcategory: %', v_save_date_sub_subcat_id;
  END IF;

  -- Get the old Save Date category ID
  SELECT id INTO v_save_date_cat_id
  FROM categories
  WHERE slug = 'save-date'
  LIMIT 1;

  IF v_save_date_cat_id IS NOT NULL THEN
    -- Step 2: Reassign all templates from old Save Date category to new hierarchy
    UPDATE templates
    SET
      category_id = v_video_templates_cat_id,
      subcategory_id = v_after_effects_subcat_id,
      sub_subcategory_id = v_save_date_sub_subcat_id
    WHERE category_id = v_save_date_cat_id;

    RAISE NOTICE 'Migrated % templates from Save Date category to sub-subcategory',
      (SELECT COUNT(*) FROM templates WHERE sub_subcategory_id = v_save_date_sub_subcat_id);

    -- Step 3: Optionally delete the old Save Date category
    -- Uncomment the line below after verifying the migration was successful
    -- DELETE FROM categories WHERE id = v_save_date_cat_id;
    RAISE NOTICE 'Old Save Date category ID: % (not deleted - uncomment DELETE to remove)', v_save_date_cat_id;
  ELSE
    RAISE NOTICE 'No Save Date category found - templates may already be migrated';
  END IF;

  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'Video Templates category: %', v_video_templates_cat_id;
  RAISE NOTICE 'After Effects subcategory: %', v_after_effects_subcat_id;
  RAISE NOTICE 'Save Date sub-subcategory: %', v_save_date_sub_subcat_id;
END $$;
