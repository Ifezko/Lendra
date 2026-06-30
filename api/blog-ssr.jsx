/**
 * Lendra Blog SSR — Standalone serverless function.
 * Plain JavaScript, zero TypeScript, zero Fastify dependency.
 * Direct Supabase REST calls → fully rendered HTML returned to client.
 *
 * Routes handled (all via vercel.json rewrites):
 *   GET /blog                        → blog listing
 *   GET /blog/sitemap.xml            → XML sitemap
 *   GET /blog/feed.xml               → RSS feed
 *   GET /blog/category/:cat          → category listing
 *   GET /blog/tag/:tag               → tag listing
 *   GET /blog/:slug                  → article SSR (SEO / AEO / GEO)
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_URL = process.env.VITE_APP_URL || 'https://lendra.finance';

// ── Supabase helpers ────────────────────────────────────────────────────────

async function sbSelect(table, qs = '') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase not configured');
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── HTML helpers ────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d || '';
  }
}

function blogShell({
  title,
  description,
  ogImage,
  canonicalPath,
  schemaBlocks = [],
  bodyHtml,
  ogType = 'website',
}) {
  const fullUrl = `${APP_URL}${canonicalPath}`;
  const schemaScripts = schemaBlocks
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(fullUrl)}" />
<meta name="robots" content="index, follow" />

<!-- Open Graph -->
<meta property="og:type" content="${ogType}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(fullUrl)}" />
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />` : ''}
<meta property="og:site_name" content="Lendra" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@lendrafinance" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}" />` : ''}

<link rel="icon" type="image/x-icon" href="${APP_URL}/favicon.ico" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

${schemaScripts}

<style>
:root{--bg:#0A0A0F;--accent:#EC81FF;--accent-dark:#B84FCC;--card:#12121A;--border:#1E1E2A;--text:#E0E0E8;--muted:#ADADB5}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
img{max-width:100%}

/* Header */
.hdr{position:sticky;top:0;z-index:50;background:rgba(10,10,15,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}
.hdr-in{max-width:1200px;margin:0 auto;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo img{width:32px;height:32px;border-radius:8px}
.logo span{font-weight:700;font-size:17px;color:#fff}
.logo em{font-style:normal;font-size:13px;color:var(--muted);margin-left:2px;font-weight:400}
.nav{display:flex;gap:20px;align-items:center}
.nav a{color:var(--muted);font-size:13px;font-weight:500;transition:color .15s}
.nav a:hover{color:#fff;text-decoration:none}
.nav .cta{background:var(--accent);color:#0A0A0F;padding:7px 18px;border-radius:10px;font-weight:700;font-size:12px}
.nav .cta:hover{opacity:.9;text-decoration:none}

/* Layout */
.wrap{max-width:860px;margin:0 auto;padding:44px 24px 88px}
.wrap-wide{max-width:1200px;margin:0 auto;padding:44px 24px 88px}

/* Blog Hero */
.blog-hero{text-align:center;margin-bottom:52px}
.blog-hero h1{font-size:42px;font-weight:800;letter-spacing:-.03em;line-height:1.15;background:linear-gradient(135deg,#fff 0%,var(--accent) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
.blog-hero p{color:var(--muted);font-size:17px;max-width:560px;margin:0 auto}

/* Post Grid */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .2s,transform .2s}
.card:hover{border-color:rgba(236,129,255,.35);transform:translateY(-2px)}
.card a{text-decoration:none;color:inherit;display:block}
.card-img{width:100%;height:200px;object-fit:cover;display:block}
.card-img-placeholder{width:100%;height:200px;background:linear-gradient(135deg,#12121A,#1a1a2e)}
.card-body{padding:20px}
.card-meta{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:11px;color:var(--muted);flex-wrap:wrap}
.cat-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.card h2{font-size:17px;font-weight:700;color:#fff;margin-bottom:8px;line-height:1.35}
.card p{font-size:13px;color:var(--muted);line-height:1.65}

/* Article */
.article-hdr{margin-bottom:32px}
.article-hdr h1{font-size:38px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-.025em;margin:12px 0 18px}
.article-meta{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;flex-wrap:wrap}
.dot{width:3px;height:3px;border-radius:50%;background:var(--muted);flex-shrink:0}
.cover{width:100%;border-radius:16px;margin-bottom:36px;max-height:460px;object-fit:cover}
.qa-box{background:rgba(236,129,255,.06);border:1px solid rgba(236,129,255,.18);border-radius:12px;padding:16px 20px;margin-bottom:32px}
.qa-box .qa-label{font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
.qa-box p{font-size:15px;color:var(--text);line-height:1.65}

/* Article body */
.body{font-size:17px;line-height:1.85;color:var(--text)}
.body h2{font-size:26px;font-weight:700;color:#fff;margin:40px 0 14px;letter-spacing:-.02em}
.body h3{font-size:20px;font-weight:600;color:#fff;margin:32px 0 10px}
.body h4{font-size:17px;font-weight:600;color:#fff;margin:24px 0 8px}
.body p{margin-bottom:20px}
.body ul,.body ol{margin:0 0 20px 22px}
.body li{margin-bottom:6px}
.body blockquote{border-left:3px solid var(--accent);padding:12px 20px;margin:24px 0;background:rgba(236,129,255,.05);border-radius:0 8px 8px 0;font-style:italic;color:var(--muted)}
.body code{background:rgba(255,255,255,.07);padding:2px 6px;border-radius:4px;font-size:.875em;font-family:monospace}
.body pre{background:#0D0D18;border:1px solid var(--border);border-radius:12px;padding:20px;overflow-x:auto;margin:24px 0}
.body pre code{background:none;padding:0}
.body img{border-radius:12px;margin:24px 0}
.body a{color:var(--accent);text-decoration:underline}
.body table{width:100%;border-collapse:collapse;margin:24px 0}
.body th,.body td{padding:10px 14px;border:1px solid var(--border);font-size:14px}
.body th{background:var(--card);font-weight:600;color:#fff}

/* Tags */
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:32px;padding-top:24px;border-top:1px solid var(--border)}
.tag{background:rgba(236,129,255,.08);color:var(--accent);padding:4px 12px;border-radius:999px;font-size:11px;font-weight:500}

/* FAQ */
.faq{margin-top:52px;padding-top:36px;border-top:1px solid var(--border)}
.faq h2{font-size:24px;font-weight:700;color:#fff;margin-bottom:20px}
.faq-item{margin-bottom:14px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px}
.faq-item h3{font-size:14px;font-weight:600;color:#fff;margin-bottom:8px}
.faq-item p{font-size:13px;color:var(--muted);line-height:1.65}

/* Author box */
.author-box{display:flex;align-items:flex-start;gap:14px;margin-top:40px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px}
.author-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0}
.author-avatar-placeholder{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-dark));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#fff;flex-shrink:0}
.author-info .name{font-weight:600;font-size:14px;color:#fff;margin-bottom:4px}
.author-info .bio{font-size:13px;color:var(--muted);line-height:1.55}

/* Footer */
.ftr{border-top:1px solid var(--border);padding:48px 0 28px;margin-top:48px;color:var(--muted);font-size:12px}
.ftr-in{max-width:1200px;margin:0 auto;padding:0 24px}
.ftr-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:32px}
.ftr-logo{display:flex;align-items:center;gap:8px}
.ftr-logo img{border-radius:7px}
.ftr-logo span{font-weight:700;font-size:16px;color:#fff}
.ftr-brand p{color:var(--muted);font-size:12px;line-height:1.6;max-width:260px;margin:12px 0 16px}
.ftr-social{display:flex;gap:10px}
.ftr-social a{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:#13131A;display:flex;align-items:center;justify-content:center;color:var(--muted);transition:.15s}
.ftr-social a:hover{color:var(--accent);border-color:rgba(236,129,255,.3)}
.ftr-social svg{width:15px;height:15px}
.ftr-col h4{color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin:0 0 14px}
.ftr-col a{display:block;color:var(--muted);font-size:12px;margin-bottom:9px;transition:color .15s}
.ftr-col a:hover{color:var(--accent);text-decoration:none}
.ftr-disc{border-top:1px solid var(--border);margin-top:36px;padding-top:22px;color:rgba(173,173,181,.7);font-size:10px;line-height:1.6;max-width:680px}
.ftr-bottom{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:18px}
.ftr-bottom p{color:rgba(173,173,181,.6);font-size:10px;margin:0}
.ftr-legal{display:flex;flex-wrap:wrap;gap:16px}
.ftr-legal a{color:rgba(173,173,181,.6);font-size:10px}
.ftr-legal a:hover{color:var(--accent);text-decoration:none}
@media(max-width:720px){.ftr-grid{grid-template-columns:1fr 1fr}}

/* Breadcrumb */
.bc{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-bottom:24px;flex-wrap:wrap}
.bc a{color:var(--muted)}
.bc a:hover{color:#fff;text-decoration:none}
.bc .sep{opacity:.5}

/* Empty / error */
.empty{text-align:center;padding:72px 20px;color:var(--muted)}
.empty h2{font-size:22px;font-weight:700;color:#fff;margin-bottom:10px}
.empty p{font-size:14px;margin-bottom:20px}

@media(max-width:640px){
  .blog-hero h1{font-size:28px}
  .grid{grid-template-columns:1fr}
  .article-hdr h1{font-size:26px}
  .body{font-size:16px}
  .hdr-in{padding:0 16px}
  .nav .cta{padding:6px 14px}
}
</style>
</head>
<body>
<header class="hdr">
  <div class="hdr-in">
    <a href="${APP_URL}" class="logo">
      <img src="${APP_URL}/assets/lender-logo5x.png" alt="Lendra" width="32" height="32" />
      <span>Lendra</span>
    </a>
    <nav class="nav">
      <a href="${APP_URL}/?connect=wallet" class="cta">Scan Wallet</a>
    </nav>
  </div>
</header>
${bodyHtml}
<footer class="ftr">
  <div class="ftr-in">
    <div class="ftr-grid">
      <div class="ftr-brand">
        <a href="${APP_URL}" class="ftr-logo"><img src="${APP_URL}/assets/lender-logo5x.png" alt="Lendra" width="30" height="30" /><span>Lendra</span></a>
        <p>Your wallet is your credit score. Lendra turns wallet activity into borrowing power on Solana.</p>
        <div class="ftr-social">
          <a href="https://www.linkedin.com/company/lendrafinance" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
          <a href="https://x.com/lendrafinance" target="_blank" rel="noopener noreferrer" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
        </div>
      </div>
      <div class="ftr-col"><h4>Product</h4><a href="${APP_URL}">Scan Wallet</a><a href="${APP_URL}">Credit Score</a><a href="${APP_URL}">Borrow</a><a href="${APP_URL}">Private Mode</a></div>
      <div class="ftr-col"><h4>Resources</h4><a href="${APP_URL}/blog">Blog</a><a href="${APP_URL}/#how-it-works">How it works</a><a href="${APP_URL}/#faq">FAQ</a><a href="${APP_URL}/blog/feed.xml">RSS</a></div>
      <div class="ftr-col"><h4>Company</h4><a href="${APP_URL}">About</a><a href="${APP_URL}">Partnerships</a><a href="${APP_URL}">Contact</a></div>
    </div>
    <p class="ftr-disc">Lendra provides wallet-based credit scoring and DeFi access infrastructure. Lendra is not a bank. Loan availability may depend on partner protocols, jurisdiction, eligibility, and risk checks.</p>
    <div class="ftr-bottom">
      <p>&copy; ${new Date().getFullYear()} LENDRA. All rights reserved.</p>
      <div class="ftr-legal"><a href="${APP_URL}">Privacy Policy</a><a href="${APP_URL}">Terms of Service</a><a href="${APP_URL}">Risk Disclosure</a><a href="${APP_URL}/blog/sitemap.xml">Sitemap</a></div>
    </div>
  </div>
</footer>
</body>
</html>`;
}

// ── Route: Blog listing ─────────────────────────────────────────────────────

async function renderListing() {
  const [posts, cats] = await Promise.all([
    sbSelect(
      'blog_posts',
      'status=eq.published&order=published_at.desc&limit=60&select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,is_featured,blog_authors(name),blog_categories(name,slug,color)'
    ),
    sbSelect('blog_categories', 'order=sort_order.asc&select=id,name,slug,color'),
  ]);

  let cardsHtml = '';
  for (const p of posts || []) {
    const cat = p.blog_categories;
    const badge = cat
      ? `<span class="cat-badge" style="background:${cat.color}22;color:${cat.color}">${esc(cat.name)}</span>`
      : '';
    const img = p.cover_image_url
      ? `<img class="card-img" src="${esc(p.cover_image_url)}" alt="${esc(p.cover_image_alt || p.title)}" loading="lazy" width="400" height="200" />`
      : `<div class="card-img-placeholder"></div>`;
    cardsHtml += `<article class="card"><a href="${APP_URL}/blog/${esc(p.slug)}">${img}<div class="card-body"><div class="card-meta">${badge}<span>${fmtDate(p.published_at)}</span><span>·</span><span>${p.read_time_minutes || 5} min</span></div><h2>${esc(p.title)}</h2>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}</div></a></article>`;
  }

  if (!cardsHtml) {
    cardsHtml = `<div class="empty"><h2>No articles yet</h2><p>Check back soon for DeFi credit insights, Solana protocol updates, and engineering deep dives.</p></div>`;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Lendra Blog',
    description: 'Protocol updates, DeFi research, and engineering insights from the Lendra team.',
    url: `${APP_URL}/blog`,
    publisher: { '@type': 'Organization', name: 'Lendra Finance', url: APP_URL },
  };

  return blogShell({
    title: 'Lendra Blog — DeFi Credit Protocol Insights',
    description:
      'Protocol updates, DeFi research, and engineering deep dives from the Lendra team. Your wallet is your credit score.',
    ogImage: '',
    canonicalPath: '/blog',
    schemaBlocks: [schema],
    bodyHtml: `<main class="wrap-wide"><div class="blog-hero"><h1>Lendra Blog</h1><p>Protocol updates, DeFi research, and engineering deep dives from the Lendra team.</p></div><div class="grid">${cardsHtml}</div></main>`,
  });
}

// ── Route: Article ──────────────────────────────────────────────────────────

async function renderArticle(slug) {
  const posts = await sbSelect(
    'blog_posts',
    `slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*,blog_authors(name,slug,bio,avatar_url,x_handle),blog_categories(name,slug,color)&limit=1`
  );
  if (!posts?.length) return null; // 404

  const post = posts[0];
  const tagRows = await sbSelect(
    'blog_post_tags',
    `post_id=eq.${post.id}&select=blog_tags(id,name,slug)`
  );
  const tags = (tagRows || []).map((t) => t.blog_tags).filter(Boolean);
  const author = post.blog_authors;
  const cat = post.blog_categories;

  // Breadcrumb
  let bc = `<div class="bc"><a href="${APP_URL}/blog">Blog</a><span class="sep">›</span>`;
  if (cat) bc += `<a href="${APP_URL}/blog/category/${esc(cat.slug)}">${esc(cat.name)}</a><span class="sep">›</span>`;
  bc += `<span>${esc(post.title)}</span></div>`;

  // Article header
  let art = bc;
  art += `<div class="article-hdr">`;
  if (cat)
    art += `<span class="cat-badge" style="background:${cat.color}22;color:${cat.color}">${esc(cat.name)}</span>`;
  art += `<h1>${esc(post.meta_title || post.title)}</h1>`;
  art += `<div class="article-meta">`;
  if (author) art += `<span>By ${esc(author.name)}</span>`;
  if (post.published_at) art += `<span class="dot"></span><span>${fmtDate(post.published_at)}</span>`;
  art += `<span class="dot"></span><span>${post.read_time_minutes || 5} min read</span>`;
  if (post.word_count) art += `<span class="dot"></span><span>${post.word_count.toLocaleString()} words</span>`;
  art += `</div></div>`;

  if (post.cover_image_url) {
    art += `<img class="cover" src="${esc(post.cover_image_url)}" alt="${esc(post.cover_image_alt || post.title)}" width="800" height="460" />`;
  }

  if (post.quick_answer) {
    art += `<div class="qa-box"><div class="qa-label">Quick Answer</div><p>${esc(post.quick_answer)}</p></div>`;
  }

  // Article body — content_html from DB
  art += `<div class="body">${post.content_html || ''}</div>`;

  // Tags
  if (tags.length) {
    art += `<div class="tags">`;
    for (const t of tags)
      art += `<a href="${APP_URL}/blog/tag/${esc(t.slug)}" class="tag">#${esc(t.name)}</a>`;
    art += `</div>`;
  }

  // FAQ — column is faq_items in DB
  const faqs = post.faq_items || [];
  if (faqs.length) {
    art += `<div class="faq"><h2>Frequently Asked Questions</h2>`;
    for (const faq of faqs) {
      art += `<div class="faq-item"><h3>${esc(faq.question || '')}</h3><p>${esc(faq.answer || '')}</p></div>`;
    }
    art += `</div>`;
  }

  // Author box
  if (author) {
    const avatar = author.avatar_url
      ? `<img class="author-avatar" src="${esc(author.avatar_url)}" alt="${esc(author.name)}" width="48" height="48" />`
      : `<div class="author-avatar-placeholder">${esc(author.name[0] || 'A')}</div>`;
    art += `<div class="author-box">${avatar}<div class="author-info"><div class="name">${esc(author.name)}</div>${author.bio ? `<div class="bio">${esc(author.bio)}</div>` : ''}</div></div>`;
  }

  // Schema.org — BlogPosting
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || '',
    image: post.og_image_url || post.cover_image_url || `${APP_URL}/assets/lender-logo5x.png`,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    wordCount: post.word_count || 0,
    url: `${APP_URL}/blog/${post.slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${APP_URL}/blog/${post.slug}` },
    author: author ? { '@type': 'Person', name: author.name, url: `${APP_URL}/blog/author/${author.slug || ''}` } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Lendra Finance',
      url: APP_URL,
      logo: { '@type': 'ImageObject', url: `${APP_URL}/assets/lender-logo5x.png` },
    },
    keywords: [
      ...(post.primary_keyword ? [post.primary_keyword] : []),
      ...(post.secondary_keywords || []),
    ].join(', '),
  };

  const schemaBlocks = [articleSchema];

  // FAQ schema
  if (faqs.length) {
    schemaBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  // BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${APP_URL}/blog` },
      ...(cat
        ? [{ '@type': 'ListItem', position: 3, name: cat.name, item: `${APP_URL}/blog/category/${cat.slug}` }]
        : []),
      {
        '@type': 'ListItem',
        position: cat ? 4 : 3,
        name: post.title,
        item: `${APP_URL}/blog/${post.slug}`,
      },
    ],
  };
  schemaBlocks.push(breadcrumbSchema);

  return blogShell({
    title: `${post.meta_title || post.title} — Lendra Blog`,
    description: post.meta_description || post.excerpt || '',
    ogImage: post.og_image_url || post.cover_image_url || '',
    canonicalPath: post.canonical_url ? new URL(post.canonical_url).pathname : `/blog/${post.slug}`,
    ogType: 'article',
    schemaBlocks,
    bodyHtml: `<main class="wrap">${art}</main>`,
  });
}

// ── Route: Category ─────────────────────────────────────────────────────────

async function renderCategory(catSlug) {
  const cats = await sbSelect(
    'blog_categories',
    `slug=eq.${encodeURIComponent(catSlug)}&limit=1`
  );
  const cat = cats?.[0];
  if (!cat) return null;

  const posts = await sbSelect(
    'blog_posts',
    `status=eq.published&category_id=eq.${cat.id}&order=published_at.desc&limit=60&select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,blog_authors(name),blog_categories(name,slug,color)`
  );

  let cardsHtml = '';
  for (const p of posts || []) {
    const pc = p.blog_categories;
    const badge = pc
      ? `<span class="cat-badge" style="background:${pc.color}22;color:${pc.color}">${esc(pc.name)}</span>`
      : '';
    const img = p.cover_image_url
      ? `<img class="card-img" src="${esc(p.cover_image_url)}" alt="${esc(p.cover_image_alt || p.title)}" loading="lazy" />`
      : `<div class="card-img-placeholder"></div>`;
    cardsHtml += `<article class="card"><a href="${APP_URL}/blog/${esc(p.slug)}">${img}<div class="card-body"><div class="card-meta">${badge}<span>${fmtDate(p.published_at)}</span><span>·</span><span>${p.read_time_minutes || 5} min</span></div><h2>${esc(p.title)}</h2>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}</div></a></article>`;
  }

  if (!cardsHtml) {
    cardsHtml = `<div class="empty"><h2>No articles yet</h2><p>No published articles in this category. Check back soon.</p><p><a href="${APP_URL}/blog">← Back to Blog</a></p></div>`;
  }

  const desc = cat.description || `${cat.name} articles from the Lendra team.`;
  return blogShell({
    title: `${cat.name} — Lendra Blog`,
    description: desc,
    ogImage: '',
    canonicalPath: `/blog/category/${catSlug}`,
    bodyHtml: `<main class="wrap-wide"><div class="blog-hero"><h1>${esc(cat.name)}</h1><p>${esc(desc)}</p></div><div class="grid">${cardsHtml}</div></main>`,
  });
}

// ── Route: Tag ──────────────────────────────────────────────────────────────

async function renderTag(tagSlug) {
  const tagRows = await sbSelect(
    'blog_tags',
    `slug=eq.${encodeURIComponent(tagSlug)}&select=id,name,slug&limit=1`
  );
  const tagObj = tagRows?.[0];
  if (!tagObj) return null;

  const postTags = await sbSelect('blog_post_tags', `tag_id=eq.${tagObj.id}&select=post_id`);
  const postIds = (postTags || []).map((pt) => pt.post_id).filter(Boolean);

  let posts = [];
  if (postIds.length > 0) {
    posts =
      (await sbSelect(
        'blog_posts',
        `status=eq.published&id=in.(${postIds.join(',')})&order=published_at.desc&limit=60&select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,blog_authors(name),blog_categories(name,slug,color)`
      )) || [];
  }

  let cardsHtml = '';
  for (const p of posts) {
    const cat = p.blog_categories;
    const badge = cat
      ? `<span class="cat-badge" style="background:${cat.color}22;color:${cat.color}">${esc(cat.name)}</span>`
      : '';
    const img = p.cover_image_url
      ? `<img class="card-img" src="${esc(p.cover_image_url)}" alt="${esc(p.cover_image_alt || p.title)}" loading="lazy" />`
      : `<div class="card-img-placeholder"></div>`;
    cardsHtml += `<article class="card"><a href="${APP_URL}/blog/${esc(p.slug)}">${img}<div class="card-body"><div class="card-meta">${badge}<span>${fmtDate(p.published_at)}</span><span>·</span><span>${p.read_time_minutes || 5} min</span></div><h2>${esc(p.title)}</h2>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}</div></a></article>`;
  }

  if (!cardsHtml) {
    cardsHtml = `<div class="empty"><h2>No articles yet</h2><p>No published articles with this tag. Check back soon.</p><p><a href="${APP_URL}/blog">← Back to Blog</a></p></div>`;
  }

  return blogShell({
    title: `#${tagObj.name} — Lendra Blog`,
    description: `Articles tagged "${tagObj.name}" from the Lendra team.`,
    ogImage: '',
    canonicalPath: `/blog/tag/${tagSlug}`,
    bodyHtml: `<main class="wrap-wide"><div class="blog-hero"><h1>#${esc(tagObj.name)}</h1><p>Articles tagged with "${esc(tagObj.name)}" from the Lendra team.</p></div><div class="grid">${cardsHtml}</div></main>`,
  });
}

// ── Route: Sitemap ──────────────────────────────────────────────────────────

async function renderSitemap() {
  const posts = await sbSelect(
    'blog_posts',
    'status=eq.published&select=slug,updated_at,published_at&order=published_at.desc&limit=5000'
  );
  const cats = await sbSelect('blog_categories', 'select=slug&order=sort_order.asc');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${APP_URL}/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
  for (const c of cats || []) {
    xml += `<url><loc>${APP_URL}/blog/category/${c.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
  }
  for (const p of posts || []) {
    const lastmod = p.updated_at
      ? new Date(p.updated_at).toISOString().split('T')[0]
      : '';
    xml += `<url><loc>${APP_URL}/blog/${p.slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
  }
  xml += `</urlset>`;
  return xml;
}

// ── Route: RSS Feed ─────────────────────────────────────────────────────────

async function renderFeed() {
  const posts = await sbSelect(
    'blog_posts',
    'status=eq.published&order=published_at.desc&limit=20&select=title,slug,excerpt,published_at,blog_authors(name)'
  );
  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>Lendra Blog</title>
<link>${APP_URL}/blog</link>
<description>Protocol updates, DeFi research, and engineering deep dives from the Lendra team.</description>
<language>en-US</language>
<atom:link href="${APP_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
<image><url>${APP_URL}/assets/lender-logo5x.png</url><title>Lendra Blog</title><link>${APP_URL}/blog</link></image>\n`;
  for (const p of posts || []) {
    const pubDate = p.published_at ? new Date(p.published_at).toUTCString() : '';
    const authorName = p.blog_authors?.name || 'Lendra Team';
    rss += `<item>
<title>${esc(p.title)}</title>
<link>${APP_URL}/blog/${p.slug}</link>
<guid isPermaLink="true">${APP_URL}/blog/${p.slug}</guid>
${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
<dc:creator>${esc(authorName)}</dc:creator>
${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ''}
</item>\n`;
  }
  rss += `</channel>\n</rss>`;
  return rss;
}

// ── 404 page ────────────────────────────────────────────────────────────────

function render404(path) {
  return blogShell({
    title: 'Article Not Found — Lendra Blog',
    description: 'The article you requested could not be found.',
    ogImage: '',
    canonicalPath: path,
    bodyHtml: `<main class="wrap"><div class="empty" style="padding-top:100px"><h2>Article not found</h2><p>This article may have been moved, deleted, or is not yet published.</p><p style="margin-top:16px"><a href="${APP_URL}/blog">← Back to Blog</a></p></div></main>`,
  });
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse the URL path (strip query string)
  const rawPath = (req.url || '/blog').split('?')[0];
  const path = rawPath.replace(/\/$/, '') || '/blog';

  try {
    // /blog/sitemap.xml
    if (path === '/blog/sitemap.xml') {
      const xml = await renderSitemap();
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      res.status(200).end(xml);
      return;
    }

    // /blog/feed.xml
    if (path === '/blog/feed.xml') {
      const rss = await renderFeed();
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      res.status(200).end(rss);
      return;
    }

    // /blog (exact)
    if (path === '/blog') {
      const html = await renderListing();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.status(200).end(html);
      return;
    }

    // /blog/category/:slug
    const catMatch = path.match(/^\/blog\/category\/([^/]+)$/);
    if (catMatch) {
      const html = await renderCategory(catMatch[1]);
      if (!html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(404).end(render404(path));
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.status(200).end(html);
      return;
    }

    // /blog/tag/:slug
    const tagMatch = path.match(/^\/blog\/tag\/([^/]+)$/);
    if (tagMatch) {
      const html = await renderTag(tagMatch[1]);
      if (!html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(404).end(render404(path));
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.status(200).end(html);
      return;
    }

    // /blog/:slug (single post)
    const slugMatch = path.match(/^\/blog\/([^/]+)$/);
    if (slugMatch) {
      const html = await renderArticle(slugMatch[1]);
      if (!html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(404).end(render404(path));
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.status(200).end(html);
      return;
    }

    // Fallback — redirect to blog root
    res.setHeader('Location', `${APP_URL}/blog`);
    res.status(302).end();
  } catch (err) {
    console.error('[blog-ssr] Error:', err);
    // Return an error page but still valid HTML so the browser renders something
    const errHtml = blogShell({
      title: 'Error — Lendra Blog',
      description: 'An error occurred while loading this page.',
      ogImage: '',
      canonicalPath: path,
      bodyHtml: `<main class="wrap"><div class="empty" style="padding-top:100px"><h2>Something went wrong</h2><p>We couldn't load this page right now. Please try again shortly.</p><p style="margin-top:16px"><a href="${APP_URL}/blog">← Back to Blog</a></p></div></main>`,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).end(errHtml);
  }
}
