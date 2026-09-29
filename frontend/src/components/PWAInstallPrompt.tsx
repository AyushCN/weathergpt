import { useEffect, useState } from 'react';

/**
 * PWA Registration Component
 * Handles service worker registration and update notifications
 */
export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA installed');
    };

    // Listen for offline/online
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      });
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
    } else {
      console.log('User dismissed install');
    }
    
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    window.location.reload();
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  // Don't render anything if not showing prompt and not offline
  if (!showPrompt && !isOffline && !updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 z-50 space-y-3 pointer-events-none">
      {/* Offline indicator */}
      {isOffline && (
        <div className="pointer-events-auto bg-amber-100 border border-amber-400 text-amber-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 100 2v3a1 1 0 102 0v-3a1 1 0 10-2 0z" clipRule="evenodd"/>
          </svg>
          <span className="font-medium">You're offline</span>
          <span className="text-sm opacity-75">Some features may be limited</span>
        </div>
      )}

      {/* Update available */}
      {updateAvailable && (
        <div className="pointer-events-auto bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011-1h12a1 1 0 110 2H5.414l4.293 4.293a1 1 0 01-1.414 1.414l-7-7a1 1 0 010-1.414l7-7a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            <span className="font-medium">Update available</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={dismissPrompt}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {showPrompt && !isOffline && !updateAvailable && (
        <div className="pointer-events-auto bg-white border border-blue-200 shadow-xl rounded-xl p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H6v-2h4v-2H6v-2h4v-2H6V8h10v2h-4v2h4v2h-4v2h4v2H6v2h4z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Install WeatherGPT</h3>
              <p className="text-sm text-gray-600 mt-1">Install for offline access, faster loading, and home screen access</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={dismissPrompt}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}