import React from 'react';
import { X, Trash2, HardDrive, FileX } from 'lucide-react';
import { Track } from '../../types';

interface DeleteTrackModalProps {
  isOpen: boolean;
  track: Track | null;
  /** True when the file lives in Aura-managed storage (copied from the phone) */
  isManagedFile: boolean;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteTrackModal: React.FC<DeleteTrackModalProps> = ({
  isOpen,
  track,
  isManagedFile,
  isDeleting = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen || !track) return null;

  const fileName = track.filePath ? (track.filePath.split(/[\\/]/).pop() || track.filePath) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-dark-900 border border-dark-750 rounded-2xl shadow-2xl p-6 space-y-5 animate-aura-glow/10">
        <div className="flex items-center justify-between border-b border-dark-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Remove from Library</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-850 border border-dark-750">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{track.title}</p>
              <p className="text-[11px] text-dark-400 truncate">{track.artist}</p>
            </div>
          </div>

          <p className="text-xs text-dark-300 leading-relaxed">
            {isManagedFile ? (
              <span className="flex items-start gap-2">
                <HardDrive className="w-3.5 h-3.5 mt-0.5 text-aura-400 shrink-0" />
                <span>
                  This song was copied into Aura's storage. The local copy (
                  <span className="font-mono text-[11px] text-dark-200 break-all">{fileName}</span>
                  ) will be permanently deleted from your PC, along with its library entry and
                  cached artwork reference. You can copy it from your phone again at any time.
                </span>
              </span>
            ) : (
              <span className="flex items-start gap-2">
                <FileX className="w-3.5 h-3.5 mt-0.5 text-aura-400 shrink-0" />
                <span>
                  The file on disk stays untouched — it will only be removed from Aura's library
                  and can be re-imported later.
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-dark-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 text-white text-xs font-semibold shadow-glow transition-all"
          >
            {isDeleting ? 'Removing…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTrackModal;
