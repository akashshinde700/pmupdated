import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';

const DATE_FILTERS = [
  { value: 'today',     label: 'Today'      },
  { value: 'yesterday', label: 'Yesterday'  },
  { value: 'weekly',    label: 'This Week'  },
  { value: 'monthly',   label: 'This Month' },
  { value: 'custom',    label: 'Custom'     },
];

// Circular progress ring
function RingProgress({ pct, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ABHADashboard() {
  const api      = useApiClient();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [abhaData, setAbhaData]               = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [dateFilter, setDateFilter]           = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  });
  const [hfrId, setHfrId]               = useState('');
  const [editingHfrId, setEditingHfrId] = useState(false);
  const [newHfrId, setNewHfrId]         = useState('');
  const [copied, setCopied]             = useState(false);
  const [refreshTs, setRefreshTs]       = useState(null);

  useEffect(() => { fetchABHAData(); }, [dateFilter, customDateRange]);

  const fetchABHAData = async () => {
    setLoading(true);
    try {
      const params = dateFilter === 'custom'
        ? { startDate: customDateRange.startDate, endDate: customDateRange.endDate }
        : { filter: dateFilter };
      const res = await api.get('/api/abha/dashboard', { params });
      setAbhaData({
        hfr_id:           res.data.hfr_id           || 'Not Set',
        total_patients:   res.data.total_patients   || 0,
        linked_patients:  res.data.linked_patients  || 0,
        consent_requests: res.data.consent_requests || 0,
        pending_uploads:  res.data.pending_uploads  || 0,
        last_updated:     res.data.last_updated     || new Date().toISOString(),
      });
      setHfrId(res.data.hfr_id || '');
      setRefreshTs(new Date());
    } catch {
      addToast('Failed to fetch ABHA data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHfrId = async () => {
    if (!newHfrId.trim()) { addToast('Please enter HFR ID', 'warning'); return; }
    try {
      await api.patch('/api/abha/hfr-id', { hfr_id: newHfrId });
      setHfrId(newHfrId);
      setEditingHfrId(false);
      setNewHfrId('');
      addToast('HFR ID updated successfully', 'success');
      fetchABHAData();
    } catch {
      addToast('Failed to update HFR ID', 'error');
    }
  };

  const handleCopyHfrId = () => {
    if (!hfrId) return;
    navigator.clipboard.writeText(hfrId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('HFR ID copied', 'success');
  };

  const handleExportData = () => {
    const content = `ABHA Dashboard Report\nGenerated: ${new Date().toLocaleString('en-IN')}\n\nHFR ID: ${hfrId}\nTotal Patients: ${abhaData?.total_patients || 0}\nLinked Patients: ${abhaData?.linked_patients || 0}\nConsent Requests: ${abhaData?.consent_requests || 0}\nPending Uploads: ${abhaData?.pending_uploads || 0}\nLinking Rate: ${linkingRate}%`;
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    a.download = `abha_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    addToast('Report exported', 'success');
  };

  const linkingRate = abhaData?.total_patients > 0
    ? parseFloat(((abhaData.linked_patients / abhaData.total_patients) * 100).toFixed(1))
    : 0;

  const unlinked = abhaData ? abhaData.total_patients - abhaData.linked_patients : 0;

  const metrics = abhaData ? [
    {
      label: 'Total Patients',
      value: abhaData.total_patients,
      color: 'blue',
      accent: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
    },
    {
      label: 'Linked Patients',
      value: abhaData.linked_patients,
      sub: `${linkingRate}% linked`,
      color: 'emerald',
      accent: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
      ),
    },
    {
      label: 'Consent Requests',
      value: abhaData.consent_requests,
      color: 'amber',
      accent: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
    },
    {
      label: 'Pending Uploads',
      value: abhaData.pending_uploads,
      color: 'red',
      accent: 'from-red-500 to-rose-500',
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-100',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
        </svg>
      ),
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero Banner ── */}
      <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 pt-8 pb-24 overflow-hidden">
        {/* background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative max-w-5xl mx-auto">
          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-blue-200 hover:text-white text-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchABHAData}
                disabled={loading}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60 border border-white/20"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
                Refresh
              </button>
              <button
                onClick={handleExportData}
                disabled={!abhaData}
                className="flex items-center gap-2 bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-6 h-6">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">ABHA Dashboard</h1>
              <p className="text-blue-200 text-sm mt-0.5">Ayushman Bharat Health Account — Linking & Analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content pulled up over banner ── */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 pb-10 space-y-5">

        {/* ── HFR ID Card — floated up into banner ── */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" className="w-4 h-4">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 text-sm">ABHA HFR ID</h2>
                <p className="text-xs text-gray-400">Health Facility Registry Identifier</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingHfrId(!editingHfrId); setNewHfrId(hfrId); }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              {editingHfrId ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </>
              )}
            </button>
          </div>

          {editingHfrId ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newHfrId}
                onChange={(e) => setNewHfrId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateHfrId()}
                placeholder="Enter new HFR ID"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                autoFocus
              />
              <button
                onClick={handleUpdateHfrId}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-500 font-medium">Registered HFR ID</p>
                <p className="text-lg font-mono font-bold text-gray-800 truncate">{hfrId || '— Not Set —'}</p>
              </div>
              <button
                onClick={handleCopyHfrId}
                disabled={!hfrId}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-40 ${
                  copied
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Date Filter ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Filter Period</p>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  dateFilter === f.value
                    ? 'bg-blue-600 text-white shadow-sm scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400 font-medium">Loading ABHA data…</p>
          </div>
        )}

        {!loading && abhaData && (
          <>
            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map(({ label, value, sub, bg, text, border, accent, icon }) => (
                <div key={label} className={`bg-white rounded-2xl shadow-sm border ${border} p-4 relative overflow-hidden`}>
                  {/* top accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent} rounded-t-2xl`} />
                  <div className={`w-10 h-10 rounded-xl ${bg} ${text} flex items-center justify-center mb-3`}>
                    {icon}
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-tight">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${text}`}>{value.toLocaleString()}</p>
                  {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            {/* ── Linking Progress + Ring ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-6">
                {/* Ring */}
                <div className="relative flex-shrink-0">
                  <RingProgress pct={linkingRate} size={110} stroke={10} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-800">{linkingRate}%</span>
                    <span className="text-xs text-gray-400">linked</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm mb-4">ABHA Linking Progress</h3>

                  {/* Linked */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Linked</span>
                      <span className="font-semibold text-emerald-600">{abhaData.linked_patients.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                        style={{ width: `${linkingRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Unlinked */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Unlinked</span>
                      <span className="font-semibold text-red-500">{unlinked.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-400 to-rose-400 rounded-full transition-all duration-700"
                        style={{ width: `${100 - linkingRate}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-3">
                    {abhaData.linked_patients} of {abhaData.total_patients} patients linked to ABHA
                  </p>
                </div>
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: 'Link Patients',
                    desc: 'Connect ABHA accounts',
                    color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'Sync Records',
                    desc: 'Upload health records',
                    color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'View Consents',
                    desc: `${abhaData.consent_requests} pending`,
                    color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                      </svg>
                    ),
                  },
                ].map(({ label, desc, color, bg, icon }) => (
                  <button
                    key={label}
                    className={`flex items-center gap-3 p-3.5 rounded-xl ${bg} transition-colors text-left`}
                  >
                    <div className={`flex-shrink-0 ${color}`}>{icon}</div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${color}`}>{label}</p>
                      <p className="text-xs text-gray-400 truncate">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Status Summary ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-4">Account Status Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Active ABHA Accounts', value: abhaData.linked_patients, total: abhaData.total_patients, color: 'bg-emerald-500' },
                  { label: 'Pending Consent Requests', value: abhaData.consent_requests, total: Math.max(abhaData.consent_requests, 1), color: 'bg-amber-400' },
                  { label: 'Pending Record Uploads', value: abhaData.pending_uploads, total: Math.max(abhaData.pending_uploads, 1), color: 'bg-red-400' },
                ].map(({ label, value, total, color }) => {
                  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>{label}</span>
                        <span className="font-semibold text-gray-700">{value.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Last Updated ── */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Last updated: {refreshTs ? refreshTs.toLocaleString('en-IN') : '—'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
