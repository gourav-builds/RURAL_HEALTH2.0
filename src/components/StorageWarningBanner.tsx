import { AlertIcon } from '@/components/Icons';
import { useDevice } from '@/context/DeviceContext';
import { STORAGE_WARN_PERCENT } from '@/db';
import { formatBytes } from '@/utils';


export function StorageWarningBanner() {
  const { storageInfo } = useDevice();
  if (!storageInfo) return null;
  const { percentUsed, available, isPersistent } = storageInfo;

  const showLowStorageWarning = percentUsed !== null && percentUsed >= STORAGE_WARN_PERCENT;
  const showPersistenceWarning = !isPersistent;

  if (!showLowStorageWarning && !showPersistenceWarning) return null;

  return (
    <div className="px-6 pt-4 space-y-2 animate-fade-in" role="alert">
      {showLowStorageWarning && (
        <div className="alert-warning">
          <AlertIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Storage almost full ({percentUsed}% used)</p>
            <p className="mt-0.5 text-amber-400/80">
              {available !== null ? `${formatBytes(available)} remaining.` : ''}
              {' '}Go to <strong>Settings → Storage</strong> to free up space. New records may fail to save.
            </p>
          </div>
        </div>
      )}
      {showPersistenceWarning && (
        <div className="alert-warning">
          <AlertIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Storage not persistent</p>
            <p className="mt-0.5 text-amber-400/80">
              The browser may clear offline records when low on storage.
              Allow persistent storage in your browser settings to protect patient data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
