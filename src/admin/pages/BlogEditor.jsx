import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import TipTapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import { useAdminAuth } from '../useAdminAuth';
import {
  Save, Send, ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Loader2, Info, Upload,
  Link as LinkIcon, Bold, Italic, List, ListOrdered, Quote, Code,
  Minus, Undo2, Redo2, Eye, Code2, Type, X, ExternalLink, RefreshCw,
  BookOpen, Image as ImageIcon, Table as TableIcon,
} from 'lucide-react';

const ADMIN_SLUG = '/ops-okw-7qv3';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function compressToWebP(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve({ blob, width: w, height: h }), 'image/webp', quality);
    };
    img.src = url;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Primitives
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return <div className={`bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl ${className}`}>{children}</div>;
}

function CardHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E2A]">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
      {action}
    </div>
  );
}

function Field({ label, hint, children, required }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
        {required && <span className="text-[#EC81FF]">*</span>}
        {hint && (
          <span className="group relative">
            <Info className="w-3 h-3 text-slate-600 cursor-help" />
            <span className="pointer-events-none absolute left-5 top-0 z-50 w-52 rounded-lg bg-[#1A1A28] border border-[#2E2E3A] p-2 text-[11px] text-slate-400 shadow-xl hidden group-hover:block normal-case tracking-normal font-normal leading-relaxed">
              {hint}
            </span>
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3.5 py-2.5 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EC81FF]/50 transition-colors ${className}`}
      {...props}
    />
  );
}

function Textarea({ rows = 3, className = '', ...props }) {
  return (
    <textarea
      rows={rows}
      className={`w-full px-3.5 py-2.5 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EC81FF]/50 transition-colors resize-y leading-relaxed ${className}`}
      {...props}
    />
  );
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full px-3.5 py-2.5 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl text-sm text-white focus:outline-none focus:border-[#EC81FF]/50 transition-colors appearance-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none ${checked ? 'bg-[#EC81FF] border-[#EC81FF]' : 'bg-[#1E1E2A] border-[#1E1E2A]'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TipTap Toolbar
// ─────────────────────────────────────────────────────────────────────────────

function ToolbarBtn({ active, onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors text-sm ${active ? 'bg-[#EC81FF]/20 text-[#EC81FF]' : 'text-slate-400 hover:text-white hover:bg-[#1E1E2A]'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-[#1E1E2A] mx-0.5" />;
}

function TipTapToolbar({ editor, onInsertImage }) {
  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('URL', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#1E1E2A] bg-[#0A0A12] rounded-t-xl overflow-x-auto">
      <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarSep />
      <ToolbarBtn title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><span className="text-[11px] font-bold">H1</span></ToolbarBtn>
      <ToolbarBtn title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><span className="text-[11px] font-bold">H2</span></ToolbarBtn>
      <ToolbarBtn title="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><span className="text-[11px] font-bold">H3</span></ToolbarBtn>
      <ToolbarSep />
      <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Link" active={editor.isActive('link')} onClick={setLink}><LinkIcon className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarSep />
      <ToolbarBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarSep />
      <ToolbarBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn title="Insert image" onClick={onInsertImage}><ImageIcon className="w-3.5 h-3.5" /></ToolbarBtn>
      <span className="ml-auto text-[10px] text-slate-600 font-mono pl-2 whitespace-nowrap">
        {editor.storage.characterCount?.characters?.() ?? 0} chars
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Uploader
// ─────────────────────────────────────────────────────────────────────────────

function ImageUploader({ value, onChange, bucket, hint, adminFetch }) {
  const [uploading, setUploading] = useState(false);
  const [warn, setWarn] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setUploading(true); setWarn('');
    try {
      const { blob, width, height } = await compressToWebP(file, bucket === 'blog-og' ? 1200 : 1600);
      const base64 = await blobToBase64(blob);
      const res = await adminFetch('/api/admin/blog/media/upload', {
        method: 'POST',
        body: JSON.stringify({ base64, filename: file.name.replace(/\.[^.]+$/, '.webp'), bucket, mime_type: 'image/webp', file_size_bytes: blob.size, width, height, alt_text: '' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onChange(data.url);
    } catch (e) {
      setWarn('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [adminFetch, bucket, onChange]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-[#1E1E2A]">
          <img src={value} alt="" className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition">Replace</button>
            <button type="button" onClick={() => onChange('')} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition">Remove</button>
          </div>
        </div>
      ) : (
        <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => inputRef.current?.click()} className="border border-dashed border-[#1E1E2A] hover:border-[#EC81FF]/40 rounded-xl p-6 text-center cursor-pointer transition-colors group">
          {uploading ? (
            <div className="flex flex-col items-center gap-2"><Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" /><span className="text-xs text-slate-500">Uploading…</span></div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-slate-600 group-hover:text-[#EC81FF]/60 mx-auto mb-2 transition-colors" />
              <p className="text-xs text-slate-500">{hint || 'Drop image here or click'}</p>
              <p className="text-[10px] text-slate-700 mt-1">Auto-converted to WebP · Max 5 MB</p>
            </>
          )}
        </div>
      )}
      {warn && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{warn}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag Input (search + create)
// ─────────────────────────────────────────────────────────────────────────────

function TagInput({ allTags, selectedIds, onToggle, onCreateTag }) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = allTags.filter((t) => selectedIds.includes(t.id));
  const filtered = allTags.filter((t) => !selectedIds.includes(t.id) && t.name.toLowerCase().includes(query.toLowerCase()));
  const canCreate = query.trim() && !allTags.find((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  const handleCreate = async () => {
    if (!query.trim() || creating) return;
    setCreating(true);
    try { await onCreateTag(query.trim()); setQuery(''); } finally { setCreating(false); }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EC81FF]/10 text-[#EC81FF] text-[11px] font-medium border border-[#EC81FF]/20">
              #{t.name}
              <button type="button" onClick={() => onToggle(t.id)} className="hover:text-white transition-colors"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (canCreate) handleCreate(); } }}
          placeholder="Search or create tag…"
          className="w-full px-3.5 py-2 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EC81FF]/50 transition-colors"
        />
        {open && (filtered.length > 0 || canCreate) && (
          <div className="absolute z-50 mt-1 w-full bg-[#12121A] border border-[#1E1E2A] rounded-xl shadow-xl max-h-48 overflow-y-auto">
            {filtered.map((t) => (
              <button key={t.id} type="button" onClick={() => { onToggle(t.id); setQuery(''); setOpen(false); }} className="w-full text-left px-3.5 py-2 text-sm text-slate-300 hover:bg-[#1E1E2A] hover:text-white transition-colors">
                #{t.name}
              </button>
            ))}
            {canCreate && (
              <button type="button" onClick={handleCreate} disabled={creating} className="w-full text-left px-3.5 py-2 text-sm text-[#EC81FF] hover:bg-[#EC81FF]/5 transition-colors flex items-center gap-2 border-t border-[#1E1E2A]">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create "#{query.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Selector with inline create
// ─────────────────────────────────────────────────────────────────────────────

function CategorySelector({ categories, value, onChange, adminFetch, onCategoryCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#EC81FF');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true); setErr('');
    try {
      const res = await adminFetch('/api/admin/blog/categories', { method: 'POST', body: JSON.stringify({ name: newName.trim(), color: newColor }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onCategoryCreated(data.category);
      onChange(data.category.id);
      setShowCreate(false); setNewName('');
    } catch (e) { setErr(e.message); } finally { setCreating(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1">
          <option value="">— No category —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <button type="button" onClick={() => setShowCreate((v) => !v)} title="New category" className="px-3 py-2 rounded-xl border border-[#1E1E2A] text-slate-400 hover:text-[#EC81FF] hover:border-[#EC81FF]/30 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {showCreate && (
        <div className="p-3 rounded-xl border border-[#EC81FF]/20 bg-[#EC81FF]/5 space-y-2">
          <p className="text-[11px] font-semibold text-[#EC81FF] uppercase tracking-wider">New Category</p>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} placeholder="Name" className="flex-1 px-3 py-2 bg-[#0A0A12] border border-[#1E1E2A] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EC81FF]/50" />
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-10 h-9 rounded-xl border border-[#1E1E2A] bg-transparent cursor-pointer" />
            <button type="button" onClick={handleCreate} disabled={creating || !newName.trim()} className="px-3 py-2 rounded-xl bg-[#EC81FF] text-black text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
            </button>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Editor
// ─────────────────────────────────────────────────────────────────────────────

function FaqEditor({ items, onChange }) {
  const add = () => onChange([...items, { question: '', answer: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-xl border border-[#1E1E2A] space-y-2 bg-[#0A0A12]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Q{i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <Input value={item.question} onChange={(e) => update(i, 'question', e.target.value)} placeholder="Question…" />
          <Textarea rows={2} value={item.answer} onChange={(e) => update(i, 'answer', e.target.value)} placeholder="Answer…" />
        </div>
      ))}
      <button type="button" onClick={add} className="w-full py-2 rounded-xl border border-dashed border-[#1E1E2A] text-xs text-slate-500 hover:text-[#EC81FF] hover:border-[#EC81FF]/30 transition-colors flex items-center justify-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add FAQ item
      </button>
    </div>
  );
}

export default function BlogEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { adminFetch, admin } = useAdminAuth();
  const role = admin?.role || 'viewer';
  const canPublish = ['super_admin', 'admin'].includes(role);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [authors, setAuthors] = useState([]);

  // ── Form fields ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [quickAnswer, setQuickAnswer] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverAlt, setCoverAlt] = useState('');
  const [coverCaption, setCoverCaption] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [ogImageAlt, setOgImageAlt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [primaryKw, setPrimaryKw] = useState('');
  const [secondaryKws, setSecondaryKws] = useState('');
  const [geoEntities, setGeoEntities] = useState('');
  const [aeoQuestions, setAeoQuestions] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState('draft');
  const [faqItems, setFaqItems] = useState([]);
  const [readTime, setReadTime] = useState(5);
  const [authorId, setAuthorId] = useState('');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [editorTab, setEditorTab] = useState('visual');
  const [showSeo, setShowSeo] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showAeo, setShowAeo] = useState(false);
  const inlineImageInputRef = useRef(null);

  // ── TipTap editor ───────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TipTapLink.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      TipTapImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Start writing your article here…' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
    ],
    content: '',
    onUpdate({ editor }) {
      setContentHtml(editor.getHTML());
    },
  });

  const editorInitialized = useRef(false);
  useEffect(() => {
    if (editor && contentHtml && !editorInitialized.current) {
      editor.commands.setContent(contentHtml, false);
      editorInitialized.current = true;
    }
  }, [editor, contentHtml]);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [cr, tr, ar] = await Promise.all([
          adminFetch('/api/admin/blog/categories').then((r) => r.json()),
          adminFetch('/api/admin/blog/tags').then((r) => r.json()),
          adminFetch('/api/admin/blog/authors').then((r) => r.json()),
        ]);
        setCategories(cr.categories || []);
        setAllTags(tr.tags || []);
        setAuthors(ar.authors || []);

        if (!isNew) {
          const pr = await adminFetch(`/api/admin/blog/posts/${id}`).then((r) => r.json());
          if (pr.error) { setError(pr.error); return; }
          const p = pr.post;
          setTitle(p.title || '');
          setSlug(p.slug || '');
          setSlugEdited(true);
          setExcerpt(p.excerpt || '');
          setQuickAnswer(p.quick_answer || '');
          setContentHtml(p.content_html || '');
          setCategoryId(p.category_id || '');
          setCoverUrl(p.cover_image_url || '');
          setCoverAlt(p.cover_image_alt || '');
          setCoverCaption(p.cover_image_caption || '');
          setOgImageUrl(p.og_image_url || '');
          setOgImageAlt(p.og_image_alt || '');
          setMetaTitle(p.meta_title || '');
          setMetaDesc(p.meta_description || '');
          setPrimaryKw(p.primary_keyword || '');
          setSecondaryKws(Array.isArray(p.secondary_keywords) ? p.secondary_keywords.join(', ') : (p.secondary_keywords || ''));
          setGeoEntities(Array.isArray(p.geo_entities) ? p.geo_entities.join(', ') : (p.geo_entities || ''));
          setAeoQuestions(Array.isArray(p.aeo_questions) ? p.aeo_questions.join('\n') : (p.aeo_questions || ''));
          setIsFeatured(p.is_featured || false);
          setStatus(p.status || 'draft');
          setFaqItems(p.faq_items || []);
          setReadTime(p.read_time_minutes || 5);
          setAuthorId(p.author_id || '');
          setSelectedTagIds((pr.tags || []).map((t) => t.id));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isNew, adminFetch]);

  // Auto-slug
  useEffect(() => {
    if (!slugEdited && title) setSlug(slugify(title));
  }, [title, slugEdited]);

  // Auto read time
  useEffect(() => {
    const words = contentHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    setReadTime(Math.max(1, Math.round(words / 200)));
  }, [contentHtml]);

  // ── Tag helpers ─────────────────────────────────────────────────────────────
  const handleTagToggle = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((tid) => tid !== tagId) : [...prev, tagId],
    );
  };

  const handleCreateTag = async (name) => {
    const res = await adminFetch('/api/admin/blog/tags', { method: 'POST', body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setAllTags((prev) => [...prev, data.tag]);
    setSelectedTagIds((prev) => [...prev, data.tag.id]);
  };

  // ── Inline image ─────────────────────────────────────────────────────────────
  const handleInlineImageFile = useCallback(async (file) => {
    if (!file || !editor) return;
    try {
      const { blob } = await compressToWebP(file, 1200, 0.80);
      const base64 = await blobToBase64(blob);
      const res = await adminFetch('/api/admin/blog/media/upload', {
        method: 'POST',
        body: JSON.stringify({ base64, filename: file.name.replace(/\.[^.]+$/, '.webp'), bucket: 'blog-inline', mime_type: 'image/webp', file_size_bytes: blob.size, alt_text: '' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      editor.chain().focus().setImage({ src: data.url, alt: '' }).run();
    } catch (e) {
      setError('Image insert failed: ' + e.message);
    }
  }, [editor, adminFetch]);

  // ── Save / Publish ────────────────────────────────────────────────────────────
  const handleSave = async (publishOverride) => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!slug.trim()) { setError('Slug is required'); return; }

    const targetStatus = publishOverride ?? status;
    if (targetStatus === 'published' && !canPublish) {
      setError('Your role cannot publish. Save as draft instead.');
      return;
    }

    setSaving(true); setError(''); setSaved(false);

    const parseList = (str) => str.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      quick_answer: quickAnswer.trim(),
      content_html: contentHtml,
      content_md: '',
      category_id: categoryId || null,
      tag_ids: selectedTagIds,
      cover_image_url: coverUrl.trim() || null,
      cover_image_alt: coverAlt.trim() || null,
      cover_image_caption: coverCaption.trim() || null,
      og_image_url: ogImageUrl.trim() || null,
      og_image_alt: ogImageAlt.trim() || null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDesc.trim() || null,
      primary_keyword: primaryKw.trim() || null,
      secondary_keywords: parseList(secondaryKws),
      geo_entities: parseList(geoEntities),
      aeo_questions: aeoQuestions.split('\n').map((s) => s.trim()).filter(Boolean),
      is_featured: isFeatured,
      status: targetStatus,
      faq_items: faqItems,
      read_time_minutes: readTime,
      author_id: authorId || null,
    };
    if (targetStatus === 'published' && (isNew || status !== 'published')) {
      payload.published_at = new Date().toISOString();
    }

    try {
      let result;
      if (isNew) {
        const res = await adminFetch('/api/admin/blog/posts', { method: 'POST', body: JSON.stringify(payload) });
        result = await res.json();
        if (result.error) throw new Error(result.error);
        navigate(`${ADMIN_SLUG}/blog/${result.post.id}`, { replace: true });
      } else {
        const res = await adminFetch(`/api/admin/blog/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        result = await res.json();
        if (result.error) throw new Error(result.error);
        setStatus(result.post?.status || targetStatus);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+S shortcut
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" />
      </div>
    );
  }

  const wordCount = contentHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const statusColors = {
    draft: 'bg-slate-700/60 text-slate-300',
    published: 'bg-green-900/50 text-green-400 border border-green-800',
    scheduled: 'bg-blue-900/50 text-blue-400 border border-blue-800',
    archived: 'bg-slate-800 text-slate-500',
  };

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-6 bg-[#0A0A12]/90 backdrop-blur-xl border-b border-[#1E1E2A] flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(`${ADMIN_SLUG}/blog`)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Blog
        </button>
        <div className="h-4 w-px bg-[#1E1E2A]" />
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusColors[status] || statusColors.draft}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {!isNew && (
          <a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-[#EC81FF] transition-colors flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Preview
          </a>
        )}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {error && <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" />{error}</span>}
          {saved && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>}
          <button type="button" onClick={() => handleSave()} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#1E1E2A] text-white text-xs font-semibold hover:bg-[#1E1E2A] transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </button>
          {canPublish && (
            <button type="button" onClick={() => handleSave('published')} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EC81FF] text-black text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              <Send className="w-3.5 h-3.5" />
              {status === 'published' ? 'Update' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Title + slug + excerpt */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl p-5 space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title…"
              className="w-full text-2xl font-bold bg-transparent text-white placeholder:text-slate-700 border-none outline-none leading-tight"
            />
            <div className="flex items-center gap-2 text-xs border-b border-[#1E1E2A] pb-3">
              <span className="text-slate-600 font-mono shrink-0">/blog/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                onBlur={(e) => setSlug(slugify(e.target.value))}
                placeholder="post-slug"
                className="flex-1 bg-transparent text-slate-400 font-mono outline-none border-b border-transparent focus:border-[#EC81FF]/40 pb-0.5 transition-colors"
              />
              <button type="button" onClick={() => { setSlug(slugify(title)); setSlugEdited(false); }} title="Re-generate" className="text-slate-600 hover:text-[#EC81FF] transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <Field label="Excerpt" hint="2–3 sentence summary for listings and meta fallback.">
              <Textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Brief description for listings and SEO…" className="font-sans" />
            </Field>
            <Field label="Quick Answer" hint="One sentence for featured snippets / AEO.">
              <Input value={quickAnswer} onChange={(e) => setQuickAnswer(e.target.value)} placeholder="One-sentence answer for featured snippets…" />
            </Field>
          </div>

          {/* Rich text editor */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-0.5 px-5 pt-3 pb-0 border-b border-[#1E1E2A]">
              {[
                { key: 'visual', label: 'Visual', Icon: Type },
                { key: 'html', label: 'HTML', Icon: Code2 },
                { key: 'preview', label: 'Preview', Icon: Eye },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'html' && editorTab === 'visual' && editor) setContentHtml(editor.getHTML());
                    if (key === 'visual' && editorTab === 'html' && editor) editor.commands.setContent(contentHtml, false);
                    setEditorTab(key);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${editorTab === key ? 'border-[#EC81FF] text-[#EC81FF]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
              <span className="ml-auto mb-2 text-[10px] text-slate-600 font-mono">{wordCount.toLocaleString()} words</span>
            </div>

            {editorTab === 'visual' && (
              <>
                <TipTapToolbar editor={editor} onInsertImage={() => inlineImageInputRef.current?.click()} />
                <div className="min-h-[480px]"><EditorContent editor={editor} /></div>
              </>
            )}
            {editorTab === 'html' && (
              <textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                rows={26}
                spellCheck={false}
                placeholder="<p>Paste or write HTML here…</p>"
                className="w-full px-5 py-4 bg-[#0A0A12] text-sm text-slate-300 font-mono leading-relaxed resize-y focus:outline-none placeholder:text-slate-700"
              />
            )}
            {editorTab === 'preview' && (
              <div className="p-6">
                {contentHtml
                  ? <div className="article-preview" dangerouslySetInnerHTML={{ __html: contentHtml }} />
                  : <p className="text-slate-600 text-sm italic">No content yet.</p>
                }
              </div>
            )}
          </div>

          {/* SEO section */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setShowSeo((v) => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#EC81FF]/5 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#EC81FF]" />
                <span className="text-sm font-semibold text-white">SEO & Meta</span>
                {(metaTitle || metaDesc || primaryKw) && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </div>
              {showSeo ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {showSeo && (
              <div className="px-5 pb-5 space-y-4 border-t border-[#1E1E2A] pt-4">
                <Field label="Meta Title" hint="50–60 chars. Overrides title in SERPs.">
                  <div className="relative">
                    <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title || 'Leave blank to use article title'} maxLength={80} />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono ${metaTitle.length > 60 ? 'text-amber-400' : 'text-slate-600'}`}>{metaTitle.length}/60</span>
                  </div>
                </Field>
                <Field label="Meta Description" hint="150–160 chars. SERP snippet.">
                  <div className="relative">
                    <Textarea rows={2} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder={excerpt || 'Leave blank to use excerpt'} maxLength={200} className="font-sans pr-14" />
                    <span className={`absolute right-3 bottom-3 text-[10px] font-mono ${metaDesc.length > 160 ? 'text-amber-400' : 'text-slate-600'}`}>{metaDesc.length}/160</span>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Primary Keyword"><Input value={primaryKw} onChange={(e) => setPrimaryKw(e.target.value)} placeholder="e.g. DeFi credit score" /></Field>
                  <Field label="Read Time (min)"><Input type="number" min={1} max={60} value={readTime} onChange={(e) => setReadTime(Number(e.target.value))} /></Field>
                </div>
                <Field label="Secondary Keywords" hint="Comma-separated."><Input value={secondaryKws} onChange={(e) => setSecondaryKws(e.target.value)} placeholder="on-chain credit, wallet score…" /></Field>
                <Field label="Geo Entities" hint="Locations relevant to this post."><Input value={geoEntities} onChange={(e) => setGeoEntities(e.target.value)} placeholder="Solana, DeFi, Blockchain…" /></Field>
              </div>
            )}
          </div>

          {/* AEO section */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setShowAeo((v) => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#EC81FF]/5 transition-colors">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[#EC81FF]" />
                <span className="text-sm font-semibold text-white">AEO — Answer Engine</span>
                {aeoQuestions && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </div>
              {showAeo ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {showAeo && (
              <div className="px-5 pb-5 space-y-4 border-t border-[#1E1E2A] pt-4">
                <Field label="AEO Questions" hint="One question per line. Used to target Perplexity, ChatGPT Search etc.">
                  <Textarea rows={4} value={aeoQuestions} onChange={(e) => setAeoQuestions(e.target.value)} placeholder={"What is a DeFi credit score?\nHow does Lendra calculate on-chain credit?"} className="font-sans" />
                </Field>
              </div>
            )}
          </div>

          {/* FAQ section */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setShowFaq((v) => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#EC81FF]/5 transition-colors">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#EC81FF]" />
                <span className="text-sm font-semibold text-white">FAQ Schema</span>
                {faqItems.length > 0 && <span className="text-[10px] bg-[#EC81FF]/10 text-[#EC81FF] px-2 py-0.5 rounded-full font-semibold">{faqItems.length}</span>}
              </div>
              {showFaq ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {showFaq && (
              <div className="px-5 pb-5 border-t border-[#1E1E2A] pt-4">
                <FaqEditor items={faqItems} onChange={setFaqItems} />
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────────── */}
        <div className="space-y-4 xl:sticky xl:top-16">

          {/* Publishing */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E2A]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Publishing</span>
            </div>
            <div className="p-4 space-y-4">
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  {canPublish && <option value="published">Published</option>}
                  {canPublish && <option value="scheduled">Scheduled</option>}
                  <option value="archived">Archived</option>
                </Select>
              </Field>
              <Field label="Author">
                <Select value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
                  <option value="">— No author —</option>
                  {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </Field>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Featured</span>
                <Toggle checked={isFeatured} onChange={setIsFeatured} />
              </div>
              <div className="text-[10px] text-slate-600 font-mono border-t border-[#1E1E2A] pt-3">
                ~{readTime} min read · {wordCount.toLocaleString()} words
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E2A]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cover Image</span>
            </div>
            <div className="p-4 space-y-3">
              <ImageUploader value={coverUrl} onChange={setCoverUrl} bucket="blog-covers" hint="1600 × 900 px recommended." adminFetch={adminFetch} />
              {coverUrl && (
                <>
                  <Input value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} placeholder="Alt text (accessibility + SEO)" />
                  <Input value={coverCaption} onChange={(e) => setCoverCaption(e.target.value)} placeholder="Optional caption" />
                </>
              )}
            </div>
          </div>

          {/* OG Image */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E1E2A]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OG / Social Image</span>
              {coverUrl && !ogImageUrl && (
                <button type="button" onClick={() => setOgImageUrl(coverUrl)} className="text-[10px] text-[#EC81FF] hover:underline">Copy from cover</button>
              )}
            </div>
            <div className="p-4 space-y-3">
              <ImageUploader value={ogImageUrl} onChange={setOgImageUrl} bucket="blog-og" hint="1200 × 630 px for social sharing." adminFetch={adminFetch} />
              {ogImageUrl && <Input value={ogImageAlt} onChange={(e) => setOgImageAlt(e.target.value)} placeholder="OG image alt text" />}
            </div>
          </div>

          {/* Category */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl">
            <div className="flex items-center px-5 py-3 border-b border-[#1E1E2A]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</span>
            </div>
            <div className="p-4">
              <CategorySelector
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                adminFetch={adminFetch}
                onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="bg-[#0D0D18] border border-[#1E1E2A] rounded-2xl">
            <div className="flex items-center px-5 py-3 border-b border-[#1E1E2A]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags</span>
            </div>
            <div className="p-4">
              <TagInput allTags={allTags} selectedIds={selectedTagIds} onToggle={handleTagToggle} onCreateTag={handleCreateTag} />
            </div>
          </div>

        </div>
      </div>

      {/* Hidden input for inline image */}
      <input ref={inlineImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInlineImageFile(e.target.files?.[0])} />

      <style>{`
        .article-preview { font-size:15px; line-height:1.8; color:#E0E0E8; }
        .article-preview h1 { font-size:2em; font-weight:800; color:#fff; margin:1em 0 0.4em; }
        .article-preview h2 { font-size:1.5em; font-weight:700; color:#fff; margin:1em 0 0.4em; }
        .article-preview h3 { font-size:1.2em; font-weight:600; color:#fff; margin:0.8em 0 0.3em; }
        .article-preview p { margin-bottom:1em; }
        .article-preview ul { list-style:disc; padding-left:1.5em; margin-bottom:1em; }
        .article-preview ol { list-style:decimal; padding-left:1.5em; margin-bottom:1em; }
        .article-preview blockquote { border-left:3px solid #EC81FF; padding:10px 18px; margin:1.25em 0; background:rgba(236,129,255,0.05); border-radius:0 8px 8px 0; color:#9CA3AF; font-style:italic; }
        .article-preview code { background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; font-size:0.88em; color:#EC81FF; }
        .article-preview pre { background:#0D0D18; border:1px solid #1E1E2A; border-radius:10px; padding:16px; overflow-x:auto; margin:1.25em 0; }
        .article-preview pre code { background:none; padding:0; color:#E0E0E8; }
        .article-preview img { max-width:100%; border-radius:10px; margin:1em 0; }
        .article-preview a { color:#EC81FF; text-decoration:underline; }
        .article-preview table { border-collapse:collapse; width:100%; margin:1.25em 0; }
        .article-preview td, .article-preview th { border:1px solid #1E1E2A; padding:8px 14px; text-align:left; }
        .article-preview th { background:rgba(255,255,255,0.04); font-weight:600; color:#fff; }
      `}</style>
    </div>
  );
}








