import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { FiPlus, FiX } from 'react-icons/fi';

export default function InjectionForm({ onAdd, onCancel }) {
  const api = useApiClient();
  const { addToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [formData, setFormData] = useState({
    item_type: 'injection',
    injection_name: '',
    generic_name: '',
    dose: '',
    route: 'IV',
    infusion_rate: '',
    frequency: '',
    duration: '',
    timing: '',
    instructions: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/injection-templates');
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Fetch injection templates error:', error);
    }
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      item_type: 'injection',
      injection_name: template.injection_name,
      generic_name: template.generic_name || '',
      dose: template.dose,
      route: template.route,
      infusion_rate: template.infusion_rate || '',
      frequency: template.frequency,
      duration: template.duration,
      timing: template.timing || '',
      instructions: template.instructions || ''
    });

    // Increment usage count
    api.post(`/api/injection-templates/${template.id}/use`).catch(err => {
      console.error('Failed to increment usage count:', err);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.injection_name || !formData.dose || !formData.route || !formData.frequency || !formData.duration) {
      addToast('Please fill all required fields', 'error');
      return;
    }

    // Call parent's onAdd with formatted data
    onAdd({
      ...formData,
      medicine_name: formData.injection_name, // For compatibility with prescription_items table
      dosage: formData.dose // Map dose to dosage
    });

    // Reset form
    setFormData({
      item_type: 'injection',
      injection_name: '',
      generic_name: '',
      dose: '',
      route: 'IV',
      infusion_rate: '',
      frequency: '',
      duration: '',
      timing: '',
      instructions: ''
    });

    addToast('Injection added to prescription', 'success');
  };

  const handleSaveAsTemplate = async () => {
    try {
      if (!formData.injection_name) {
        addToast('Please enter injection name first', 'error');
        return;
      }

      const templateName = prompt('Enter template name:');
      if (!templateName) return;

      await api.post('/api/injection-templates', {
        template_name: templateName,
        injection_name: formData.injection_name,
        generic_name: formData.generic_name,
        dose: formData.dose,
        route: formData.route,
        infusion_rate: formData.infusion_rate,
        frequency: formData.frequency,
        duration: formData.duration,
        timing: formData.timing,
        instructions: formData.instructions
      });

      addToast('Template saved successfully', 'success');
      fetchTemplates(); // Refresh template list
    } catch (error) {
      console.error('Save template error:', error);
      addToast(error.response?.data?.error || 'Failed to save template', 'error');
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add Injection / IVF</h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={24} />
          </button>
        )}
      </div>

      {/* Template Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Select from Templates
        </label>
        <select
          onChange={(e) => {
            const template = templates.find(t => t.id == e.target.value);
            if (template) handleTemplateSelect(template);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Injection Template --</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.template_name} ({t.injection_name})
            </option>
          ))}
        </select>
      </div>

      <div className="border-t pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Injection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injection Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.injection_name}
              onChange={(e) => setFormData({...formData, injection_name: e.target.value})}
              placeholder="e.g., Orofer FCM 1K Injection"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Generic Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generic Name
            </label>
            <input
              type="text"
              value={formData.generic_name}
              onChange={(e) => setFormData({...formData, generic_name: e.target.value})}
              placeholder="e.g., Ferric Carboxymaltose (50MG/ML)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Dose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dose <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.dose}
                onChange={(e) => setFormData({...formData, dose: e.target.value})}
                placeholder="e.g., 1 ml, 100 ml"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Route */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.route}
                onChange={(e) => setFormData({...formData, route: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IV">IV (Intravenous)</option>
                <option value="IM">IM (Intramuscular)</option>
                <option value="SC">SC (Subcutaneous)</option>
                <option value="Intradermal">Intradermal</option>
                <option value="Intrathecal">Intrathecal</option>
                <option value="Intra-articular">Intra-articular</option>
              </select>
            </div>

            {/* Infusion Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Infusion Rate
              </label>
              <input
                type="text"
                value={formData.infusion_rate}
                onChange={(e) => setFormData({...formData, infusion_rate: e.target.value})}
                placeholder="e.g., 2 drops/min, 20 drops/min"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                placeholder="e.g., 0-1-0, 1-0-0, 1-0-1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                placeholder="e.g., 2 Days, 7 Days"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Timing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timing
              </label>
              <select
                value={formData.timing}
                onChange={(e) => setFormData({...formData, timing: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select timing</option>
                <option value="stat">Stat</option>
                <option value="after meal">After Meal</option>
                <option value="before meal">Before Meal</option>
                <option value="empty stomach">Empty Stomach</option>
                <option value="bedtime">Bedtime</option>
              </select>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              placeholder="e.g., in 250 ml NS over half hour"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
            >
              <FiPlus className="inline mr-2" />
              Add to Prescription
            </button>
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
            >
              Save as Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
