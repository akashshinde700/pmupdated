import PropTypes from 'prop-types';
import VIPBadge from './VIPBadge';
import VitalBadge from './VitalBadge';

export default function PatientCard({ patient, onClick, isDragging = false }) {
  const { name, age, gender, token_number, is_vip, vip_tier, waiting_time, chief_complaint, vitals } = patient;

  const waitColor = (m) => m < 15 ? 'text-emerald-600' : m < 30 ? 'text-amber-600' : 'text-red-600';
  const waitBg   = (m) => m < 15 ? 'bg-emerald-50' : m < 30 ? 'bg-amber-50' : 'bg-red-50';

  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-150 shadow-sm p-3.5
        hover:border-blue-300 hover:shadow-md cursor-pointer
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-40 scale-95 rotate-1' : ''}
        ${is_vip ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                #{token_number}
              </span>
              {is_vip && <VIPBadge tier={vip_tier} />}
            </div>
            {waiting_time !== undefined && (
              <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${waitColor(waiting_time)} ${waitBg(waiting_time)}`}>
                {waiting_time}m
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm text-gray-900 truncate">{name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {age ? `${age}y` : ''}
            {age && gender ? ' · ' : ''}
            {gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : gender || ''}
          </p>
        </div>
      </div>

      {/* Chief Complaint */}
      {chief_complaint && (
        <div className="mt-2.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
          <p className="text-xs text-gray-600 line-clamp-2">
            <span className="font-semibold text-gray-700">CC: </span>{chief_complaint}
          </p>
        </div>
      )}

      {/* Vitals */}
      {vitals && (vitals.bp || vitals.temp || vitals.spo2) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {vitals.bp && <VitalBadge icon="💓" label="BP" value={vitals.bp} unit="mmHg" alert={vitals.bp_alert} />}
          {vitals.temp && <VitalBadge icon="🌡️" label="T" value={vitals.temp} unit="°F" alert={vitals.temp_alert} />}
          {vitals.spo2 && <VitalBadge icon="🫁" label="SpO2" value={vitals.spo2} unit="%" alert={vitals.spo2_alert} />}
        </div>
      )}
    </div>
  );
}

PatientCard.propTypes = {
  patient: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    age: PropTypes.number,
    gender: PropTypes.string,
    token_number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    is_vip: PropTypes.bool,
    vip_tier: PropTypes.string,
    waiting_time: PropTypes.number,
    chief_complaint: PropTypes.string,
    vitals: PropTypes.shape({
      bp: PropTypes.string, bp_alert: PropTypes.bool,
      temp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), temp_alert: PropTypes.bool,
      spo2: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), spo2_alert: PropTypes.bool,
    })
  }).isRequired,
  onClick: PropTypes.func,
  isDragging: PropTypes.bool
};
