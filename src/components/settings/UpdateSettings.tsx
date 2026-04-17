/**
 * Update Settings Component
 * Shows the installed app version.
 */
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUpdateStore } from '@/stores/update';

export function UpdateSettings() {
  const { t } = useTranslation('settings');
  const { currentVersion, isInitialized, init } = useUpdateStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('updates.loading')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/50 p-4 dark:border-white/5 dark:bg-white/5">
      <p className="text-sm font-medium text-muted-foreground">{t('updates.currentVersion')}</p>
      <p className="text-lg font-semibold text-foreground">v{currentVersion}</p>
    </div>
  );
}

export default UpdateSettings;
