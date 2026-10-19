/**
 * On-device note sorting. Reads the words in a note and picks a folder.
 * Starts from a small built-in vocabulary per folder and learns from every note
 * the person files or moves, so after a handful of corrections it sorts their way.
 * Nothing leaves the device.
 */

export const DEFAULT_FOLDERS = ['Work', 'School', 'Home', 'Health', 'Money', 'People', 'Ideas'];

/** Seed vocabulary. Lowercase, single words or short phrases. */
const SEEDS: Record<string, string[]> = {
  Work: [
    'work', 'meeting', 'client', 'deadline', 'boss', 'manager', 'invoice', 'project', 'email', 'standup', 'office', 'report',
    'shift', 'pitch', 'deck', 'launch', 'hire', 'interview', 'resume', 'linkedin', 'contract', 'proposal', 'quarter', 'kpi',
    'slack', 'jira', 'ticket', 'release', 'deploy', 'sprint', 'coworker', 'team', 'presentation', 'customer', 'sales', 'lead',
    'business', 'startup', 'company', 'payroll', 'vendor', 'agenda', 'followup', 'onboarding', 'demo', 'roadmap', 'clinic', 'patient',
  ],
  School: [
    'class', 'homework', 'exam', 'professor', 'lecture', 'assignment', 'essay', 'quiz', 'semester', 'study', 'grade', 'campus',
    'tuition', 'midterm', 'final', 'syllabus', 'textbook', 'chapter', 'course', 'lab', 'thesis', 'teacher', 'school', 'college',
    'university', 'credits', 'gpa', 'scholarship', 'due', 'canvas', 'office hours', 'group project', 'notes', 'test', 'tutor',
  ],
  Home: [
    'clean', 'laundry', 'groceries', 'dishes', 'plumber', 'landlord', 'kitchen', 'apartment', 'lease', 'vacuum', 'trash',
    'recycling', 'repair', 'fix', 'furniture', 'ikea', 'couch', 'garage', 'yard', 'lawn', 'garden', 'move', 'moving', 'boxes',
    'wifi', 'router', 'utilities', 'electric', 'water bill', 'fridge', 'oven', 'bathroom', 'bedroom', 'house', 'home', 'chores',
    'car', 'oil change', 'tires', 'registration', 'insurance', 'pet', 'dog', 'cat', 'vet', 'dinner', 'recipe', 'cook', 'meal prep',
  ],
  Health: [
    'doctor', 'dentist', 'appointment', 'meds', 'medication', 'prescription', 'pharmacy', 'workout', 'gym', 'run', 'therapy',
    'therapist', 'sleep', 'vitamins', 'symptoms', 'sick', 'fever', 'headache', 'migraine', 'anxiety', 'adhd', 'focus',
    'stretch', 'yoga', 'water', 'steps', 'weight', 'diet', 'protein', 'blood', 'lab results', 'checkup', 'refill', 'adderall',
    'vyvanse', 'insurance card', 'copay', 'physical', 'eye exam', 'glasses', 'allergy', 'rest', 'burnout', 'mental health',
  ],
  Money: [
    'pay', 'budget', 'bill', 'bank', 'tax', 'taxes', 'savings', 'credit', 'loan', 'venmo', 'paycheck', 'subscription', 'rent',
    'mortgage', 'invoice', 'refund', 'receipt', 'deposit', 'transfer', 'irs', 'w2', '1099', 'stripe', 'paypal', 'cash', 'debt',
    'interest', 'investment', 'stocks', '401k', 'roth', 'price', 'cost', 'expense', 'spent', 'owe', 'owes', 'split', 'tip',
    'dollars', 'bucks', 'budgeting', 'cancel subscription', 'renewal', 'fee', 'overdraft',
  ],
  People: [
    'mom', 'dad', 'mother', 'father', 'sister', 'brother', 'grandma', 'grandpa', 'aunt', 'uncle', 'cousin', 'birthday', 'gift',
    'present', 'call', 'text', 'friend', 'friends', 'dinner with', 'wedding', 'family', 'date', 'girlfriend', 'boyfriend',
    'partner', 'wife', 'husband', 'kids', 'son', 'daughter', 'baby', 'party', 'hangout', 'catch up', 'visit', 'thank you',
    'anniversary', 'reunion', 'funeral', 'invite', 'rsvp', 'check in on',
  ],
  Ideas: [
    'idea', 'what if', 'maybe', 'could', 'app', 'build', 'someday', 'concept', 'brainstorm', 'thought', 'thinking', 'design',
    'sketch', 'prototype', 'feature', 'name for', 'story', 'song', 'lyric', 'poem', 'book', 'write about', 'video', 'youtube',
    'content', 'brand', 'logo', 'dream', 'plan for', 'vision', 'wonder', 'imagine', 'invent', 'theory', 'random', 'shower thought',
  ],
};

const STOP = new Set(
  'the a an and or but if then so to of in on at for from with by as is are was were be been being am i me my we our you your he she it its they them their this that these those there here not no yes do does did done have has had will would can could should may might just also very really about into over under up down out off than too'.split(
    ' ',
  ),
);

export function tokens(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9#' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  // bigrams come from the raw words so phrases like "what if" and "office hours" survive the stop list
  const out = raw.filter((w) => !STOP.has(w));
  for (let i = 0; i < raw.length - 1; i++) out.push(`${raw[i]} ${raw[i + 1]}`);
  return out;
}

/** Learned word counts per folder. Persisted in the store. */
export type SortModel = Record<string, Record<string, number>>;

export interface Suggestion {
  folder: string | null;
  confidence: number;
  scores: Record<string, number>;
}

export function suggestFolder(text: string, folders: string[], model: SortModel): Suggestion {
  const toks = tokens(text);
  const scores: Record<string, number> = {};
  const tagged = /#([a-z][a-z0-9-]*)/i.exec(text);
  if (tagged) {
    const hit = folders.find((f) => f.toLowerCase() === tagged[1].toLowerCase());
    if (hit) return { folder: hit, confidence: 1, scores: { [hit]: 1 } };
  }
  if (toks.length === 0) return { folder: null, confidence: 0, scores };

  for (const f of folders) {
    const seed = new Set(SEEDS[f] ?? []);
    const learned = model[f] ?? {};
    const learnedTotal = Object.values(learned).reduce((a, b) => a + b, 0);
    let s = 0;
    for (const t of toks) {
      if (seed.has(t)) s += 1;
      const c = learned[t];
      if (c) s += Math.min(2, (c / Math.max(1, learnedTotal)) * 25 + 0.5);
    }
    scores[f] = s;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0] ?? [null, 0];
  const second = ranked[1]?.[1] ?? 0;
  if (!best || bestScore < 1) return { folder: null, confidence: 0, scores };
  const confidence = Math.min(1, (bestScore - second) / (bestScore + 1) + bestScore / (toks.length + 4));
  return { folder: confidence >= 0.25 ? best : null, confidence, scores };
}

/** Add (sign = 1) or remove (sign = -1) a note's words from a folder's learned counts. */
export function learn(model: SortModel, folder: string, text: string, sign: 1 | -1 = 1): SortModel {
  const next: SortModel = { ...model, [folder]: { ...(model[folder] ?? {}) } };
  const seen = new Set(tokens(text));
  for (const t of seen) {
    const v = (next[folder][t] ?? 0) + sign;
    if (v <= 0) delete next[folder][t];
    else next[folder][t] = v;
  }
  return next;
}

/** A short title from the first real line: whole line if short, else cut at a word boundary. */
export function autoTitle(text: string, max = 48): string {
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  const clean = line.replace(/^#+\s*/, '').replace(/^[-*]\s+/, '');
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > 20 ? cut.slice(0, at) : cut).trim()}…`;
}
