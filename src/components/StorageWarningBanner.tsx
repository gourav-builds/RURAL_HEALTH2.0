import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertIcon, XIcon } from '@/components/Icons';
import { useDevice } from '@/context/DeviceContext';
import { STORAGE_WARN_PERCENT } from '@/db';
import { formatBytes } from '@/utils';

export function StorageWarningBanner() {
  const { storageInfo } = useDevice();
  const [dismissed, setDismissed] = useState(false);
  if (!storageInfo) return null;
  const { percentUsed, available, isPersistent } = storageInfo;
  const low = percentUsed !== null && percentUsed >= STORAGE_WARN_PERCENT;
  if (!low && (isPersistent || dismissed)) return null;
  return <div className="storage-notice-wrap"><div className={`storage-notice ${low ? 'storage-critical' : ''}`} role={low ? 'alert' : 'status'}>
    <AlertIcon className="w-4 h-4" />
    <span>{low ? `Storage almost full · ${percentUsed}% used` : 'Storage not persistent'}<span className="storage-notice-detail">{low ? ` · ${available !== null ? formatBytes(available) + ' remaining' : 'New records may fail to save'}` : ' · Protect your offline records'}</span></span>
    <Link to="/settings" className="storage-fix" aria-label="Fix storage settings">Fix <span aria-hidden="true">↗</span></Link>
    {!low && <button onClick={() => setDismissed(true)} aria-label="Dismiss storage notice"><XIcon className="w-3.5 h-3.5" /></button>}
  </div></div>;
}
