import PropTypes from 'prop-types';

const variantConfig = {
  primary: {
    wrapper: 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-200',
    icon: 'bg-white/20',
    desc: 'text-blue-100',
  },
  secondary: {
    wrapper: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-gray-100',
    icon: 'bg-gray-100',
    desc: 'text-gray-500',
  },
  success: {
    wrapper: 'bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-200',
    icon: 'bg-white/20',
    desc: 'text-emerald-100',
  },
};

export default function ActionButton({ icon, label, description, onClick, variant = 'primary', disabled = false }) {
  const cfg = variantConfig[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full rounded-xl px-5 py-4 flex items-center gap-4 text-left
        shadow-md transition-all duration-200 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${cfg.wrapper}
        ${!disabled ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}
      `}
    >
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${cfg.icon}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-base leading-tight">{label}</div>
        {description && <div className={`text-sm mt-0.5 truncate ${cfg.desc}`}>{description}</div>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className={`w-4 h-4 flex-shrink-0 opacity-60 ${variant === 'secondary' ? 'text-gray-400' : 'text-white'}`}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

ActionButton.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success']),
  disabled: PropTypes.bool
};
