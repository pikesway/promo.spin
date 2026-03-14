import { useState } from 'react';
import { getStatusConfig } from '../utils/brandingHelpers';
import StatusBadge from './StatusBadge';

const StatusSelector = ({ currentStatus, onStatusChange, showNotes = true }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notes, setNotes] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
      >
        <StatusBadge status={currentStatus} />
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Update Client Status</h3>

          <div className="space-y-2 mb-4">
            {statuses.map((status) => {
              const config = getStatusConfig(status);
              return (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedStatus === status
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge status={status} />
                    {selectedStatus === status && (
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
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
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Update Status
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleCancel}
        />
      )}
    </div>
  );
};

export default StatusSelector;
