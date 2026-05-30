import { BCF_TOPIC_TYPE_LABELS } from './types';

type TrFn = (msg: string, ...args: any[]) => string;

export function statusClass(status: string): string {
    const map: Record<string, string> = { 'Open': 'bcf-badge--open', 'Active': 'bcf-badge--active', 'In Progress': 'bcf-badge--progress', 'Resolved': 'bcf-badge--resolved', 'Closed': 'bcf-badge--closed', 'ReOpened': 'bcf-badge--reopened' };
    return map[status] ?? 'bcf-badge--default';
}

export function statusStripClass(status: string): string {
    const map: Record<string, string> = { 'Open': 'bcf-strip--open', 'Active': 'bcf-strip--active', 'In Progress': 'bcf-strip--progress', 'Resolved': 'bcf-strip--resolved', 'Closed': 'bcf-strip--closed', 'ReOpened': 'bcf-strip--reopened' };
    return map[status] ?? 'bcf-strip--default';
}

export function statusLabel(status: string, tr: TrFn): string {
    const map: Record<string, string> = { 'Open': tr('Открыто'), 'Active': tr('Активно'), 'In Progress': tr('В работе'), 'Resolved': tr('Решено'), 'Closed': tr('Закрыто'), 'ReOpened': tr('Повторное') };
    return map[status] ?? status;
}

export function topicTypeLabel(type: string): string {
    return BCF_TOPIC_TYPE_LABELS[type] ?? type;
}

export function formatDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString('ru-RU'); } catch { return iso; }
}
