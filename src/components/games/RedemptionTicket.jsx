import React, { useState } from 'react';
import { FiCheck, FiX, FiClock } from 'react-icons/fi';
import QRCode from 'qrcode.react';
import { usePlatform } from '../../context/PlatformContext';

export default function RedemptionTicket({ prize, redemption, campaign, client, brandColors }) {
  const { redeemCode } = usePlatform();
  const [localStatus, setLocalStatus] = useState(redemption.status);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const primaryColor = brandColors?.primary || '#6366F1';
  const secondaryColor = brandColors?.secondary || '#8B5CF6';

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'var(--status-valid)';
      case 'redeemed':
        return 'var(--status-redeemed)';
      case 'expired':
        return 'var(--status-expired)';
      default:
        return 'var(--gray-500)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <FiCheck size={20} />;
      case 'redeemed':
        return <FiX size={20} />;
      case 'expired':
        return <FiClock size={20} />;
      default:
        return null;
    }
  };

  const handleRedeem = async () => {
    if (localStatus !== 'valid') return;
    if (!confirm('Are you sure you want to redeem this prize now?')) return;

    setIsRedeeming(true);
    try {
      await redeemCode(redemption.id, 'self-redemption');
      setLocalStatus('redeemed');
      alert('Prize redeemed successfully!');
    } catch (error) {
      console.error('Error redeeming:', error);
      alert('Failed to redeem. Please show this code to staff.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="glass-card fade-in" style={{
      padding: 'var(--space-6)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ fontSize: '80px', marginBottom: 'var(--space-2)' }}>🎉</div>
        <h2 style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-bold)',
          marginBottom: 'var(--space-2)',
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Congratulations!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>
          You won: <strong style={{ color: 'var(--text-primary)' }}>{prize.text}</strong>
        </p>
      </div>

      <div style={{
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Redemption Code</span>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: getStatusColor(localStatus),
            color: 'white',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            textTransform: 'uppercase'
          }}>
            {getStatusIcon(localStatus)}
            {localStatus}
          </div>
        </div>

        <div style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 'var(--font-bold)',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em',
          padding: 'var(--space-3)',
          background: localStatus === 'valid' ? 'rgba(16, 185, 129, 0.1)' :
                     localStatus === 'redeemed' ? 'rgba(239, 68, 68, 0.1)' :
                     'rgba(113, 113, 122, 0.1)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-3)',
          color: getStatusColor(localStatus)
        }}>
          {redemption.short_code}
        </div>

        <div style={{
          background: 'white',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          display: 'inline-block',
          width: '100%',
          textAlign: 'center',
          border: `3px solid ${primaryColor}20`
        }}>
          <QRCode
            value={redemption.short_code}
            size={150}
            fgColor={primaryColor}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>

      {client && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
            Provided by
          </p>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
            {client.name}
          </p>
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>
          How to Redeem
        </h3>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-sm)'
        }}>
          <li style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 'var(--font-bold)' }}>1.</span>
            <span>Show this QR code or redemption code to a staff member</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 'var(--font-bold)' }}>2.</span>
            <span>They will scan or enter the code to verify</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 'var(--font-bold)' }}>3.</span>
            <span>Enjoy your prize!</span>
          </li>
        </ul>
      </div>

      {localStatus === 'valid' && (
        <button
          className="btn btn-success btn-lg w-full"
          onClick={handleRedeem}
          disabled={isRedeeming}
        >
          {isRedeeming ? 'Redeeming...' : 'Redeem Now'}
        </button>
      )}

      {localStatus === 'redeemed' && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'var(--error-bg)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          color: 'var(--error)'
        }}>
          <strong>This code has been redeemed and cannot be used again.</strong>
        </div>
      )}

      <p style={{
        marginTop: 'var(--space-4)',
        textAlign: 'center',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-tertiary)'
      }}>
        Generated: {new Date(redemption.generated_at).toLocaleString()}
      </p>
    </div>
  );
}