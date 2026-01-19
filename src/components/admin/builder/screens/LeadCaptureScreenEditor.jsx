import React from 'react';
import SafeIcon from '../../../../common/SafeIcon';
import BackgroundSelector from '../common/BackgroundSelector';
import ButtonStyleSelector from '../common/ButtonStyleSelector';
import * as FiIcons from 'react-icons/fi';

const { FiPlus, FiTrash2, FiMove } = FiIcons;

const LeadCaptureScreenEditor = ({ screenData, onChange }) => {
  const handleChange = (key, value) => {
    onChange({ ...screenData, [key]: value });
  };
  
  const handleButtonChange = (updates) => {
    onChange({ ...screenData, ...updates });
  };

  const handleFieldChange = (index, key, value) => {
    const fields = [...(screenData.fields || [])];
    fields[index] = { ...fields[index], [key]: value };
    handleChange('fields', fields);
  };

  const addField = () => {
    const fields = [...(screenData.fields || [])];
    fields.push({ 
      id: `field_${Date.now()}`, 
      type: 'text', 
      label: 'New Field', 
      required: false,
      placeholder: '' 
    });
    handleChange('fields', fields);
  };

  const removeField = (index) => {
    const fields = [...(screenData.fields || [])];
    fields.splice(index, 1);
    handleChange('fields', fields);
  };

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone Number' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' }
  ];

  return (
    <div className="space-y-6">
      <BackgroundSelector 
        data={screenData.background} 
        onChange={(val) => handleChange('background', val)}
        includeDefaultOption={true}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Form Headline
          </label>
          <input 
            type="text" 
            value={screenData.headline || ''} 
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Claim Your Prize"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Submit Button Text
          </label>
          <input 
            type="text" 
            value={screenData.submitButtonText || ''} 
            onChange={(e) => handleChange('submitButtonText', e.target.value)}
            placeholder="Submit"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <ButtonStyleSelector 
        data={screenData} 
        onChange={handleButtonChange} 
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Form Description (Optional)
        </label>
        <textarea 
          value={screenData.description || ''} 
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Please fill out the form below to claim your prize..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Form Fields</h4>
          <button 
            onClick={addField}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Field</span>
          </button>
        </div>

        <div className="space-y-4">
          {(screenData.fields || []).map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={FiMove} className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">Field {index + 1}</span>
                </div>
                <button 
                  onClick={() => removeField(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type
                  </label>
                  <select 
                    value={field.type}
                    onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {fieldTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input 
                    type="text" 
                    value={field.label}
                    onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder
                  </label>
                  <input 
                    type="text" 
                    value={field.placeholder || ''}
                    onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 mt-5">
                    <input 
                      type="checkbox" 
                      checked={field.required || false}
                      onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Required</span>
                  </label>
                </div>
              </div>

              {field.type === 'select' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (one per line)
                  </label>
                  <textarea 
                    value={field.options || ''}
                    onChange={(e) => handleFieldChange(index, 'options', e.target.value)}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={3}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {(screenData.fields || []).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No form fields added yet. Click "Add Field" to create your first form field.</p>
          </div>
        )}
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-4">Privacy & Consent</h4>
        <div className="space-y-4">
          <label className="flex items-start space-x-3">
            <input 
              type="checkbox" 
              checked={screenData.requireConsent || false} 
              onChange={(e) => handleChange('requireConsent', e.target.checked)}
              className="rounded mt-1"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Require consent checkbox</span>
              <p className="text-xs text-gray-500">Users must agree to terms before submitting</p>
            </div>
          </label>
          
          {screenData.requireConsent && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consent Text
              </label>
              <input 
                type="text" 
                value={screenData.consentText || ''} 
                onChange={(e) => handleChange('consentText', e.target.value)}
                placeholder="I agree to receive promotional emails"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {screenData.headline || 'Claim Your Prize'}
          </h1>
          {screenData.description && (
            <p className="text-gray-600 mb-6 text-center">
              {screenData.description}
            </p>
          )}
          <form className="space-y-4">
            {(screenData.fields || []).map((field, index) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2" disabled>
                    <option>Select an option...</option>
                    {(field.options || '').split('\n').filter(opt => opt.trim()).map((option, i) => (
                      <option key={i}>{option.trim()}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" disabled className="rounded" />
                    <span className="text-sm">{field.placeholder || field.label}</span>
                  </label>
                ) : (
                  <input 
                    type={field.type} 
                    placeholder={field.placeholder || field.label} 
                    disabled 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  />
                )}
              </div>
            ))}
            
            {screenData.requireConsent && (
              <label className="flex items-center space-x-2">
                <input type="checkbox" disabled className="rounded" />
                <span className="text-sm text-gray-700">
                  {screenData.consentText || 'I agree to receive promotional emails'}
                </span>
              </label>
            )}
            
            <button 
              type="button" 
              disabled 
              className="w-full py-3 rounded-lg font-medium"
              style={{ 
                backgroundColor: screenData.useCustomButtonColor ? screenData.buttonColor : '#2563eb',
                color: screenData.useCustomButtonColor ? screenData.buttonTextColor : '#ffffff'
              }}
            >
              {screenData.submitButtonText || 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureScreenEditor;