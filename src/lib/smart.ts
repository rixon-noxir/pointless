/** Client side of the AI sorter. Sends the note text and folder names, gets a folder and a title back. */
export interface SmartResult {
  folder: string;
  title: string;
}

export async function smartSort(text: string, folders: string[]): Promise<SmartResult | null> {
  const body = text.trim();
  if (!body || typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 12_000);
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body.slice(0, 4000), folders }),
      signal: controller.signal,
    });
    window.clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<SmartResult>;
    if (!data.folder || typeof data.folder !== 'string') return null;
    return { folder: data.folder.slice(0, 24), title: (data.title ?? '').slice(0, 60) };
  } catch {
    return null;
  }
}
