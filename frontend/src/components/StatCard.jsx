import PropTypes from 'prop-types';

const icons = {
  total: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  waiting: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  completed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  time: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 8 14"/>
    </svg>
  ),
};

const colorConfig = {
  blue:   { border: 'border-blue-500',   icon: 'bg-blue-100 text-blue-600',   val: 'text-blue-700'   },
  orange: { border: 'border-amber-500',  icon: 'bg-amber-100 text-amber-600',  val: 'text-amber-700'  },
  green:  { border: 'border-emerald-500',icon: 'bg-emerald-100 text-emerald-600',val:'text-emerald-700'},
  purple: { border: 'border-violet-500', icon: 'bg-violet-100 text-violet-600', val: 'text-violet-700' },
};

export default function StatCard({ icon, label, value, subtext, color = 'blue', iconType }) {
  const cfg = colorConfig[color];

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${cfg.border} p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${cfg.icon}`}>
        {iconType && icons[iconType] ? icons[iconType] : <span className="text-xl">{icon}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-3xl font-bold leading-none ${cfg.val}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node,
  iconType: PropTypes.string,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtext: PropTypes.string,
  color: PropTypes.oneOf(['blue', 'green', 'orange', 'purple'])
};
