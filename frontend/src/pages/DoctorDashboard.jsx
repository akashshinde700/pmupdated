import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import StatCard from '../components/StatCard';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState({ waiting: [], in_progress: [], completed: [] });
  const [stats, setStats] = useState({ today_total: 0, waiting: 0, completed: 0, avg_wait_time: 0 });

  const mapStatus = (s) => {
    if (!s) return 'waiting';
    if (s === 'completed') return 'completed';
    if (s === 'in-progress' || s === 'in_progress') return 'in_progress';
    return 'waiting'; // scheduled, checked-in, etc.
  };

  const fetchQueue = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/api/appointments?date=${today}&limit=100`);
      // sendSuccess wraps in { success: true, data: { appointments: [...] } }
      const payload = response.data?.data || response.data;
      const appts = payload?.appointments || (Array.isArray(payload) ? payload : []);

      const mapped = appts.map((a, idx) => ({
        id: a.id,
        patient_id: a.patient_id,
        token_number: a.appointment_time ? a.appointment_time.slice(0, 5) : `${idx + 1}`,
        status: mapStatus(a.status),
        name: a.patient_name || '—',
        age: a.patient_age,
        gender: a.patient_gender,
        phone: a.contact,
        chief_complaint: a.reason_for_visit,
        appointment_time: a.appointment_time,
        waiting_time: a.checked_in_at
          ? Math.max(0, Math.round((Date.now() - new Date(a.checked_in_at).getTime()) / 60000))
          : undefined,
      }));

      const organized = {
        waiting:     mapped.filter(p => p.status === 'waiting'),
        in_progress: mapped.filter(p => p.status === 'in_progress'),
        completed:   mapped.filter(p => p.status === 'completed'),
      };
      setQueue(organized);
      setStats({
        today_total:   mapped.length,
        waiting:       organized.waiting.length + organized.in_progress.length,
        completed:     organized.completed.length,
        avg_wait_time: 0,
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      if (typeof showToast === 'function') showToast('Failed to load dashboard data', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const handlePatientClick = (patient) => navigate(`/patient-overview/${patient.patient_id}`);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () =>
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // All today's patients = waiting + in_progress + completed for display
  const allWaiting = [...queue.in_progress, ...queue.waiting];

  return (
    <>
      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-0.5">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Dr. {user?.name || 'Doctor'}
            </h1>
            <p className="text-blue-300 text-xs mt-1">{formatDate()}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchQueue}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 min-h-screen px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Stats ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard iconType="total"     label="Total Today"  value={stats.today_total}  color="blue"   />
            <StatCard iconType="waiting"   label="Pending"      value={stats.waiting}       color="orange" />
            <StatCard iconType="completed" label="Completed"    value={stats.completed}      color="green"  />
            <StatCard iconType="time"      label="In Progress"  value={queue.in_progress.length} color="purple" />
          </div>

          {/* ── Queue Board ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Today's Appointments</h2>
              <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ── WAITING / IN-PROGRESS ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Pending / In Progress</p>
                      <p className="text-xs text-gray-400">Scheduled for today</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{allWaiting.length}</span>
                </div>
                {/* cards */}
                <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '420px' }}>
                  {allWaiting.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-gray-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <p className="text-sm">No pending appointments</p>
                    </div>
                  ) : allWaiting.map((p, idx) => {
                    const initials = p.name ? p.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';
                    const isInProgress = p.status === 'in_progress';
                    const waitColor = p.waiting_time === undefined ? '' :
                      p.waiting_time < 15 ? 'text-emerald-600 bg-emerald-50' :
                      p.waiting_time < 30 ? 'text-amber-600 bg-amber-50' :
                      'text-red-600 bg-red-50';
                    return (
                      <div key={p.id} onClick={() => handlePatientClick(p)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 group ${
                          isInProgress
                            ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-sm'
                            : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm'
                        }`}>
                        {/* rank */}
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                          isInProgress ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {idx + 1}
                        </div>
                        {/* avatar */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm bg-gradient-to-br ${
                          isInProgress ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-600'
                        }`}>
                          {initials}
                        </div>
                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                              isInProgress ? 'text-amber-700 bg-amber-100' : 'text-blue-600 bg-blue-100'
                            }`}>{p.token_number}</span>
                            <span className="font-semibold text-gray-900 text-sm truncate">{p.name}</span>
                            {isInProgress && (
                              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">Active</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {p.age ? `${p.age}y` : ''}{p.age && p.gender ? ' · ' : ''}{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender || ''}
                            {p.chief_complaint ? ` · ${p.chief_complaint}` : ''}
                          </p>
                        </div>
                        {/* wait badge */}
                        {p.waiting_time !== undefined && waitColor && (
                          <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${waitColor}`}>
                            {p.waiting_time}m
                          </span>
                        )}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 group-hover:text-blue-400 transition-colors">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── COMPLETED ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-50 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Completed</p>
                      <p className="text-xs text-gray-400">Seen today</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">{queue.completed.length}</span>
                </div>
                {/* compact list */}
                <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: '420px' }}>
                  {queue.completed.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-gray-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <p className="text-sm">No completed appointments</p>
                    </div>
                  ) : queue.completed.map((p) => {
                    const initials = p.name ? p.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';
                    return (
                      <div key={p.id} onClick={() => handlePatientClick(p)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/40 cursor-pointer transition-colors group">
                        {/* check */}
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" className="w-3.5 h-3.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        {/* avatar */}
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-semibold">
                          {initials}
                        </div>
                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{p.token_number}</span>
                            <span className="font-medium text-gray-800 text-sm truncate">{p.name}</span>
                          </div>
                          {p.chief_complaint && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{p.chief_complaint}</p>
                          )}
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-200 flex-shrink-0 group-hover:text-emerald-400 transition-colors">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </>
  );
}
