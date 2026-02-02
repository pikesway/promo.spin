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
        className="flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors w-full sm:w-auto justify-between sm:justify-start"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
      >
        <StatusBadge status={currentStatus} />
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
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

          <div
            className={`
              fixed md:absolute z-50 shadow-xl
              ${isMobile
                ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col'
                : 'top-full left-0 mt-2 w-80 rounded-lg'
              }
            `}
            style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)' }}
          >
            <div
              className={`flex items-center justify-between p-4 flex-shrink-0 ${isMobile ? '' : 'hidden'}`}
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Update Client Status</h3>
              <button
                onClick={handleCancel}
                className="p-2 -mr-2 rounded-full transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <h3
                className={`text-sm font-semibold mb-3 ${isMobile ? 'hidden' : ''}`}
                style={{ color: 'var(--text-primary)' }}
              >
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
                      className="w-full text-left p-3 md:p-3 rounded-lg transition-all"
                      style={{
                        background: selectedStatus === status ? 'var(--btn-ghost-hover)' : 'var(--bg-tertiary)',
                        border: selectedStatus === status ? '1px solid var(--brand-primary)' : '1px solid transparent'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <StatusBadge status={status} />
                        {selectedStatus === status && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-primary)' }}>
                            <FiCheck className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{config.description}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Action: {config.action}</p>
                    </button>
                  );
                })}
              </div>

              {showNotes && (
                <div className="mb-4">
                  <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about next actions or status context..."
                    className="input w-full text-sm resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div
              className={`flex gap-3 p-4 flex-shrink-0 ${isMobile ? 'safe-area-bottom' : ''}`}
              style={{ borderTop: '1px solid var(--border-color)' }}
            >
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary flex-1 text-sm"
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
