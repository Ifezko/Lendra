import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../useAdminAuth';
import {
  Plus, FileText, Eye, EyeOff, Pencil, Trash2, Globe, Clock,
  Star, RefreshCw, AlertCircle, Search, Filter,
} from 'lucide-react';

const STATUS_COLORS = {
  published: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
  draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  archived: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-700 uppercase tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

export default function BlogPosts() {
  const { adminFetch, admin } = useAdminAuth();
  const navigate = useNavigate();
  const role = admin?.role || 'viewer';
  const canPublish = ['super_admin', 'admin'].includes(role);

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pr, cr] = await Promise.all([
        adminFetch('/api/admin/blog/posts').then((r) => r.json()),
        adminFetch('/api/admin/blog/categories').then((r) => r.json()),
      ]);
      setPosts(pr.posts || []);
      setCategories(cr.categories || []);
    } catch (e) {
      setError(e.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await adminFetch(`/api/admin/blog/posts/${id}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert('Delete failed: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handlePublish = async (post) => {
    if (!canPublish) return;
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const label = newStatus === 'published' ? 'Publish' : 'Unpublish';
    if (!window.confirm(`${label} "${post.title}"?`)) return;
    try {
      await adminFetch(`/api/admin/blog/posts/${post.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, status: newStatus } : p));
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  };

  const filtered = posts.filter((p) => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.slug?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const APP_URL = import.meta.env.VITE_APP_URL || 'https://lendra.finance';
  const ADMIN_SLUG = '/ops-okw-7qv3';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Blog Posts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {posts.length} total &middot; {posts.filter((p) => p.status === 'published').length} published
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl border border-[#1E1E2A] text-slate-500 hover:text-white hover:border-slate-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to={`${ADMIN_SLUG}/blog/new`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EC81FF] text-[#0A0A0F] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search posts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#12121A] border border-[#1E1E2A] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EC81FF]/40"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#12121A] border border-[#1E1E2A] rounded-xl p-1">
          {['all', 'published', 'draft'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filterStatus === s
                  ? 'bg-[#EC81FF]/15 text-[#EC81FF]'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Posts table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#12121A] border border-[#1E1E2A] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {search || filterStatus !== 'all' ? 'No posts match your filter' : 'No blog posts yet'}
          </p>
          <p className="text-sm mt-1">
            {!search && filterStatus === 'all' && (
              <Link to={`${ADMIN_SLUG}/blog/new`} className="text-[#EC81FF] hover:underline">
                Create your first post →
              </Link>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => {
            const cat = post.blog_categories;
            return (
              <div
                key={post.id}
                className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-4 flex items-start gap-4 hover:border-[#EC81FF]/20 transition-colors group"
              >
                {/* Cover thumb */}
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1E1E2A] to-[#12121A] flex-shrink-0 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-600" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-sm leading-snug">
                      {post.title}
                    </h3>
                    {post.is_featured && (
                      <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={post.status} />
                    {cat && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: `${cat.color}18`, color: cat.color }}
                      >
                        {cat.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-600">/blog/{post.slug}</span>
                    {post.read_time_minutes && (
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.read_time_minutes} min
                      </span>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{post.excerpt}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {post.status === 'published' && (
                    <a
                      href={`${APP_URL}/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                      title="View live"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {canPublish && (
                    <button
                      onClick={() => handlePublish(post)}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                      title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {post.status === 'published' ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <Link
                    to={`${ADMIN_SLUG}/blog/${post.id}`}
                    className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  {canPublish && (
                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      disabled={deleting === post.id}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
