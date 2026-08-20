-- agent-notes: { ctx: "Add whatsapp_sent and email_sent tracking columns to checkout_details", deps: ["checkout_details"], state: active, last: "sato@2026-08-20" }
-- =========================================================
-- Migration: 54_add_contact_sent_flags_to_checkout_details.sql
-- Description: Track whether WhatsApp and Email logs/notifications were sent to customers
-- =========================================================

ALTER TABLE public.checkout_details
    ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_checkout_details_wa_sent ON public.checkout_details(whatsapp_sent);
CREATE INDEX IF NOT EXISTS idx_checkout_details_em_sent ON public.checkout_details(email_sent);
