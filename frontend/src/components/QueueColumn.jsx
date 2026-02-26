import PropTypes from 'prop-types';
import PatientCard from './PatientCard';

const colorConfig = {
  blue:   { bg: 'bg-slate-50',    header: 'bg-blue-600',    dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700'    },
  orange: { bg: 'bg-amber-50/50', header: 'bg-amber-500',   dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700'  },
  green:  { bg: 'bg-emerald-50/50',header:'bg-emerald-600', dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700'},
};

export default function QueueColumn({
  title, patients, color, icon, onPatientClick,
  status, onDragStart, onDragEnd, onDrop, onDragOver, draggedItem
}) {
  const cfg = colorConfig[color] || colorConfig.blue;

  return (
    <div
      className={`flex-1 min-w-[300px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, status)}
    >
      {/* Column Header */}
      <div className={`${cfg.header} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <h2 className="font-semibold text-white text-sm tracking-wide uppercase">{title}</h2>
        </div>
        <span className="min-w-[26px] h-[26px] flex items-center justify-center rounded-full bg-white/25 text-white text-xs font-bold px-1.5">
          {patients.length}
        </span>
      </div>

      {/* Body */}
      <div className={`flex-1 ${cfg.bg} p-3 space-y-2.5 overflow-y-auto`} style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mb-2 opacity-40">
              <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
            </svg>
            <p className="text-xs">No patients</p>
          </div>
        ) : (
          patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={() => onPatientClick?.(patient)}
              draggable
              onDragStart={() => onDragStart?.(patient)}
              onDragEnd={onDragEnd}
              isDragging={draggedItem?.id === patient.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

QueueColumn.propTypes = {
  title: PropTypes.string.isRequired,
  patients: PropTypes.arrayOf(PropTypes.object).isRequired,
  color: PropTypes.oneOf(['blue', 'orange', 'green']).isRequired,
  icon: PropTypes.node,
  onPatientClick: PropTypes.func,
  status: PropTypes.string,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  onDrop: PropTypes.func,
  onDragOver: PropTypes.func,
  draggedItem: PropTypes.object
};
