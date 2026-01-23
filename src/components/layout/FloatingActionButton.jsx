import { FiPlus } from 'react-icons/fi';

export default function FloatingActionButton({ onClick, icon: Icon = FiPlus, label = 'Create' }) {
  return (
    <button
      onClick={onClick}
      className="fixed md:hidden z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 active:scale-95"
      style={{
        right: '16px',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--brand-primary)',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
      }}
      aria-label={label}
    >
      <Icon size={24} color="white" />
    </button>
  );
}
