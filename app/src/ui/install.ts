/*
 * Android Chrome (and desktop Chrome) fire `beforeinstallprompt` when the app can be installed.
 * Keeping that event lets the install card show an Install button that opens the browser's own
 * prompt; iPhone has no such event, so there the card can only list the Share → Add steps.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: BeforeInstallPromptEvent | null = null;

export const canPromptInstall = () => !!deferred;

/** Starts listening; `onChange` runs when an Install button should appear or go. */
export function watchInstallPrompt(onChange: () => void) {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    onChange();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    onChange();
  });
}

/** Shows the browser's install prompt; true when the user accepted it. */
export async function promptInstall() {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  try {
    await e.prompt();
    return (await e.userChoice).outcome === 'accepted';
  } catch (err) {
    return false;
  }
}
