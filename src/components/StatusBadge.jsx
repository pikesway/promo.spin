import { getStatusConfig } from '../utils/brandingHelpers';
import { FaCircle, FaCheckCircle, FaClock, FaPause, FaTimesCircle, FaUser } from 'react-icons/fa';

const StatusBadge = ({ status, showAction = false, size = 'md' }) => {
  const config = getStatusConfig(status);

  const getIcon = () => {
    switch (status) {
      case 'prospect':
        return <FaUser className="w-3 h-3" />;
      case 'active':
        return <FaCheckCircle className="w-3 h-3" />;
      case 'idle':
        return <FaClock className="w-3 h-3" />;
      case 'paused':
        return <FaPause className="w-3 h-3" />;
      case 'churned':
        return <FaTimesCircle className="w-3 h-3" />;
      default:
        return <FaCircle className="w-3 h-3" />;
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className={`inline-flex items-center gap-2 rounded-full font-medium ${sizeClasses[size]}`}
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}40`
        }}
      >
        {getIcon()}
        <span>{config.label}</span>
      </div>
      {showAction && (
        <span className="text-xs text-gray-400 ml-1">
          {config.action}
        </span>
      )}
    </div>
  );
};

export default StatusBadge;
