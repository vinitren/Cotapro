/**
 * Controle de versão do app para evitar conflitos de cache/storage entre deploys.
 * Quando a versão muda, limpa storage antigo que pode causar erros.
 */

export const APP_VERSION = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

const APP_VERSION_KEY = 'cotapro-app-version';

const APP_STORAGE_KEYS = [
  'cotapro-storage',
  'customers_list_open',
  'budgets_list_open',
  'catalog_list_open',
  'dashboard-selected-month',
  'show_watermark',
];

export function ensureStorageVersion(): void {
  try {
    const stored = localStorage.getItem(APP_VERSION_KEY);
    if (stored === APP_VERSION) return;

    // Versão mudou: limpar storage antigo
    APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
  } catch {
    /* ignore */
  }
}
