import { useState, useEffect } from 'react';
import { getStatusConfig } from '../utils/brandingHelpers';
import StatusBadge from './StatusBadge';
import { FiX, FiCheck } from 'react-icons/fi';

const StatusSelector = ({ currentStatus, onStatusChange, showNotes = true }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notes, setNotes] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  const statuses = ['prospect', 'active', 'idle', 'paused', 'churned'];

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
  };

  const handleSave = () => {
    if (onStatusChange) {
      onStatusChange(selectedStatus, notes);
    }
    setIsOpen(false);
    setNotes('');
  };

  const handleCancel = () => {
    setSelectedStatus(currentStatus);
    setNotes('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition-colors w-full sm:w-auto justify-between sm:justify-start"
      >
        <StatusBadge status={currentStatus} />
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:bg-transparent"
            onClick={handleCancel}
          />

          <div className={`
            fixed md:absolute z-50 bg-zinc-900 border border-white/10 shadow-xl
            ${isMobile
              ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col'
              : 'top-full left-0 mt-2 w-80 rounded-lg'
            }
          `}>
            <div className={`
              flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0
              ${isMobile ? '' : 'hidden'}
            `}>
              <h3 className="text-base font-semibold text-white">Update Client Status</h3>
              <button
                onClick={handleCancel}
                className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className={`
              overflow-y-auto flex-1
              ${isMobile ? 'p-4' : 'p-4'}
            `}>
              <h3 className={`text-sm font-semibold text-white mb-3 ${isMobile ? 'hidden' : ''}`}>
                Update Client Status
              </h3>

              <div className="space-y-2 mb-4">
                {statuses.map((status) => {
                  const config = getStatusConfig(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusSelect(status)}
                      className={`w-full text-left p-3 md:p-3 rounded-lg transition-all ${
                        selectedStatus === status
                          ? 'bg-white/10 border border-teal-500/50'
                          : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <StatusBadge status={status} />
                        {selectedStatus === status && (
                          <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                            <FiCheck className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{config.description}</p>
                      <p className="text-xs text-gray-500">Action: {config.action}</p>
                    </button>
                  );
                })}
              </div>

              {showNotes && (
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about next actions or status context..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500 resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className={`
              flex gap-3 p-4 border-t border-white/10 flex-shrink-0
              ${isMobile ? 'safe-area-bottom' : ''}
            `}>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm transition-colors font-medium"
              >
                Update Status
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatusSelector;
