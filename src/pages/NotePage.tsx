import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, FolderOpen, Trash2, Sparkles, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ageLabel } from '@/lib/time';
import { Chip } from '@/components/TypeBits';
import { smartSort } from '@/lib/smart';

const UNSORTED = 'Unsorted';

/** One note. Just a page to write on. It files itself when you stop typing or leave. */
export default function NotePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const item = useStore((s) => s.items.find((i) => i.id === id));
  const folders = useStore((s) => s.folders);
  const smart = useStore((s) => s.profile.smartSort);
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const fileNote = useStore((s) => s.fileNote);
  const setFolder = useStore((s) => s.setFolder);
  const addFolder = useStore((s) => s.addFolder);
  const applySmartSort = useStore((s) => s.applySmartSort);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [picking, setPicking] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sorting, setSorting] = useState(false);
  const fresh = (location.state as { fresh?: boolean } | null)?.fresh === true;

  const text = item ? (item.body ? `${item.title}\n${item.body}` : item.title) : '';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, 260)}px`;
  }, [text]);

  // File it on-device after typing stops, and again when leaving the page.
  useEffect(() => {
    if (!id) return;
    const t = window.setTimeout(() => fileNote(id), 1200);
    return () => window.clearTimeout(t);
  }, [id, text, fileNote]);
  useEffect(() => {
    const cur = id;
    return () => {
      if (!cur) return;
      const s = useStore.getState();
      const i = s.items.find((x) => x.id === cur);
      if (!i) return;
      if (!i.title.trim() && !i.body.trim()) {
        s.deleteItem(cur); // never keep an empty note
        return;
      }
      s.fileNote(cur);
      if (s.profile.smartSort && !i.folderByHand) {
        void smartSort(`${i.title}\n${i.body}`, s.folders).then((r) => r && useStore.getState().applySmartSort(cur, r.folder, r.title));
      }
    };
  }, [id]);

  if (!item) {
    return (
      <div className="fade-in">
        <button type="button" onClick={() => navigate('/space')} className="inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Notes
        </button>
        <p className="mt-8 text-ink-2">That note is gone.</p>
      </div>
    );
  }

  const onChange = (v: string) => {
    const [first, ...rest] = v.split('\n');
    updateItem(item.id, { title: first, body: rest.join('\n') });
  };

  const runSmart = async () => {
    setSorting(true);
    const r = await smartSort(text, folders);
    if (r) applySmartSort(item.id, r.folder, r.title);
    setSorting(false);
  };

  const folder = item.folder ?? UNSORTED;

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate('/space')} className="inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Notes
        </button>
        <div className="flex items-center gap-1">
          {smart && (
            <button type="button" onClick={runSmart} disabled={sorting} title="Sort with AI" aria-label="Sort with AI" className="p-2 rounded-full text-ink-2 hover:bg-paper-2 disabled:opacity-40">
              <Sparkles size={17} strokeWidth={1.75} />
            </button>
          )}
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => {
                deleteItem(item.id);
                navigate('/space');
              }}
              className="h-9 px-3 rounded-full bg-ink text-paper text-[13px] font-medium"
            >
              Delete for real
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete" className="p-2 rounded-full text-ink-2 hover:bg-paper-2">
              <Trash2 size={17} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Where it landed. Tap to move it; the sorter learns from the move. */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          aria-expanded={picking}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] border transition-colors ${
            item.folder ? 'bg-accent-soft border-transparent text-ink' : 'border-dashed border-line text-ink-3'
          }`}
        >
          <FolderOpen size={13} />
          {item.folder ? folder : text.trim() ? 'not filed yet' : 'files itself when you write'}
          {item.folder && !item.folderByHand && <span className="text-ink-3">· auto</span>}
        </button>
        <div className="expand" data-open={picking}>
          <div>
            <div className="mt-2 flex gap-2 flex-wrap items-center">
              {folders.map((f) => (
                <Chip
                  key={f}
                  active={item.folder === f}
                  onClick={() => {
                    setFolder(item.id, f);
                    setPicking(false);
                  }}
                >
                  {f}
                </Chip>
              ))}
              <Chip active={!item.folder} onClick={() => { setFolder(item.id, null); setPicking(false); }}>
                {UNSORTED}
              </Chip>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = addFolder(newName);
                  if (name) {
                    setFolder(item.id, name);
                    setNewName('');
                    setPicking(false);
                  }
                }}
                className="inline-flex items-center gap-1"
              >
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="new folder"
                  aria-label="New folder name"
                  className="h-8 w-28 px-3 rounded-full bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[13px]"
                />
                <button type="submit" aria-label="Add folder" className="p-1.5 rounded-full text-ink-2 hover:bg-paper-2">
                  <Plus size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <textarea
        ref={ref}
        autoFocus={fresh}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Just write."
        aria-label="Note"
        className="w-full mt-5 bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink-3 min-h-[260px]"
      />

      <p className="mt-6 text-[12px] text-ink-3">
        {item.autoTitle && item.autoTitle !== item.title ? `Listed as "${item.autoTitle}" · ` : ''}
        Saved {ageLabel(item.updatedAt)} ago
      </p>
    </div>
  );
}
