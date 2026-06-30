// ─── Blog HTML renderer ──────────────────────────────────────────────
// Renders full crawlable HTML pages for /blog/* routes.
// All SEO, AEO, GEO, JSON-LD, and Open Graph tags are included.

import type { BlogPost } from './queries';

const APP_URL = process.env.VITE_APP_URL || 'https://lendra.finance';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escJSON(s: string | null | undefined): string {
  if (!s) return '';
  return JSON.stringify(s).slice(1, -1); // removes outer quotes and escapes inner content
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function storageUrl(path: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
}

// ── Shared layout shell ──────────────────────────────────────────────

function shell(opts: {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: string;
  extraHead?: string;
  body: string;
}): string {
  const { title, description, canonical, ogImage, ogImageAlt, ogType = 'website', extraHead = '', body } = opts;
  const fullTitle = title.includes('Lendra') ? title : `${title} | Lendra Blog`;
  const img = storageUrl(ogImage || null) || `${APP_URL}/assets/lender-logo5x.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<meta property="og:type" content="${ogType}" />
<meta property="og:title" content="${esc(fullTitle)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:image" content="${esc(img)}" />
${ogImageAlt ? `<meta property="og:image:alt" content="${esc(ogImageAlt)}" />` : ''}
<meta property="og:site_name" content="Lendra" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@lendrafinance" />
<meta name="twitter:title" content="${esc(fullTitle)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(img)}" />
${ogImageAlt ? `<meta name="twitter:image:alt" content="${esc(ogImageAlt)}" />` : ''}
${extraHead}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
*,::before,::after{box-sizing:border-box}
body{margin:0;font-family:'Inter',system-ui,sans-serif;background:#0A0A0F;color:#E0E0E8;-webkit-font-smoothing:antialiased}
a{color:#EC81FF;text-decoration:none}a:hover{text-decoration:underline}
img{max-width:100%;height:auto;display:block}
.container{max-width:1100px;margin:0 auto;padding:0 1rem}
.blog-nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(16px);background:rgba(10,10,15,0.85);border-bottom:1px solid #1E1E2A}
.blog-nav-inner{display:flex;align-items:center;justify-content:space-between;height:56px}
.blog-nav-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
.blog-nav-logo img{width:28px;height:28px;border-radius:6px}
.blog-nav-logo span{font-weight:700;font-size:15px;color:#fff;letter-spacing:-0.02em}
.blog-nav-links{display:flex;align-items:center;gap:20px}
.blog-nav-links a{color:#ADADB5;font-size:13px;font-weight:500;text-decoration:none;transition:color .15s}
.blog-nav-links a:hover{color:#EC81FF}
.blog-nav-cta{padding:8px 18px;border-radius:8px;background:linear-gradient(135deg,#EC81FF 0%,#B84FCC 100%);color:#fff !important;font-weight:600}
.blog-nav-cta:hover{opacity:.9;color:#0A0A0F !important}
.blog-footer{border-top:1px solid #1E1E2A;padding:48px 0 28px;margin-top:60px}
.blog-footer-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:32px}
.blog-footer-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
.blog-footer-logo img{width:30px;height:30px;border-radius:7px}
.blog-footer-logo span{font-weight:700;font-size:16px;color:#fff}
.blog-footer-brand p{color:#ADADB5;font-size:12px;line-height:1.6;max-width:260px;margin:12px 0 16px}
.blog-footer-socials{display:flex;gap:10px}
.blog-footer-socials a{width:32px;height:32px;border-radius:8px;border:1px solid #1E1E2A;background:#13131A;display:flex;align-items:center;justify-content:center;color:#ADADB5;transition:.15s}
.blog-footer-socials a:hover{color:#EC81FF;border-color:rgba(236,129,255,0.3)}
.blog-footer-socials svg{width:15px;height:15px}
.blog-footer-col h4{color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin:0 0 14px}
.blog-footer-col a{display:block;color:#ADADB5;font-size:12px;text-decoration:none;margin-bottom:9px;transition:color .15s}
.blog-footer-col a:hover{color:#EC81FF}
.blog-footer-disclaimer{border-top:1px solid #1E1E2A;margin-top:36px;padding-top:22px;color:rgba(173,173,181,0.7);font-size:10px;line-height:1.6;max-width:680px}
.blog-footer-bottom{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:20px}
.blog-footer-bottom p{color:rgba(173,173,181,0.6);font-size:10px;margin:0}
.blog-footer-legal{display:flex;flex-wrap:wrap;gap:16px}
.blog-footer-legal a{color:rgba(173,173,181,0.6);font-size:10px;text-decoration:none}
.blog-footer-legal a:hover{color:#EC81FF}
@media(max-width:720px){.blog-footer-grid{grid-template-columns:1fr 1fr}}
.pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;text-decoration:none}
.pill:hover{text-decoration:none;opacity:0.85}
.card{background:#12121A;border:1px solid #1E1E2A;border-radius:16px;overflow:hidden;transition:border-color .2s}
.card:hover{border-color:rgba(236,129,255,0.2)}
.card img{width:100%;aspect-ratio:16/9;object-fit:cover}
.card-body{padding:16px 20px 20px}
.card h3{font-size:16px;font-weight:700;color:#fff;margin:0 0 6px;line-height:1.35}
.card p{font-size:13px;color:#ADADB5;margin:0;line-height:1.55}
.card-meta{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:11px;color:#ADADB5}
.grid{display:grid;gap:20px}
@media(min-width:640px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.grid{grid-template-columns:repeat(3,1fr)}}
.article-header{max-width:760px;margin:0 auto;padding:48px 1rem 0}
.article-body{max-width:760px;margin:0 auto;padding:0 1rem}
.article-body h2{font-size:22px;font-weight:700;color:#fff;margin:32px 0 12px;line-height:1.3}
.article-body h3{font-size:18px;font-weight:600;color:#fff;margin:24px 0 8px;line-height:1.3}
.article-body p{font-size:15px;line-height:1.75;color:#E0E0E8;margin:0 0 16px}
.article-body ul,.article-body ol{padding-left:1.5em;margin:0 0 16px}
.article-body li{font-size:15px;line-height:1.75;color:#E0E0E8;margin-bottom:6px}
.article-body blockquote{border-left:3px solid #EC81FF;padding:12px 20px;margin:20px 0;background:rgba(236,129,255,0.04);border-radius:0 8px 8px 0}
.article-body blockquote p{color:#ADADB5;font-style:italic}
.article-body code{background:#1E1E2A;padding:2px 6px;border-radius:4px;font-size:13px}
.article-body pre{background:#12121A;border:1px solid #1E1E2A;border-radius:8px;padding:16px;overflow-x:auto;margin:16px 0}
.article-body pre code{background:none;padding:0;font-size:13px;line-height:1.6}
.article-body img{border-radius:12px;margin:20px 0}
.article-body table{width:100%;border-collapse:collapse;margin:16px 0}
.article-body th,.article-body td{border:1px solid #1E1E2A;padding:10px;text-align:left;font-size:14px}
.article-body th{background:#12121A;color:#fff;font-weight:600}
.qa-box{background:linear-gradient(135deg,rgba(236,129,255,0.06),rgba(184,79,204,0.03));border:1px solid rgba(236,129,255,0.2);border-radius:12px;padding:20px 24px;margin:0 0 32px}
.qa-box h2{font-size:14px;font-weight:700;color:#EC81FF;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.04em}
.qa-box p{font-size:15px;color:#E0E0E8;margin:0;line-height:1.65}
.faq-section{margin:40px 0}
.faq-item{border:1px solid #1E1E2A;border-radius:10px;margin-bottom:8px;overflow:hidden}
.faq-item summary{padding:14px 18px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;list-style:none;display:flex;justify-content:space-between;align-items:center}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary::after{content:'+';font-size:18px;color:#ADADB5}
.faq-item[open] summary::after{content:'−'}
.faq-item .faq-answer{padding:0 18px 14px;font-size:14px;color:#ADADB5;line-height:1.65}
.tag-list{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.cta-block{background:#12121A;border:1px solid #1E1E2A;border-radius:16px;padding:40px;text-align:center;margin:48px 0}
.cta-block h2{font-size:22px;font-weight:700;color:#fff;margin:0 0 8px}
.cta-block p{font-size:14px;color:#ADADB5;margin:0 0 20px}
.btn-primary{display:inline-block;padding:10px 24px;background:#EC81FF;color:#0A0A0F;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;transition:opacity .15s}
.btn-primary:hover{opacity:0.9;text-decoration:none}
.btn-secondary{display:inline-block;padding:10px 24px;border:1px solid #1E1E2A;color:#ADADB5;font-weight:600;font-size:14px;border-radius:10px;text-decoration:none;margin-left:10px;transition:color .15s,border-color .15s}
.btn-secondary:hover{color:#fff;border-color:rgba(236,129,255,0.3);text-decoration:none}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:#ADADB5;margin-bottom:16px}
.breadcrumb a{color:#ADADB5}
.breadcrumb a:hover{color:#EC81FF}
.hero-blog{padding:48px 0 40px;text-align:center;border-bottom:1px solid #1E1E2A}
.hero-blog h1{font-size:32px;font-weight:800;color:#fff;margin:0 0 12px;line-height:1.2}
@media(min-width:768px){.hero-blog h1{font-size:40px}}
.hero-blog p{font-size:15px;color:#ADADB5;max-width:560px;margin:0 auto 24px;line-height:1.6}
.category-nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:20px 0;border-bottom:1px solid #1E1E2A}
.category-nav a{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;color:#ADADB5;border:1px solid #1E1E2A;text-decoration:none;transition:all .15s}
.category-nav a:hover,.category-nav a.active{color:#EC81FF;border-color:rgba(236,129,255,0.3);background:rgba(236,129,255,0.05)}
.pagination{display:flex;justify-content:center;gap:8px;padding:32px 0}
.pagination a,.pagination span{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #1E1E2A;color:#ADADB5;text-decoration:none}
.pagination a:hover{border-color:rgba(236,129,255,0.3);color:#EC81FF}
.pagination .current{background:#EC81FF;color:#0A0A0F;border-color:#EC81FF}
</style>
</head>
<body>
<nav class="blog-nav"><div class="container blog-nav-inner">
<a href="/" class="blog-nav-logo"><img src="/assets/lender-logo5x.png" alt="Lendra" /><span>Lendra</span></a>
<div class="blog-nav-links">
<a class="blog-nav-cta" href="/?connect=wallet">Scan Wallet</a>
</div>
</div></nav>
${body}
<footer class="blog-footer"><div class="container">
<div class="blog-footer-grid">
<div class="blog-footer-brand">
<a href="/" class="blog-footer-logo"><img src="/assets/lender-logo5x.png" alt="Lendra" /><span>Lendra</span></a>
<p>Your wallet is your credit score. Lendra turns wallet activity into borrowing power on Solana.</p>
<div class="blog-footer-socials">
<a href="https://www.linkedin.com/company/lendrafinance" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
<a href="https://x.com/lendrafinance" target="_blank" rel="noopener noreferrer" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
</div>
</div>
<div class="blog-footer-col"><h4>Product</h4><a href="/">Scan Wallet</a><a href="/">Credit Score</a><a href="/">Borrow</a><a href="/">Private Mode</a></div>
<div class="blog-footer-col"><h4>Resources</h4><a href="/blog">Blog</a><a href="/#how-it-works">How it works</a><a href="/#faq">FAQ</a></div>
<div class="blog-footer-col"><h4>Company</h4><a href="/">About</a><a href="/">Partnerships</a><a href="/">Contact</a></div>
</div>
<p class="blog-footer-disclaimer">Lendra provides wallet-based credit scoring and DeFi access infrastructure. Lendra is not a bank. Loan availability may depend on partner protocols, jurisdiction, eligibility, and risk checks.</p>
<div class="blog-footer-bottom">
<p>&copy; ${new Date().getFullYear()} LENDRA. All rights reserved.</p>
<div class="blog-footer-legal"><a href="/">Privacy Policy</a><a href="/">Terms of Service</a><a href="/">Risk Disclosure</a><a href="/">Disclaimers</a></div>
</div>
</div></footer>
</body>
</html>`;
}

// ── Blog index page ──────────────────────────────────────────────────

export function renderBlogIndex(posts: BlogPost[], categories: { name: string; slug: string; color: string; post_count: number }[], opts: {
  total: number;
  page: number;
  perPage: number;
  activeCategory?: string;
  activeTag?: string;
  tagName?: string;
}): string {
  const { total, page, perPage, activeCategory, activeTag, tagName } = opts;
  const totalPages = Math.ceil(total / perPage);
  const featured = posts.find(p => p.is_featured) || posts[0];

  let pageTitle = 'Lendra Blog — Wallet-Based Credit, Solana Lending, DeFi';
  let pageDesc = 'Wallet-based credit, Solana lending, stablecoin borrowing, and the future of on-chain reputation. Insights from the Lendra team.';
  let canonical = `${APP_URL}/blog`;
  let heading = 'Lendra Blog';

  if (activeCategory) {
    const cat = categories.find(c => c.slug === activeCategory);
    pageTitle = `${cat?.name || activeCategory} — Lendra Blog`;
    pageDesc = `Articles about ${cat?.name || activeCategory} from Lendra. Wallet-based credit scoring, Solana lending, and DeFi.`;
    canonical = `${APP_URL}/blog/category/${activeCategory}`;
    heading = cat?.name || activeCategory;
  }
  if (activeTag) {
    pageTitle = `#${tagName || activeTag} — Lendra Blog`;
    pageDesc = `Articles tagged "${tagName || activeTag}" from Lendra.`;
    canonical = `${APP_URL}/blog/tag/${activeTag}`;
    heading = `#${tagName || activeTag}`;
  }

  const catNav = categories.filter(c => c.post_count > 0).map(c =>
    `<a href="/blog/category/${esc(c.slug)}" class="${activeCategory === c.slug ? 'active' : ''}">${esc(c.name)}</a>`
  ).join('');

  const featuredHtml = featured ? `
<div style="margin:32px 0">
<a href="/blog/${esc(featured.slug)}" style="text-decoration:none">
<div class="card" style="display:grid;grid-template-columns:1fr;gap:0">
${featured.cover_image_url ? `<img src="${esc(storageUrl(featured.cover_image_url))}" alt="${esc(featured.cover_image_alt || featured.title)}" width="1200" height="675" loading="eager" style="aspect-ratio:2/1;object-fit:cover" />` : ''}
<div class="card-body" style="padding:24px">
${featured.category ? `<span class="pill" style="background:${featured.category.color}20;color:${featured.category.color};margin-bottom:8px">${esc(featured.category.name)}</span>` : ''}
<h3 style="font-size:22px;margin-top:8px">${esc(featured.title)}</h3>
<p>${esc(featured.excerpt || '')}</p>
<div class="card-meta">${featured.author ? esc(featured.author.name) : ''} · ${formatDate(featured.published_at)} · ${featured.read_time_minutes} min read</div>
</div></div></a></div>` : '';

  const cardsHtml = posts.filter(p => p.id !== featured?.id).map(p => `
<a href="/blog/${esc(p.slug)}" style="text-decoration:none">
<div class="card">
${p.cover_image_url ? `<img src="${esc(storageUrl(p.cover_image_url))}" alt="${esc(p.cover_image_alt || p.title)}" width="400" height="225" loading="lazy" />` : '<div style="aspect-ratio:16/9;background:#1E1E2A"></div>'}
<div class="card-body">
${p.category ? `<span class="pill" style="background:${p.category.color}20;color:${p.category.color};font-size:10px">${esc(p.category.name)}</span>` : ''}
<h3>${esc(p.title)}</h3>
<p>${esc(p.excerpt || '')}</p>
<div class="card-meta">${p.author ? esc(p.author.name) : ''} · ${formatDate(p.published_at)} · ${p.read_time_minutes} min</div>
</div></div></a>`).join('');

  let paginationHtml = '';
  if (totalPages > 1) {
    const basePath = activeCategory ? `/blog/category/${activeCategory}` : activeTag ? `/blog/tag/${activeTag}` : '/blog';
    const parts: string[] = [];
    if (page > 1) parts.push(`<a href="${basePath}?page=${page - 1}">&larr; Prev</a>`);
    for (let i = 1; i <= totalPages; i++) {
      if (i === page) parts.push(`<span class="current">${i}</span>`);
      else parts.push(`<a href="${basePath}?page=${i}">${i}</a>`);
    }
    if (page < totalPages) parts.push(`<a href="${basePath}?page=${page + 1}">Next &rarr;</a>`);
    paginationHtml = `<div class="pagination">${parts.join('')}</div>`;
  }

  return shell({
    title: pageTitle,
    description: pageDesc,
    canonical,
    body: `
<div class="container">
<div class="hero-blog">
<h1>${esc(heading)}</h1>
<p>Wallet-based credit, Solana lending, stablecoin borrowing, and the future of on-chain reputation.</p>
<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
<a href="/" class="btn-primary">Scan Your Wallet</a>
<a href="/blog" class="btn-secondary">All Articles</a>
</div>
</div>
${catNav ? `<div class="category-nav"><a href="/blog" class="${!activeCategory && !activeTag ? 'active' : ''}">All</a>${catNav}</div>` : ''}
${featuredHtml}
<div class="grid" style="padding:20px 0">${cardsHtml}</div>
${paginationHtml}
<div class="cta-block">
<h2>See what your wallet can unlock.</h2>
<p>Connect your Solana wallet and get a credit profile in minutes.</p>
<a href="/" class="btn-primary">Scan Wallet</a>
</div>
</div>`,
  });
}

// ── Article page ─────────────────────────────────────────────────────

export function renderArticle(post: BlogPost, related: BlogPost[]): string {
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || `${post.title} — insights from Lendra on wallet-based credit.`;
  const canonical = post.canonical_url || `${APP_URL}/blog/${post.slug}`;
  const ogImage = post.og_image_url || post.cover_image_url;
  const ogImageAlt = post.og_image_alt || post.cover_image_alt || post.title;

  // JSON-LD Article schema
  const articleSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: description,
    url: canonical,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    wordCount: post.word_count,
    publisher: {
      '@type': 'Organization',
      name: 'Lendra',
      url: APP_URL,
      logo: { '@type': 'ImageObject', url: `${APP_URL}/assets/lender-logo5x.png` },
    },
  };
  if (post.author) {
    articleSchema.author = { '@type': 'Person', name: post.author.name, url: `${APP_URL}/blog?author=${post.author.slug}` };
  }
  if (ogImage) {
    articleSchema.image = { '@type': 'ImageObject', url: storageUrl(ogImage), ...(ogImageAlt ? { caption: ogImageAlt } : {}) };
  }

  // JSON-LD FAQ schema
  let faqSchemaHtml = '';
  if (post.faq_items && post.faq_items.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq_items.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };
    faqSchemaHtml = `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
  }

  // Quick answer
  const qaHtml = post.quick_answer ? `
<div class="qa-box">
<h2>Quick Answer</h2>
<p>${esc(post.quick_answer)}</p>
</div>` : '';

  // FAQ section
  let faqHtml = '';
  if (post.faq_items && post.faq_items.length > 0) {
    const items = post.faq_items.map(f => `
<details class="faq-item">
<summary>${esc(f.question)}</summary>
<div class="faq-answer">${esc(f.answer)}</div>
</details>`).join('');
    faqHtml = `<div class="faq-section"><h2 style="font-size:20px;font-weight:700;color:#fff;margin-bottom:12px">Frequently Asked Questions</h2>${items}</div>`;
  }

  // Tags
  const tagsHtml = post.tags && post.tags.length > 0
    ? `<div class="tag-list">${post.tags.map(t => `<a href="/blog/tag/${esc(t.slug)}" class="pill" style="background:#1E1E2A;color:#ADADB5">#${esc(t.name)}</a>`).join('')}</div>`
    : '';

  // Related posts
  const relatedHtml = related.length > 0 ? `
<div style="margin:40px 0"><h2 style="font-size:20px;font-weight:700;color:#fff;margin-bottom:16px">Related Articles</h2>
<div class="grid">${related.map(r => `
<a href="/blog/${esc(r.slug)}" style="text-decoration:none"><div class="card">
${r.cover_image_url ? `<img src="${esc(storageUrl(r.cover_image_url))}" alt="${esc(r.cover_image_alt || r.title)}" width="400" height="225" loading="lazy" />` : '<div style="aspect-ratio:16/9;background:#1E1E2A"></div>'}
<div class="card-body"><h3>${esc(r.title)}</h3><p>${esc(r.excerpt || '')}</p>
<div class="card-meta">${formatDate(r.published_at)} · ${r.read_time_minutes} min</div></div></div></a>`).join('')}
</div></div>` : '';

  // Cover image
  const coverHtml = post.cover_image_url ? `
<figure style="margin:24px 0 0">
<img src="${esc(storageUrl(post.cover_image_url))}" alt="${esc(post.cover_image_alt || post.title)}" width="1200" height="675" loading="eager" style="border-radius:12px;aspect-ratio:16/9;object-fit:cover;width:100%" />
${post.cover_image_caption ? `<figcaption style="text-align:center;font-size:12px;color:#ADADB5;margin-top:8px">${esc(post.cover_image_caption)}</figcaption>` : ''}
</figure>` : '';

  return shell({
    title,
    description,
    canonical,
    ogImage: ogImage || undefined,
    ogImageAlt: ogImageAlt || undefined,
    ogType: 'article',
    extraHead: `
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
${faqSchemaHtml}
<meta property="article:published_time" content="${post.published_at || post.created_at}" />
<meta property="article:modified_time" content="${post.updated_at}" />
${post.author ? `<meta property="article:author" content="${esc(post.author.name)}" />` : ''}
${post.category ? `<meta property="article:section" content="${esc(post.category.name)}" />` : ''}
${(post.tags || []).map(t => `<meta property="article:tag" content="${esc(t.name)}" />`).join('\n')}`,
    body: `
<div class="article-header">
<div class="breadcrumb"><a href="/">Home</a> <span>/</span> <a href="/blog">Blog</a> <span>/</span>${post.category ? ` <a href="/blog/category/${esc(post.category.slug)}">${esc(post.category.name)}</a> <span>/</span>` : ''} <span style="color:#fff">${esc(post.title)}</span></div>
${post.category ? `<a href="/blog/category/${esc(post.category.slug)}" class="pill" style="background:${post.category.color}20;color:${post.category.color};margin-bottom:12px">${esc(post.category.name)}</a>` : ''}
<h1 style="font-size:32px;font-weight:800;color:#fff;margin:8px 0 12px;line-height:1.2">${esc(post.title)}</h1>
<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">
${post.author ? `<div style="display:flex;align-items:center;gap:8px">
${post.author.avatar_url ? `<img src="${esc(storageUrl(post.author.avatar_url))}" alt="${esc(post.author.name)}" width="32" height="32" style="border-radius:50%;width:32px;height:32px;object-fit:cover" />` : ''}
<span style="font-size:13px;font-weight:600;color:#fff">${esc(post.author.name)}</span>
</div>` : ''}
<span style="font-size:12px;color:#ADADB5">${formatDate(post.published_at)}</span>
<span style="font-size:12px;color:#ADADB5">${post.read_time_minutes} min read</span>
<span style="font-size:12px;color:#ADADB5">${post.word_count.toLocaleString()} words</span>
</div>
${tagsHtml}
${coverHtml}
</div>
<div class="article-body">
${qaHtml}
${post.content_html}
${faqHtml}
${relatedHtml}
<div class="cta-block">
<h2>See what your wallet can unlock.</h2>
<p>Connect your Solana wallet and get a credit profile in minutes.</p>
<a href="/" class="btn-primary">Scan Wallet</a>
<a href="/blog" class="btn-secondary">More Articles</a>
</div>
</div>`,
  });
}

// ── 404 page ─────────────────────────────────────────────────────────

export function render404(): string {
  return shell({
    title: 'Page Not Found — Lendra Blog',
    description: 'The page you are looking for does not exist.',
    canonical: `${APP_URL}/blog`,
    body: `
<div class="container" style="text-align:center;padding:80px 1rem">
<h1 style="font-size:48px;font-weight:800;color:#fff;margin:0 0 12px">404</h1>
<p style="font-size:16px;color:#ADADB5;margin:0 0 24px">This page does not exist.</p>
<a href="/blog" class="btn-primary">Back to Blog</a>
</div>`,
  });
}
