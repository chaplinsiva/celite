-- Migration: 54_add_sell_after_effects_templates_celite_market_blog.sql
-- Description: Adds comprehensive guide on how to sell After Effects templates on Celite Market

INSERT INTO public.blogs (
    slug,
    title,
    subtitle,
    excerpt,
    cover_image,
    category,
    category_slug,
    tags,
    author_name,
    author_role,
    author_avatar,
    author_bio,
    read_time,
    featured,
    status,
    meta_title,
    meta_description,
    keywords,
    content_html,
    faqs,
    published_at,
    created_at,
    updated_at
) VALUES (
    'how-to-sell-after-effects-templates-on-celite-market-guide',
    'How to Sell After Effects Templates on Celite Market: Complete Step-by-Step Creator Guide (2026)',
    'Turn your motion graphics skills into recurring passive income with direct sales on Celite Market and the 40% subscription revenue pool.',
    'Discover how to package, upload, and sell After Effects video templates on Celite Market. Learn technical project preparation, pricing strategies, dual-earning monetization, and how to reach thousands of video editors worldwide.',
    '/hero_ae_template.png',
    'Creator Workflow',
    'creator-workflow',
    ARRAY['After Effects', 'Celite Market', 'Sell Templates', 'Motion Design', 'Passive Income', 'Video Templates', 'Creator Economy', 'Video Editing'],
    'Celite Creative Team',
    'Motion Design & Marketplace Specialists',
    '/PNG1.png',
    'Written and curated by Celite’s in-house motion designers and marketplace economists. Dedicated to empowering creators with industry-standard workflows and monetization models.',
    '8 min read',
    true,
    'published',
    'How to Sell After Effects Templates on Celite Market (2026 Guide) • Celite',
    'Complete guide on how to sell After Effects video templates on Celite Market. Step-by-step project packaging, direct market pricing, 40% subscription pool earnings, and creator onboarding.',
    ARRAY['sell after effects templates', 'celite market', 'sell ae templates online', 'motion graphics passive income', 'video templates marketplace', 'how to sell templates on celite', 'after effects template creator guide'],
    '<div class="blog-content-container space-y-8 text-zinc-300 leading-relaxed">
  <p class="text-lg sm:text-xl font-medium text-zinc-200 leading-relaxed">
    If you are an After Effects motion designer, video editor, or VFX artist, your hard drive is likely filled with custom project files, transitions, typography hierarchies, and broadcast animations. Instead of letting those project files gather digital dust, you can transform them into a reliable, recurring passive income stream by selling them on <strong class="text-white font-bold">Celite Market</strong>.
  </p>

  <div class="p-5 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-blue-900/30 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
    <h4 class="text-white font-bold text-base mb-2 flex items-center gap-2">
      <span>💡</span> Why Motion Designers Are Moving to Celite Market in 2026
    </h4>
    <p class="text-sm text-zinc-300">
      Traditional global asset marketplaces often trap creators with high 50–70% commission cuts, complicated foreign tax withholding (W-8BEN), and multi-month payout delays. <strong class="text-white">Celite Market</strong> was built specifically for Indian and international digital creators with direct bank/UPI payouts, fair revenue splits, and a dual-earning monetization model combining direct asset sales and subscription pool royalties.
    </p>
  </div>

  <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight border-b border-zinc-800 pb-3 pt-4">
    1. Understanding Celite Market vs Celite Subscription
  </h2>
  <p>
    When you upload After Effects templates to Celite, your assets unlock two distinct monetization channels:
  </p>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
    <div class="p-5 rounded-xl bg-zinc-900/80 border border-blue-500/30">
      <h3 class="text-lg font-bold text-blue-400 mb-2">🛒 Celite Market (Direct Individual Sales)</h3>
      <p class="text-sm text-zinc-300">
        Clients, agencies, and wedding editors who need a single specific template can buy your asset directly (e.g. ₹399, ₹799, ₹1,499). You receive direct earnings for each sale straight to your creator balance.
      </p>
    </div>
    <div class="p-5 rounded-xl bg-zinc-900/80 border border-indigo-500/30">
      <h3 class="text-lg font-bold text-indigo-400 mb-2">🔄 Celite Subscription (40% Creator Pool)</h3>
      <p class="text-sm text-zinc-300">
        Monthly and yearly subscribers get unlimited downloads. Every time a subscriber downloads your template, you earn recurring royalties from the 40% platform creator pool distributed proportionally every month.
      </p>
    </div>
  </div>

  <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight border-b border-zinc-800 pb-3 pt-4">
    2. Step-by-Step: Setting Up Your Creator Shop
  </h2>
  <p>
    Starting your shop on Celite takes less than 2 minutes:
  </p>
  <ol class="list-decimal pl-6 space-y-3">
    <li><strong class="text-white">Sign In or Create Account</strong>: Visit <a href="/start-selling" class="text-blue-400 hover:underline font-semibold">celite.in/start-selling</a> and register with your email or Google account.</li>
    <li><strong class="text-white">Customize Your Shop Profile</strong>: Navigate to <code class="bg-zinc-800 px-2 py-0.5 rounded text-blue-300 text-xs">/creator/dashboard</code> and add your Shop Name, Brand Logo, Bio, and social links (Behance, YouTube, Instagram).</li>
    <li><strong class="text-white">Set Payout Information</strong>: Add your Indian Bank Account (Account Number + IFSC) or UPI ID for seamless automated monthly payouts.</li>
  </ol>

  <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight border-b border-zinc-800 pb-3 pt-4">
    3. Technical Standards for High-Selling After Effects Templates
  </h2>
  <p>
    To ensure your templates are approved quickly and earn 5-star reviews from video editors, follow these industry-standard project guidelines:
  </p>

  <div class="space-y-4 my-6">
    <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <h4 class="font-bold text-white mb-1">📁 1. Clean & Intuitive Folder Organization</h4>
      <p class="text-sm text-zinc-400">
        Structure your AE project with clearly labeled master compositions:
      </p>
      <pre class="bg-zinc-950 p-3 rounded-lg text-xs text-blue-300 font-mono mt-2 overflow-x-auto">
📁 01_EDIT_COMPOSITIONS/
   ├── 📝 Edit_Text_Here
   ├── 🖼️ Drop_Media_Here
   └── 🎨 Color_Controllers
📁 02_ASSETS_INTERNAL/
📁 03_FINAL_RENDER/
   └── 🎬 Render_Composition_1080p_60fps</pre>
    </div>

    <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <h4 class="font-bold text-white mb-1">🎛️ 2. Global Color & Customization Null Layer</h4>
      <p class="text-sm text-zinc-400">
        Add a dedicated Null object named <code class="text-blue-300">_CONTROL_PANEL</code> with Effect Controls (Color Controls, Checkbox Controls for light/dark mode, and Slider Controls for timing adjustments). This allows non-technical clients to customize everything in seconds.
      </p>
    </div>

    <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <h4 class="font-bold text-white mb-1">🔤 3. Universal Font Usage</h4>
      <p class="text-sm text-zinc-400">
        Always use 100% free Google Fonts or open-source typography (e.g., Montserrat, Poppins, Playfair Display, Cinzel). Include direct download links to the fonts in a <code class="text-blue-300">Fonts_Used.txt</code> file inside your package.
      </p>
    </div>

    <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <h4 class="font-bold text-white mb-1">⚡ 4. No 3rd Party Plugin Dependency</h4>
      <p class="text-sm text-zinc-400">
        Build templates using native After Effects shape layers, expressions, and built-in effects. If you use optical flares or 3D particles, always include pre-rendered video passes so clients do not need expensive plugins to render their video.
      </p>
    </div>
  </div>

  <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight border-b border-zinc-800 pb-3 pt-4">
    4. Preparing Packaging Assets: ZIP, Video Preview & Thumbnail
  </h2>
  <p>
    Every template submission requires three files:
  </p>

  <ul class="space-y-3 my-4">
    <li class="flex items-start gap-3">
      <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-xs font-bold shrink-0 mt-1">.ZIP</span>
      <div>
        <strong class="text-white">Main Asset Archive:</strong> Contains your cleaned <code class="text-blue-300">.aep</code> project file, tutorial PDF/video, and asset assets (textures, royalty-free audio cues).
      </div>
    </li>
    <li class="flex items-start gap-3">
      <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold shrink-0 mt-1">.MP4</span>
      <div>
        <strong class="text-white">Full HD Video Preview:</strong> 1080p (1920x1080) or 4K 30/60fps H.264 video demonstrating the full animation, transitions, and audio sync.
      </div>
    </li>
    <li class="flex items-start gap-3">
      <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold shrink-0 mt-1">.PNG</span>
      <div>
        <strong class="text-white">Cover Thumbnail:</strong> High-impact 1920x1080 graphic featuring a dynamic still from your video, software badge (AE), and bold typography.
      </div>
    </li>
  </ul>

  <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight border-b border-zinc-800 pb-3 pt-4">
    5. Top Selling After Effects Categories on Celite
  </h2>
  <p>
    If you want to maximize your sales velocity on Celite Market, focus on these high-demand niches:
  </p>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
    <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
      <span class="text-2xl">💍</span>
      <div>
        <div class="font-bold text-white text-sm">Wedding & Save the Date</div>
        <div class="text-xs text-zinc-400">Indian traditional, royal golden, cinematic invites</div>
      </div>
    </div>
    <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
      <span class="text-2xl">📱</span>
      <div>
        <div class="font-bold text-white text-sm">Instagram Reels & YouTube Shorts</div>
        <div class="text-xs text-zinc-400">Fast kinetic typography, hooks, split screens</div>
      </div>
    </div>
    <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
      <span class="text-2xl">✨</span>
      <div>
        <div class="font-bold text-white text-sm">Logo Reveals & Intro Stings</div>
        <div class="text-xs text-zinc-400">Cyberpunk, minimal 3D, particle explosion intros</div>
      </div>
    </div>
    <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
      <span class="text-2xl">🎥</span>
      <div>
        <div class="font-bold text-white text-sm">Broadcast Titles & Lower Thirds</div>
        <div class="text-xs text-zinc-400">Podcast lower thirds, modern clean title cards</div>
      </div>
    </div>
  </div>

  <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight border-b border-zinc-800 pb-3 pt-4">
    6. How Payouts and Revenue Work
  </h2>
  <p>
    Celite gives creators full transparent access to live analytics:
  </p>
  <ul class="list-disc pl-6 space-y-2">
    <li><strong class="text-white">Real-Time Dashboard:</strong> Track page views, direct sales, and subscription downloads live.</li>
    <li><strong class="text-white">Direct Payouts:</strong> Earnings are transferred automatically every month to your registered Indian Bank Account or UPI ID with zero foreign exchange deduction fees.</li>
    <li><strong class="text-white">Non-Exclusive Ownership:</strong> You retain full copyright to your work. You are free to sell your templates on your own personal website or other stores simultaneously.</li>
  </ul>

  <div class="mt-8 p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-cyan-600/20 border border-blue-400/40 text-center">
    <h3 class="text-xl sm:text-2xl font-black text-white mb-2">Ready to Launch Your Template Shop?</h3>
    <p class="text-sm text-zinc-300 max-w-xl mx-auto mb-5">
      Join hundreds of motion designers earning passive income every month. Upload your first After Effects template to Celite Market today.
    </p>
    <a href="/start-selling" class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-sm shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300">
      <span>Open Creator Shop on Celite</span>
      <span>→</span>
    </a>
  </div>
</div>',
    '[
      {"question": "How much can I earn selling After Effects templates on Celite Market?", "answer": "Earnings depend on your asset quality and category demand. Top creators earn between ₹25,000 to ₹1,50,000+ monthly through a combination of individual template sales on Celite Market and monthly subscription pool distributions."},
      {"question": "Do I retain copyright of the templates I upload to Celite?", "answer": "Yes. You retain 100% intellectual property and copyright of your project files. Celite only licenses the rights to distribute the templates to buyers and subscribers."},
      {"question": "Can I use third-party plugins in my After Effects templates?", "answer": "We recommend building templates using native After Effects effects to ensure universal compatibility. If third-party plugins (like Element 3D or Trapcode) are used, you must provide pre-rendered background passes so users without those plugins can still render their projects seamlessly."},
      {"question": "How and when do creators receive payouts on Celite?", "answer": "Creator earnings are calculated at the end of each billing cycle and paid out directly via UPI or NEFT/IMPS bank transfer into Indian bank accounts with zero foreign remittance fee losses."}
    ]'::jsonb,
    now(),
    now(),
    now()
)
ON CONFLICT (slug)
DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    excerpt = EXCLUDED.excerpt,
    cover_image = EXCLUDED.cover_image,
    category = EXCLUDED.category,
    category_slug = EXCLUDED.category_slug,
    tags = EXCLUDED.tags,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description,
    keywords = EXCLUDED.keywords,
    content_html = EXCLUDED.content_html,
    faqs = EXCLUDED.faqs,
    updated_at = now();
