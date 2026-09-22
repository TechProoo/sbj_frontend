import { useEffect, useState } from 'react';
import { LuDownload, LuShare, LuSquarePlus, LuX } from 'react-icons/lu';
import {
  isInstalled,
  isIos,
  onInstallAvailable,
  promptInstall,
} from '../lib/pwa';

const DISMISSED_KEY = 'sbj.install.dismissed';

/*
 * The "keep this on your phone" nudge.
 *
 * Chrome and Android hand us a prompt we can fire on demand. iOS gives us
 * nothing, so there it has to be instructions — and on iOS installing is also
 * the only way notifications work at all, which is why it says so.
 */
export function InstallPrompt() {
  const [available, setAvailable] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isInstalled()) return;

    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
    } catch {
      setDismissed(false);
    }

    return onInstallAvailable(setAvailable);
  }, []);

  const close = () => {
    setDismissed(true);
    setShowIosHelp(false);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Private window — it will simply ask again next time.
    }
  };

  if (isInstalled() || dismissed) return null;

  // iOS never fires beforeinstallprompt, so offer it there regardless.
  const ios = isIos();
  if (!available && !ios) return null;

  return (
    <div className="install" role="dialog" aria-label="Add SBJ to your phone">
      <button
        type="button"
        className="install-close"
        onClick={close}
        aria-label="Not now"
      >
        <LuX aria-hidden="true" />
      </button>

      <img src="/icons/icon-192.png" alt="" width={46} height={46} />

      <div className="install-copy">
        <strong>Keep SBJ on your phone</strong>
        {showIosHelp ? (
          <p>
            Tap <LuShare aria-hidden="true" /> <b>Share</b>, then{' '}
            <LuSquarePlus aria-hidden="true" /> <b>Add to Home Screen</b>. On
            iPhone this is also what lets us send you order updates.
          </p>
        ) : (
          <p>
            Add it to your home screen and we can tell you the moment your food
            is ready.
          </p>
        )}
      </div>

      {!showIosHelp && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (ios) setShowIosHelp(true);
            else void promptInstall();
          }}
        >
          <LuDownload aria-hidden="true" />
          {ios ? 'How' : 'Add'}
        </button>
      )}
    </div>
  );
}
