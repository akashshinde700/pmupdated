import React, { useState } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';

export default function AddPatientModal({ isOpen, onClose, onSuccess }) {
  // console.log('AddPatientModal isOpen:', isOpen);
  const api = useApiClient();
  const { addToast } = useToast();
  const { user } = useAuth(); // Get logged-in user
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    salutation: 'Mr.',
    name: '',
    email: '',
    phone: '',
    dob: '',
    age_years: '',
    gender: 'Male',
    blood_group: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_conditions: '',
    allergies: '',
    current_medications: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Resolve clinic and doctor from user context
      const clinicId = user?.clinic_id || user?.clinicId || 1;
      const doctorId = user?.doctor_id || user?.doctorId || null;

      // First create the patient
      const response = await api.post('/api/patients', {
        name: (() => {
          const salutations = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Baby', 'Master'];
          let cleanName = form.name.trim();
          for (const s of salutations) {
            if (cleanName.toLowerCase().startsWith(s.toLowerCase() + ' ')) {
              cleanName = cleanName.slice(s.length).trim();
              break;
            }
          }
          return `${form.salutation} ${cleanName}`.trim();
        })(),
        email: form.email,
        phone: form.phone,
        dob: form.dob,
        age_years: form.age_years || null,
        gender: form.gender,
        blood_group: form.blood_group,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        medical_conditions: form.medical_conditions,
        allergies: form.allergies,
        current_medications: form.current_medications,
        clinic_id: clinicId,
        created_by: user?.id || null,
      });

      const patient = response.data.patient || response.data;

      // Create appointment and add to queue for walk-in treatment
      try {
        const appointmentData = {
          patient_id: patient.id,
          doctor_id: doctorId,
          clinic_id: clinicId,
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          arrival_type: 'walk-in',
          consultation_type: 'new',
          appointment_type: 'offline',
          status: 'scheduled',
          consultation_fee: 500,
          payment_status: 'pending',
          amount_paid: 0,
        };

        const appointmentResponse = await api.post('/api/appointments', appointmentData);

        // Create bill for consultation fee
        await api.post('/api/bills', {
          patient_id: patient.id,
          appointment_id: appointmentResponse.data.id,
          total_amount: 500,
          amount_paid: 0,
          payment_status: 'pending',
          payment_method: 'cash',
          service_name: 'Consultation',
          bill_date: new Date().toISOString().split('T')[0],
        });

        // Add patient to queue for immediate treatment
        const queueResponse = await api.post('/api/queue', {
          patient_id: patient.id,
          appointment_id: appointmentResponse.data.id,
          doctor_id: doctorId,
          clinic_id: clinicId,
          status: 'waiting',
          priority: 0,
        });

        // console.log('Queue response:', queueResponse.data);
        addToast(`Patient added! Token #${queueResponse.data.token_number || 'N/A'} - Queued for treatment`, 'success');
      } catch (aptError) {
        console.error('Appointment/Queue creation failed:', aptError);
        console.error('Error details:', aptError.response?.data);
        // Patient was created but queue failed - show warning
        addToast('Patient added but could not be queued. Please add to queue manually.', 'warning');
      }

      const createdPatient = response.data.patient || response.data;
      onSuccess?.(createdPatient);
      handleClose();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Unable to add patient';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      salutation: 'Mr.',
      name: '',
      email: '',
      phone: '',
      dob: '',
      age_years: '',
      gender: 'Male',
      blood_group: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_conditions: '',
      allergies: '',
      current_medications: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";
  const sectionCls = "space-y-3";
  const sectionHeadCls = "flex items-center gap-2 text-sm font-bold text-gray-700 pb-2 border-b border-gray-100";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add New Patient</h2>
              <p className="text-blue-200 text-xs">Fill in patient details below</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* ── Basic Information ── */}
          <div className={sectionCls}>
            <h3 className={sectionHeadCls}>
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Salutation</label>
                <select value={form.salutation} onChange={e => setForm({...form, salutation: e.target.value})} className={inputCls} required>
                  {['Mr.','Mrs.','Ms.','Dr.','Baby','Master'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} placeholder="Patient's full name" required />
              </div>
              <div>
                <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputCls} placeholder="10-digit mobile number" pattern="[0-9]{10}" required />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} placeholder="patient@example.com" />
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input type="date" value={form.dob} max={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    const val = e.target.value;
                    const updates = { dob: val };
                    if (val) {
                      const age = Math.floor((Date.now() - new Date(val)) / (365.25*24*3600*1000));
                      if (age >= 0) updates.age_years = String(age);
                    }
                    setForm({...form, ...updates});
                  }}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Age (Years)</label>
                <input type="number" min="0" max="150" value={form.age_years} onChange={e => setForm({...form, age_years: e.target.value, dob: ''})} className={inputCls} placeholder="e.g. 35" />
              </div>
              <div>
                <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className={inputCls} required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Blood Group</label>
                <select value={form.blood_group} onChange={e => setForm({...form, blood_group: e.target.value})} className={inputCls}>
                  <option value="">Select Blood Group</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Address ── */}
          <div className={sectionCls}>
            <h3 className={sectionHeadCls}>
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Address
            </h3>
            <div>
              <label className={labelCls}>Street Address</label>
              <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={inputCls} placeholder="House / Street / Area" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={inputCls} placeholder="City" />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className={inputCls} placeholder="State" />
              </div>
              <div>
                <label className={labelCls}>Pincode</label>
                <input type="text" value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} className={inputCls} placeholder="123456" pattern="[0-9]{6}" />
              </div>
            </div>
          </div>

          {/* ── Emergency Contact ── */}
          <div className={sectionCls}>
            <h3 className={sectionHeadCls}>
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Contact Name</label>
                <input type="text" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} className={inputCls} placeholder="Emergency contact name" />
              </div>
              <div>
                <label className={labelCls}>Contact Phone</label>
                <input type="tel" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} className={inputCls} placeholder="10-digit number" pattern="[0-9]{10}" />
              </div>
            </div>
          </div>

          {/* ── Medical Info ── */}
          <div className={sectionCls}>
            <h3 className={sectionHeadCls}>
              <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Medical Information
            </h3>
            <div>
              <label className={labelCls}>Medical Conditions</label>
              <textarea value={form.medical_conditions} onChange={e => setForm({...form, medical_conditions: e.target.value})} className={inputCls} placeholder="Diabetes, hypertension, etc." rows={2} />
            </div>
            <div>
              <label className={labelCls}>Known Allergies</label>
              <textarea value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} className={inputCls} placeholder="Drug, food, or other allergies" rows={2} />
            </div>
            <div>
              <label className={labelCls}>Current Medications</label>
              <textarea value={form.current_medications} onChange={e => setForm({...form, current_medications: e.target.value})} className={inputCls} placeholder="Medications currently being taken" rows={2} />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50 sm:rounded-b-2xl flex-shrink-0">
          <button type="button" onClick={handleClose} className="flex-1 sm:flex-none sm:px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button type="submit" form="add-patient-form" onClick={handleSubmit} disabled={loading}
            className="flex-1 sm:flex-none sm:px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Adding Patient…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Patient
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
