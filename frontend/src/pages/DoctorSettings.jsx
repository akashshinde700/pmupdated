import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useApiClient } from '../api/client';
import UserManagement from './UserManagement';
import SymptomsTemplates from './SymptomsTemplates';
import DiagnosisTemplates from './DiagnosisTemplates';
import MedicationsTemplates from './MedicationsTemplates';
import PrescriptionTemplates from './PrescriptionTemplates';

const DoctorSettings = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const api = useApiClient();

  const [activeTab, setActiveTab] = useState('availability');
  const [timeSlots, setTimeSlots] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [showAddSlot, setShowAddSlot] = useState(false);

  const doctorId = user?.doctor_id || 1; // Fallback to 1 for Dr. Gopal Jaju

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch time slots
      const slotsRes = await api.get(`/api/doctor-availability/${doctorId}/slots`);
      setTimeSlots(slotsRes.data.slots || []);

      // Fetch availability
      const availRes = await api.get(`/api/doctor-availability/${doctorId}/availability`);
      setAvailability(availRes.data.availability || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = async (dayOfWeek) => {
    const updatedAvailability = availability.map(day =>
      day.day_of_week === dayOfWeek
        ? { ...day, is_available: !day.is_available }
        : day
    );
    setAvailability(updatedAvailability);
  };

  const handleAddTimeSlot = async () => {
    if (!newSlotTime) {
      addToast('Please enter a time', 'error');
      return;
    }

    try {
      // Backend Joi schema expects `HH:MM` (no seconds). `input[type=time]` returns "HH:MM".
      await api.post(`/api/doctor-availability/${doctorId}/slots`, {
        slot_time: newSlotTime
      });

      addToast('Time slot added successfully', 'success');
      setNewSlotTime('');
      setShowAddSlot(false);
      fetchSettings();
    } catch (error) {
      console.error('Error adding time slot:', error);
      addToast(error.response?.data?.error || 'Failed to add time slot', 'error');
    }
  };

  const handleDeleteTimeSlot = async (slotId) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;

    try {
      await api.delete(`/api/doctor-availability/${doctorId}/slots/${slotId}`);
      addToast('Time slot deleted successfully', 'success');
      fetchSettings();
    } catch (error) {
      console.error('Error deleting time slot:', error);
      addToast('Failed to delete time slot', 'error');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save availability
      await api.put(`/api/doctor-availability/${doctorId}/availability`, {
        availability: availability.map(day => ({
          day_of_week: day.day_of_week,
          is_available: day.is_available
        }))
      });

      addToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'availability', label: 'Availability', icon: '📅' },
    { id: 'timeslots', label: 'Time Slots', icon: '⏰' },
    { id: 'staff', label: 'Staff', icon: '👥' },
    { id: 'symptoms', label: 'Symptoms', icon: '🤒' },
    { id: 'diagnosis', label: 'Diagnosis', icon: '🔬' },
    { id: 'medications', label: 'Medications', icon: '💊' },
    { id: 'rx-templates', label: 'Rx Templates', icon: '📋' },
    { id: 'landing-page', label: 'Landing Page', icon: '🌐' },
    { id: 'referrals', label: 'Referrals', icon: '🔗' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5 shadow">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">⚙️</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Doctor Settings</h1>
            <p className="text-blue-100 text-sm mt-0.5">Dr. {user?.name || 'Doctor'} · Configure availability, templates & referrals</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tab Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          <nav className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

      {/* Availability Tab Content */}
      {activeTab === 'availability' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">📅</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Working Days</h2>
              <p className="text-sm text-gray-500">Select days when you are available for appointments</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {availability.map(day => (
              <button
                key={day.day_of_week}
                onClick={() => handleToggleDay(day.day_of_week)}
                className={`relative py-4 px-2 rounded-xl font-medium transition-all text-center border-2 ${
                  day.is_available
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-400'
                }`}
              >
                <div className="text-sm font-semibold">{day.day_name?.slice(0, 3)}</div>
                <div className={`text-xs mt-1 ${day.is_available ? 'text-blue-100' : 'text-gray-300'}`}>
                  {day.is_available ? '✓ Open' : 'Closed'}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
            >
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Saving...</> : '✓ Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Time Slots Tab Content */}
      {activeTab === 'timeslots' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-xl">⏰</div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Time Slots</h2>
                <p className="text-sm text-gray-500">{timeSlots.length} slot{timeSlots.length !== 1 ? 's' : ''} configured</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddSlot(!showAddSlot)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${showAddSlot ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
            >
              {showAddSlot ? '✕ Cancel' : '+ Add Slot'}
            </button>
          </div>

          {showAddSlot && (
            <div className="mb-5 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">New Time Slot</label>
                <input type="time" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white text-sm" />
              </div>
              <button onClick={handleAddTimeSlot}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium shadow-sm">
                + Add
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {timeSlots.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">⏰</div>
                <p className="text-sm">No time slots yet. Click "+ Add Slot" to create one.</p>
              </div>
            ) : (
              timeSlots.map(slot => (
                <div key={slot.id} className="group relative bg-gray-50 border border-gray-200 rounded-xl p-3 text-center hover:border-blue-300 hover:bg-blue-50 transition">
                  <div className="text-sm font-semibold text-gray-800">{slot.display_time}</div>
                  <div className={`text-xs mt-0.5 ${slot.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                    {slot.is_active ? '● Active' : '○ Off'}
                  </div>
                  <button onClick={() => handleDeleteTimeSlot(slot.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow">✕</button>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex gap-2 items-start">
            <span className="text-base">ℹ️</span>
            <span>Time slot changes reflect on the booking page immediately. Deleting a slot does not affect existing appointments.</span>
          </div>
        </div>
      )}

      {/* Staff Management Tab Content */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-lg shadow p-6">
          <UserManagement showStaffOnly={true} />
        </div>
      )}

      {/* Symptoms Templates Tab Content */}
      {activeTab === 'symptoms' && (
        <div className="bg-white rounded-lg shadow p-6">
          <SymptomsTemplates />
        </div>
      )}

      {/* Diagnosis Templates Tab Content */}
      {activeTab === 'diagnosis' && (
        <div className="bg-white rounded-lg shadow p-6">
          <DiagnosisTemplates />
        </div>
      )}

      {/* Medications Templates Tab Content */}
      {activeTab === 'medications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <MedicationsTemplates />
        </div>
      )}

      {/* Prescription Templates Tab Content */}
      {activeTab === 'rx-templates' && (
        <div className="bg-white rounded-lg shadow p-6">
          <PrescriptionTemplates />
        </div>
      )}

      {/* Landing Page Tab Content */}
      {activeTab === 'landing-page' && (
        <LandingPageSettings doctorId={doctorId} api={api} addToast={addToast} />
      )}

      {activeTab === 'referrals' && (
        <ReferralsSettings api={api} addToast={addToast} user={user} />
      )}
      </div>
    </div>
  );
};

// Landing Page Settings Sub-component
const LandingPageSettings = ({ doctorId, api, addToast }) => {
  const [affiliations, setAffiliations] = useState([]);
  const [newAffName, setNewAffName] = useState('');
  const [newAffLocation, setNewAffLocation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffiliations();
  }, []);

  const fetchAffiliations = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/doctors/${doctorId}/affiliations`);
      setAffiliations(res.data.affiliations || []);
    } catch (error) {
      addToast('Failed to load affiliations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAffiliation = async () => {
    if (!newAffName.trim()) {
      addToast('Hospital name is required', 'error');
      return;
    }
    try {
      const res = await api.post(`/api/doctors/${doctorId}/affiliations`, {
        name: newAffName.trim(),
        location: newAffLocation.trim()
      });
      setAffiliations(prev => [...prev, { id: res.data.id, name: newAffName.trim(), location: newAffLocation.trim() }]);
      setNewAffName('');
      setNewAffLocation('');
      addToast('Affiliation added', 'success');
    } catch (error) {
      addToast('Failed to add affiliation', 'error');
    }
  };

  const handleDeleteAffiliation = async (id) => {
    try {
      await api.delete(`/api/doctors/${doctorId}/affiliations/${id}`);
      setAffiliations(prev => prev.filter(a => a.id !== id));
      addToast('Affiliation removed', 'success');
    } catch (error) {
      addToast('Failed to remove affiliation', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hospital Affiliations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hospital Affiliations</h3>
        <p className="text-sm text-gray-500 mb-4">Manage hospitals shown on your landing page</p>

        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Existing affiliations list */}
            <div className="space-y-2 mb-4">
              {affiliations.length === 0 && (
                <p className="text-gray-400 text-sm">No affiliations added yet</p>
              )}
              {affiliations.map((aff) => (
                <div key={aff.id} className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-3">
                  <div>
                    <span className="font-medium text-gray-800">{aff.name}</span>
                    {aff.location && <span className="text-gray-500 ml-2 text-sm">- {aff.location}</span>}
                  </div>
                  <button
                    onClick={() => handleDeleteAffiliation(aff.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition"
                    title="Remove"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add new affiliation */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Affiliation</h4>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Hospital Name"
                  value={newAffName}
                  onChange={(e) => setNewAffName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddAffiliation(); }}
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={newAffLocation}
                  onChange={(e) => setNewAffLocation(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddAffiliation(); }}
                />
                <button
                  onClick={handleAddAffiliation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Referrals Settings Sub-component
const ReferralsSettings = ({ api, addToast, user }) => {
  const [referrals, setReferrals] = useState([]);
  const [network, setNetwork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('referrals');
  const [newDoc, setNewDoc] = useState({ network_doctor_name: '', network_doctor_phone: '', specialization: '', hospital_name: '' });
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingRef, setEditingRef] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [refRes, netRes] = await Promise.all([
        api.get('/api/patient-referrals'),
        api.get('/api/patient-referrals/network/doctors')
      ]);
      setReferrals(refRes.data?.referrals || refRes.data?.data?.referrals || refRes.data?.data || []);
      setNetwork(netRes.data?.network || netRes.data?.doctors || netRes.data?.data?.network || netRes.data?.data || []);
    } catch (e) {
      console.error('Referrals fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const shareOnWhatsApp = async (ref) => {
    const baseUrl = 'https://drjaju.com';

    // --- Fetch last prescription ID for PDF link ---
    let prescriptionLink = '';
    try {
      const rxRes = await api.get(`/api/prescriptions/${ref.patient_id}?limit=1`);
      const prescriptions = rxRes.data?.data?.prescriptions || rxRes.data?.prescriptions || [];
      if (prescriptions.length > 0) {
        prescriptionLink = `${baseUrl}/api/pdf/prescription/${prescriptions[0].id}`;
      }
    } catch (e) { console.error('Prescription fetch:', e); }

    // --- Check if lab results exist for PDF link ---
    let labLink = '';
    try {
      const labRes = await api.get(`/api/labs/${ref.patient_id}`);
      const labs = labRes.data?.labs || labRes.data?.data || [];
      if (labs.length > 0) {
        labLink = `${baseUrl}/api/pdf/lab-report/${ref.patient_id}`;
      }
    } catch (e) { console.error('Lab results fetch:', e); }

    const doctorName = user?.name || 'Doctor';
    const doctorPhone = user?.phone || '';
    const referralDate = ref.referral_date ? new Date(ref.referral_date).toLocaleDateString('en-IN') : 'N/A';

    const msg =
      `🏥 *PATIENT REFERRAL*\n━━━━━━━━━━━━━━━━━━\n\n` +
      `👨‍⚕️ *From:* Dr. ${doctorName}${doctorPhone ? `\n📞 ${doctorPhone}` : ''}\n\n` +
      `👤 *Patient:* ${ref.patient_name || 'N/A'}\n` +
      `📱 ${ref.patient_phone || ''}${ref.patient_age ? ` | ${ref.patient_age}Y` : ''}${ref.patient_gender ? ` / ${ref.patient_gender}` : ''}\n\n` +
      `🩺 *Reason:* ${ref.reason || 'Consultation'}\n` +
      `⚡ *Priority:* ${(ref.priority || 'routine').toUpperCase()}` +
      `${ref.notes ? `\n📝 *Notes:* ${ref.notes}` : ''}` +
      (prescriptionLink ? `\n\n📄 *Last Prescription:*\n${prescriptionLink}` : '') +
      (labLink ? `\n\n🔬 *Lab Report:*\n${labLink}` : '') +
      `\n\n━━━━━━━━━━━━━━━━━━\n_Referred on ${referralDate}_`;

    const phone = (ref.referred_doctor_phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = phone.length === 10 ? '91' + phone : phone;
    if (formattedPhone) {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const updateStatus = async (refId, status) => {
    try {
      await api.put(`/api/patient-referrals/${refId}`, { status });
      setReferrals(prev => prev.map(r => r.id === refId ? { ...r, status } : r));
      addToast('Status updated', 'success');
    } catch (e) {
      addToast('Failed to update status', 'error');
    }
  };

  const addNetworkDoctor = async () => {
    if (!newDoc.network_doctor_name.trim()) { addToast('Doctor name required', 'error'); return; }
    try {
      await api.post('/api/patient-referrals/network/doctors', newDoc);
      addToast('Doctor added to network', 'success');
      setNewDoc({ network_doctor_name: '', network_doctor_phone: '', specialization: '', hospital_name: '' });
      fetchData();
    } catch (e) {
      addToast('Failed to add doctor', 'error');
    }
  };

  const deleteNetworkDoctor = async (docId) => {
    if (!confirm('Remove this doctor from network?')) return;
    try {
      await api.delete(`/api/patient-referrals/network/doctors/${docId}`);
      setNetwork(prev => prev.filter(d => d.id !== docId));
      addToast('Doctor removed', 'success');
    } catch (e) {
      addToast('Failed to remove doctor', 'error');
    }
  };

  const saveEditDoc = async () => {
    if (!editingDoc) return;
    try {
      await api.put(`/api/patient-referrals/network/doctors/${editingDoc.id}`, {
        network_doctor_name: editingDoc.network_doctor_name,
        network_doctor_phone: editingDoc.network_doctor_phone,
        specialization: editingDoc.specialization,
        hospital_name: editingDoc.hospital_name
      });
      setNetwork(prev => prev.map(d => d.id === editingDoc.id ? { ...d, ...editingDoc } : d));
      setEditingDoc(null);
      addToast('Doctor updated', 'success');
    } catch (e) {
      addToast('Failed to update doctor', 'error');
    }
  };

  const deleteReferral = async (refId) => {
    if (!confirm('Delete this referral?')) return;
    try {
      await api.delete(`/api/patient-referrals/${refId}`);
      setReferrals(prev => prev.filter(r => r.id !== refId));
      addToast('Referral deleted', 'success');
    } catch (e) {
      addToast('Failed to delete referral', 'error');
    }
  };

  const saveEditRef = async () => {
    if (!editingRef) return;
    try {
      await api.put(`/api/patient-referrals/${editingRef.id}`, {
        referred_doctor_name: editingRef.referred_doctor_name,
        referred_doctor_phone: editingRef.referred_doctor_phone,
        referred_doctor_specialization: editingRef.referred_doctor_specialization,
        hospital_name: editingRef.hospital_name,
        reason: editingRef.reason,
        priority: editingRef.priority,
        notes: editingRef.notes
      });
      setReferrals(prev => prev.map(r => r.id === editingRef.id ? { ...r, ...editingRef } : r));
      setEditingRef(null);
      addToast('Referral updated', 'success');
    } catch (e) {
      addToast('Failed to update referral', 'error');
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading referrals...</div>;

  const WaIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.339 0-4.527-.677-6.38-1.84l-.244-.152-3.158 1.058 1.058-3.158-.152-.244A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );

  const statusColors = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    accepted: 'bg-blue-100 text-blue-700 border-blue-200',
    declined: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
        <button onClick={() => setSubTab('referrals')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'referrals' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          🔗 My Referrals <span className="ml-1 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{referrals.length}</span>
        </button>
        <button onClick={() => setSubTab('network')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'network' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          👨‍⚕️ Doctor Network <span className="ml-1 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{network.length}</span>
        </button>
      </div>

      {/* Referrals List */}
      {subTab === 'referrals' && (
        <div className="space-y-3">
          {referrals.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-200">
              <div className="text-5xl mb-3">🔗</div>
              <p className="text-gray-500 font-medium">No referrals yet</p>
              <p className="text-gray-400 text-sm mt-1">Use "Refer to Doctor" from Patient Overview to create one.</p>
            </div>
          ) : (
            referrals.map((ref) => {
              const initials = (ref.patient_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={ref.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {editingRef?.id === ref.id ? (
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-700">✏️ Editing — {ref.patient_name}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Doctor Name" value={editingRef.referred_doctor_name || ''}
                          onChange={e => setEditingRef(p => ({ ...p, referred_doctor_name: e.target.value }))} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Phone" value={editingRef.referred_doctor_phone || ''}
                          onChange={e => setEditingRef(p => ({ ...p, referred_doctor_phone: e.target.value }))} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Specialization" value={editingRef.referred_doctor_specialization || ''}
                          onChange={e => setEditingRef(p => ({ ...p, referred_doctor_specialization: e.target.value }))} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Hospital" value={editingRef.hospital_name || ''}
                          onChange={e => setEditingRef(p => ({ ...p, hospital_name: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" placeholder="Reason" value={editingRef.reason || ''}
                          onChange={e => setEditingRef(p => ({ ...p, reason: e.target.value }))} />
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value={editingRef.priority || 'routine'}
                          onChange={e => setEditingRef(p => ({ ...p, priority: e.target.value }))}>
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none" rows={2} placeholder="Notes" value={editingRef.notes || ''}
                        onChange={e => setEditingRef(p => ({ ...p, notes: e.target.value }))} />
                      <div className="flex gap-2">
                        <button onClick={saveEditRef} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm">✓ Save</button>
                        <button onClick={() => setEditingRef(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex">
                      {/* Left color accent */}
                      <div className={`w-1 flex-shrink-0 rounded-l-xl ${ref.priority === 'urgent' ? 'bg-red-500' : 'bg-blue-400'}`} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white ${ref.priority === 'urgent' ? 'bg-red-400' : 'bg-blue-500'}`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Top row */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{ref.patient_name || 'Unknown Patient'}</span>
                              {ref.patient_phone && <span className="text-xs text-gray-400">📱 {ref.patient_phone}</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${ref.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                {(ref.priority || 'ROUTINE').toUpperCase()}
                              </span>
                              <select value={ref.status || 'pending'} onChange={(e) => updateStatus(ref.id, e.target.value)}
                                className={`text-xs px-2 py-0.5 rounded-lg border font-medium cursor-pointer outline-none ${statusColors[ref.status] || statusColors.pending}`}>
                                <option value="pending">⏳ Pending</option>
                                <option value="accepted">✓ Accepted</option>
                                <option value="completed">✅ Completed</option>
                                <option value="declined">✗ Declined</option>
                              </select>
                            </div>
                            {/* Doctor info */}
                            <div className="text-sm text-gray-700 font-medium">
                              → {ref.referred_doctor_name || 'N/A'}
                              {ref.referred_doctor_specialization && <span className="text-gray-400 font-normal"> ({ref.referred_doctor_specialization})</span>}
                              {ref.hospital_name && <span className="text-gray-400 font-normal"> · {ref.hospital_name}</span>}
                            </div>
                            {/* Reason & notes */}
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className="font-medium text-gray-600">Reason:</span> {ref.reason || '-'}
                              {ref.notes && <span className="ml-2 text-gray-400">· {ref.notes}</span>}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {ref.referral_date ? new Date(ref.referral_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <button onClick={() => shareOnWhatsApp(ref)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 shadow-sm transition">
                              <WaIcon /> Share
                            </button>
                            <button onClick={() => setEditingRef({ ...ref })}
                              className="px-3 py-1.5 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-50 transition">
                              ✏️ Edit
                            </button>
                            <button onClick={() => deleteReferral(ref.id)}
                              className="px-2 py-1.5 text-red-500 border border-red-100 rounded-lg text-xs hover:bg-red-50 transition">
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Doctor Network */}
      {subTab === 'network' && (
        <div className="space-y-4">
          {/* Add new doctor */}
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-medium text-gray-800 mb-3">Add Doctor to Network</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input className="px-3 py-2 border rounded text-sm" placeholder="Doctor Name *" value={newDoc.network_doctor_name}
                onChange={e => setNewDoc(p => ({ ...p, network_doctor_name: e.target.value }))} />
              <input className="px-3 py-2 border rounded text-sm" placeholder="Phone" value={newDoc.network_doctor_phone}
                onChange={e => setNewDoc(p => ({ ...p, network_doctor_phone: e.target.value }))} />
              <input className="px-3 py-2 border rounded text-sm" placeholder="Specialization" value={newDoc.specialization}
                onChange={e => setNewDoc(p => ({ ...p, specialization: e.target.value }))} />
              <input className="px-3 py-2 border rounded text-sm" placeholder="Hospital" value={newDoc.hospital_name}
                onChange={e => setNewDoc(p => ({ ...p, hospital_name: e.target.value }))} />
            </div>
            <button onClick={addNetworkDoctor} className="mt-3 px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
              + Add to Network
            </button>
          </div>

          {/* Network list */}
          <div className="bg-white rounded-lg shadow">
            {network.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No doctors in your referral network yet.</div>
            ) : (
              <div className="divide-y">
                {network.map(doc => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50">
                    {editingDoc?.id === doc.id ? (
                      <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <input className="px-3 py-2 border rounded text-sm" placeholder="Doctor Name *" value={editingDoc.network_doctor_name}
                            onChange={e => setEditingDoc(p => ({ ...p, network_doctor_name: e.target.value }))} />
                          <input className="px-3 py-2 border rounded text-sm" placeholder="Phone" value={editingDoc.network_doctor_phone || ''}
                            onChange={e => setEditingDoc(p => ({ ...p, network_doctor_phone: e.target.value }))} />
                          <input className="px-3 py-2 border rounded text-sm" placeholder="Specialization" value={editingDoc.specialization || ''}
                            onChange={e => setEditingDoc(p => ({ ...p, specialization: e.target.value }))} />
                          <input className="px-3 py-2 border rounded text-sm" placeholder="Hospital" value={editingDoc.hospital_name || ''}
                            onChange={e => setEditingDoc(p => ({ ...p, hospital_name: e.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEditDoc} className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">Save</button>
                          <button onClick={() => setEditingDoc(null)} className="px-3 py-1.5 border rounded text-xs hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{doc.network_doctor_name}</div>
                          <div className="text-sm text-gray-500">
                            {[doc.specialization, doc.hospital_name, doc.network_doctor_phone].filter(Boolean).join(' | ')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingDoc({ ...doc })}
                            className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 hover:bg-blue-50 rounded">
                            Edit
                          </button>
                          <button onClick={() => deleteNetworkDoctor(doc.id)}
                            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded">
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSettings;
