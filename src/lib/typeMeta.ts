import { CheckSquare, FileText, Link2, Bell, type LucideIcon } from 'lucide-react';
import type { ItemType } from './types';

export const TYPE_META: Record<ItemType, { label: string; plural: string; icon: LucideIcon }> = {
  task: { label: 'Task', plural: 'Tasks', icon: CheckSquare },
  note: { label: 'Note', plural: 'Notes', icon: FileText },
  link: { label: 'Link', plural: 'Links', icon: Link2 },
  reminder: { label: 'Reminder', plural: 'Reminders', icon: Bell },
};
