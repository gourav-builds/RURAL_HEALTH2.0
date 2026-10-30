import type { SyncStatus, ClinicalStatus } from '@/types';


interface SyncBadgeProps { status: SyncStatus; className?: string; }
export function SyncBadge({ status, className = '' }: SyncBadgeProps) {
  const map: Record<SyncStatus, { label: string; cls: string; dot: string }> = {
    synced:   { label: 'Synced',    cls: 'badge-synced',   dot: 'bg-green-400' },
    local:    { label: 'On device', cls: 'badge-local',    dot: 'bg-amber-400' },
    conflict: { label: 'Conflict',  cls: 'badge-conflict', dot: 'bg-red-400' },
  };
  const { label, cls, dot } = map[status];
  return (
    <span className={`${cls} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse-dot`} aria-hidden />
      {label}
    </span>
  );
}

interface ClinicalBadgeProps { status: ClinicalStatus; className?: string; }
export function ClinicalBadge({ status, className = '' }: ClinicalBadgeProps) {
  const map: Record<ClinicalStatus, { label: string; cls: string }> = {
    draft:          { label: 'Draft',           cls: 'badge-draft' },
    awaiting_review:{ label: 'Awaiting review', cls: 'badge-pending' },
    reviewed:       { label: 'Reviewed',        cls: 'badge-reviewed' },
    amended:        { label: 'Amended',         cls: 'badge-local' },
  };
  const { label, cls } = map[status];
  return <span className={`${cls} ${className}`}>{label}</span>;
}
