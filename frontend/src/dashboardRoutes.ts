import { useSyncExternalStore } from 'react';
const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};
export function useRecordParam(name: string) {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return new URLSearchParams(hash.split('?')[1] || '').get(name) || '';
}
export function recordHref(name: string, id: string, path = window.location.hash.slice(1).split('?')[0]) {
  return `#${path}?${new URLSearchParams({ [name]: id }).toString()}`;
}
export function listHref() { return window.location.hash.split('?')[0]; }
