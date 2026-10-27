import React from 'react';

interface AnnouncementModalProps {
  open: boolean;
  onDismiss: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ open, onDismiss }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="announcement-dialog-title"
      aria-describedby="announcement-dialog-description"
    >
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-zinc-900 p-6 text-zinc-50 shadow-2xl">
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h2 id="announcement-dialog-title" className="text-lg font-semibold leading-none tracking-tight">
            📢 Important Announcement
          </h2>
          <div
            id="announcement-dialog-description"
            className="space-y-3 pt-2 text-sm leading-relaxed text-zinc-400"
          >
            <p>
              To avoid confusion, please only use and follow our active mirror at{' '}
              <span className="font-semibold text-zinc-50">zxcstream-mirror.vercel.app</span>
            </p>
            <p>
              Our player and embed endpoints provide fast, ad-free streaming with full TMDB catalog support
              and responsive custom controls.
            </p>
            <div className="space-y-1 rounded-md bg-zinc-800/60 p-3 text-xs text-zinc-200">
              <p>
                ✅ Official Mirror: <strong>zxcstream-mirror.vercel.app</strong>
              </p>
              <p>✅ Embeddable without ads on your own websites</p>
              <p>✅ Supports full movie & TV series TMDB catalog</p>
            </div>
            <p>Thank you for your support and understanding.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <button
            type="button"
            onClick={onDismiss}
            data-testid="announcement-got-it"
            className="w-full cursor-pointer rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
