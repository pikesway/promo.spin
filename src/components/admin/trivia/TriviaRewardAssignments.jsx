import React, { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiGift, FiFilter } from 'react-icons/fi';
import { usePlatform } from '../../../context/PlatformContext';
import { useRedemption } from '../../../context/RedemptionContext';
import GlassCard from '../../common/GlassCard';

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  issued: 'bg-green-500/20 text-green-400 border-green-500/30',
  fulfilled: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

const TriviaRewardAssignments = ({ campaignId, instances }) => {
  const { getTriviaRewardAssignments, markRewardIssued, markRewardsIssuedBulk, issuePlatformReward } = usePlatform();
  const { generateRedemption } = useRedemption();

  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterScope, setFilterScope] = useState('all');
  const [filterInstance, setFilterInstance] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isProcessing, setIsProcessing] = useState(null);
  const [toast, setToast] = useState(null);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    const { data } = await getTriviaRewardAssignments(campaignId);
    setAssignments(data || []);
    setIsLoading(false);
  }, [campaignId, getTriviaRewardAssignments]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const filteredAssignments = assignments.filter(a => {
    if (filterScope !== 'all' && a.trivia_rewards?.scope !== filterScope) return false;
    if (filterInstance !== 'all' && a.instance_id !== filterInstance) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAssignments.filter(a => a.status === 'pending').length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAssignments.filter(a => a.status === 'pending').map(a => a.id));
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMarkIssued = async (assignmentId) => {
    setIsProcessing(assignmentId);
    try {
      await markRewardIssued(assignmentId);
      setToast({ type: 'success', text: 'Reward marked as issued' });
      loadAssignments();
    } catch (error) {
      setToast({ type: 'error', text: 'Failed to mark as issued' });
    }
    setIsProcessing(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleBulkMarkIssued = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing('bulk');
    try {
      await markRewardsIssuedBulk(selectedIds);
      setToast({ type: 'success', text: `${selectedIds.length} rewards marked as issued` });
      setSelectedIds([]);
      loadAssignments();
    } catch (error) {
      setToast({ type: 'error', text: 'Failed to mark rewards as issued' });
    }
    setIsProcessing(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleIssuePlatform = async (assignment) => {
    setIsProcessing(assignment.id);
    try {
      const leadData = assignment.leads?.data || {};
      const prize = {
        name: assignment.trivia_rewards?.reward_name || 'Trivia Reward',
        value: assignment.trivia_rewards?.reward_value
      };

      const redemption = await generateRedemption(campaignId, prize, {}, leadData);
      if (redemption?.id) {
        await issuePlatformReward(assignment.id, redemption.id);
        setToast({ type: 'success', text: 'Redemption created and linked' });
        loadAssignments();
      }
    } catch (error) {
      setToast({ type: 'error', text: 'Failed to create redemption' });
    }
    setIsProcessing(null);
    setTimeout(() => setToast(null), 3000);
  };

  const getLeadDisplay = (assignment) => {
    const data = assignment.leads?.data || {};
    return data.email || data.name || data.firstName || 'Unknown';
  };

  const pendingCount = filteredAssignments.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.text}
        </div>
      )}

      <GlassCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Reward Assignments</h2>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select text-sm"
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value)}
            >
              <option value="all">All Scopes</option>
              <option value="campaign">Campaign</option>
              <option value="instance">Instance</option>
            </select>

            <select
              className="select text-sm"
              value={filterInstance}
              onChange={(e) => setFilterInstance(e.target.value)}
            >
              <option value="all">All Instances</option>
              {instances.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>

            <select
              className="select text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="issued">Issued</option>
              <option value="fulfilled">Fulfilled</option>
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
            <span className="text-sm">{selectedIds.length} selected</span>
            <button
              onClick={handleBulkMarkIssued}
              disabled={isProcessing === 'bulk'}
              className="btn btn-sm bg-teal-600 hover:bg-teal-500 text-white"
            >
              {isProcessing === 'bulk' ? 'Processing...' : 'Mark All Issued'}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="btn btn-sm btn-secondary"
            >
              Clear
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading assignments...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No reward assignments found</p>
            <p className="text-xs text-gray-600">Finalize instances or campaigns to assign rewards</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400">
                  <th className="p-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === pendingCount && pendingCount > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-600"
                    />
                  </th>
                  <th className="p-2">Rank</th>
                  <th className="p-2">Player</th>
                  <th className="p-2">Reward</th>
                  <th className="p-2">Scope</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(assignment => {
                  const isPending = assignment.status === 'pending';
                  const isPlatform = assignment.trivia_rewards?.fulfillment_method === 'platform';

                  return (
                    <tr key={assignment.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-2">
                        {isPending && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(assignment.id)}
                            onChange={() => handleSelect(assignment.id)}
                            className="rounded border-gray-600"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        <span className="font-medium text-teal-400">#{assignment.rank_achieved}</span>
                      </td>
                      <td className="p-2">
                        <span className="truncate max-w-[150px] block">{getLeadDisplay(assignment)}</span>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">{assignment.trivia_rewards?.reward_name}</span>
                      </td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                          assignment.trivia_rewards?.scope === 'campaign'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {assignment.trivia_rewards?.scope}
                        </span>
                      </td>
                      <td className="p-2 text-gray-400">
                        {Number(assignment.score_achieved).toLocaleString()}
                      </td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[assignment.status]}`}>
                          {assignment.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {isPending && (
                          <div className="flex items-center gap-1">
                            {isPlatform ? (
                              <button
                                onClick={() => handleIssuePlatform(assignment)}
                                disabled={isProcessing === assignment.id}
                                className="btn btn-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
                                title="Create redemption code"
                              >
                                <FiGift className="w-3 h-3" />
                                {isProcessing === assignment.id ? '...' : 'Issue'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkIssued(assignment.id)}
                                disabled={isProcessing === assignment.id}
                                className="btn btn-xs bg-green-600 hover:bg-green-500 text-white flex items-center gap-1"
                                title="Mark as issued"
                              >
                                <FiCheck className="w-3 h-3" />
                                {isProcessing === assignment.id ? '...' : 'Issued'}
                              </button>
                            )}
                          </div>
                        )}
                        {assignment.status === 'issued' && assignment.redemption_id && (
                          <span className="text-xs text-gray-500">Has redemption</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default TriviaRewardAssignments;
