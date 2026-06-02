// ─── Blog Supabase query helpers ─────────────────────────────────────
// Used by both SSR blog renderer and admin API routes.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function sb(path: string, opts: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Public queries (only published posts) ────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  quick_answer: string | null;
  content_html: string;
  content_md: string;
  author: { name: string; slug: string; bio: string | null; avatar_url: string | null; x_handle: string | null } | null;
  category: { name: string; slug: string; color: string } | null;
  tags: { name: string; slug: string }[];
  status: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  cover_image_caption: string | null;
  og_image_url: string | null;
  og_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  geo_entities: string[] | null;
  aeo_questions: string[] | null;
  faq_items: { question: string; answer: string }[];
  read_time_minutes: number;
  word_count: number;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPublishedPosts(opts: {
  limit?: number;
  offset?: number;
  category?: string;
  tag?: string;
  featured?: boolean;
} = {}): Promise<{ posts: BlogPost[]; total: number }> {
  const { limit = 12, offset = 0, category, tag, featured } = opts;

  let qs = `select=*,author:blog_authors(name,slug,bio,avatar_url,x_handle),category:blog_categories(name,slug,color)&status=eq.published&order=published_at.desc&limit=${limit}&offset=${offset}`;

  if (category) {
    // Join through category slug
    qs += `&category.slug=eq.${encodeURIComponent(category)}`;
  }
  if (featured) {
    qs += `&is_featured=eq.true`;
  }

  let posts = await sb(`blog_posts?${qs}`) || [];

  // Filter by category (PostgREST nested filter doesn't always work as expected)
  if (category) {
    posts = posts.filter((p: any) => p.category?.slug === category);
  }

  // If filtering by tag, get post IDs for that tag first
  if (tag) {
    const tagRows = await sb(`blog_tags?select=id&slug=eq.${encodeURIComponent(tag)}&limit=1`);
    if (tagRows && tagRows.length > 0) {
      const tagId = tagRows[0].id;
      const junctions = await sb(`blog_post_tags?select=post_id&tag_id=eq.${tagId}`);
      const postIds = new Set((junctions || []).map((j: any) => j.post_id));
      posts = posts.filter((p: any) => postIds.has(p.id));
    } else {
      posts = [];
    }
  }

  // Attach tags to each post
  if (posts.length > 0) {
    const postIds = posts.map((p: any) => p.id);
    const junctions = await sb(`blog_post_tags?select=post_id,tag:blog_tags(name,slug)&post_id=in.(${postIds.join(',')})`);
    const tagMap: Record<string, { name: string; slug: string }[]> = {};
    for (const j of (junctions || [])) {
      if (!tagMap[j.post_id]) tagMap[j.post_id] = [];
      if (j.tag) tagMap[j.post_id].push(j.tag);
    }
    posts = posts.map((p: any) => ({ ...p, tags: tagMap[p.id] || [] }));
  }

  // Get count
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&select=id`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'count=exact',
      'Range-Unit': 'items',
      Range: '0-0',
    },
  });
  const contentRange = countRes.headers.get('content-range') || '0/0';
  const total = parseInt(contentRange.split('/')[1] || '0', 10);

  return { posts, total };
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await sb(`blog_posts?select=*,author:blog_authors(name,slug,bio,avatar_url,x_handle),category:blog_categories(name,slug,color)&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`);
  if (!posts || posts.length === 0) return null;
  const post = posts[0];

  // Attach tags
  const junctions = await sb(`blog_post_tags?select=tag:blog_tags(name,slug)&post_id=eq.${post.id}`);
  post.tags = (junctions || []).map((j: any) => j.tag).filter(Boolean);

  return post;
}

export async function getCategories(): Promise<{ id: string; name: string; slug: string; description: string | null; color: string; post_count: number }[]> {
  const cats = await sb('blog_categories?select=*&order=sort_order.asc') || [];
  // Get post counts per category
  const counts = await sb('blog_posts?select=category_id&status=eq.published') || [];
  const countMap: Record<string, number> = {};
  for (const p of counts) {
    if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
  }
  return cats.map((c: any) => ({ ...c, post_count: countMap[c.id] || 0 }));
}

export async function getTags(): Promise<{ id: string; name: string; slug: string; post_count: number }[]> {
  const tags = await sb('blog_tags?select=*&order=name.asc') || [];
  const junctions = await sb('blog_post_tags?select=tag_id,post:blog_posts!inner(status)') || [];
  const countMap: Record<string, number> = {};
  for (const j of junctions) {
    if (j.post?.status === 'published') {
      countMap[j.tag_id] = (countMap[j.tag_id] || 0) + 1;
    }
  }
  return tags.map((t: any) => ({ ...t, post_count: countMap[t.id] || 0 }));
}

export async function getRelatedPosts(postId: string, categoryId: string | null, limit = 3): Promise<BlogPost[]> {
  let qs = `select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,author:blog_authors(name,slug),category:blog_categories(name,slug,color)&status=eq.published&id=neq.${postId}&order=published_at.desc&limit=${limit}`;
  if (categoryId) {
    qs += `&category_id=eq.${categoryId}`;
  }
  return (await sb(`blog_posts?${qs}`)) || [];
}

// ── Admin queries ────────────────────────────────────────────────────

export async function getAllPosts(opts: { limit?: number; offset?: number; status?: string } = {}) {
  const { limit = 50, offset = 0, status } = opts;
  let qs = `select=*,author:blog_authors(name,slug),category:blog_categories(name,slug,color)&order=updated_at.desc&limit=${limit}&offset=${offset}`;
  if (status) qs += `&status=eq.${status}`;
  return (await sb(`blog_posts?${qs}`)) || [];
}

export async function upsertPost(data: Record<string, any>) {
  if (data.id) {
    const { id, ...rest } = data;
    rest.updated_at = new Date().toISOString();
    return sb(`blog_posts?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(rest) });
  }
  return sb('blog_posts', { method: 'POST', body: JSON.stringify(data) });
}

export async function deletePost(id: string) {
  return sb(`blog_posts?id=eq.${id}`, { method: 'DELETE' });
}

export async function upsertAuthor(data: Record<string, any>) {
  if (data.id) {
    const { id, ...rest } = data;
    rest.updated_at = new Date().toISOString();
    return sb(`blog_authors?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(rest) });
  }
  return sb('blog_authors', { method: 'POST', body: JSON.stringify(data) });
}

export async function upsertCategory(data: Record<string, any>) {
  return sb('blog_categories', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(data),
  });
}

export async function upsertTag(data: Record<string, any>) {
  return sb('blog_tags', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(data),
  });
}

export async function setPostTags(postId: string, tagIds: string[]) {
  // Delete existing
  await sb(`blog_post_tags?post_id=eq.${postId}`, { method: 'DELETE' });
  if (tagIds.length === 0) return;
  const rows = tagIds.map(tagId => ({ post_id: postId, tag_id: tagId }));
  return sb('blog_post_tags', { method: 'POST', body: JSON.stringify(rows) });
}

export async function getAllAuthors() {
  return (await sb('blog_authors?select=*&order=name.asc')) || [];
}

export async function getAllCategories() {
  return (await sb('blog_categories?select=*&order=sort_order.asc')) || [];
}

export async function getAllTags() {
  return (await sb('blog_tags?select=*&order=name.asc')) || [];
}
