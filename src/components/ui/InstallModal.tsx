import { Modal } from './Modal';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'idle' | 'installing' | 'success' | 'error';
  error?: string;
}

export function InstallModal({ isOpen, onClose, status, error }: InstallModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={status === 'installing' ? () => {} : onClose} title="Install MariaDB Bundle">
      <div className="p-4 space-y-4">
        {status === 'idle' && (
          <p className="text-zinc-300">
            Ready to install the bundled MariaDB server. This will copy the necessary files to your application data directory and configure the server.
          </p>
        )}

        {status === 'installing' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-white font-medium">Installing MariaDB...</p>
              <p className="text-sm text-zinc-400">Copying files, generating configuration, and initializing data.</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Installation Complete</p>
              <p className="text-sm text-zinc-400">MariaDB has been successfully installed and configured.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
            <p className="text-red-400 font-medium mb-1">Installation Failed</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          {status === 'success' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Done
            </button>
          ) : status === 'error' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
