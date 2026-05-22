import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import CustomInput from '../custom/CustomInput';
import { CustomSelect } from '../custom/CustomSelect';
import CustomButton from '../custom/CustomButton';

const memberTypeOptions = [
  { value: "Life Time Member", label: "Life Time Member" },
  { value: "Associate Member", label: "Associate Member" },
];

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export default function EditMemberModal({ isOpen, onClose, member, onSave, loading }) {
  const [name, setName] = useState('');
  const [memberType, setMemberType] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Active');

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setMemberType(member.memberType || 'Life Time Member');
      setMobileNumber(member.mobileNumber || '');
      setEmail(member.email || '');
      setStatus(member.status || 'Active');
      setErrors({});
    }
  }, [member]);

  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'name':
        return value.trim() ? '' : 'Name is required.';
      case 'mobileNumber':
        if (!value.trim()) return 'Mobile number is required.';
        if (!/^\d{10}$/.test(value.trim())) return 'Mobile number must be exactly 10 digits.';
        return '';
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Invalid email format.';
        return '';
      default:
        return '';
    }
  };

  const handleNameChange = (val) => {
    setName(val);
    setErrors(prev => ({ ...prev, name: validateField('name', val) }));
  };

  const handleMobileChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
    setErrors(prev => ({ ...prev, mobileNumber: validateField('mobileNumber', cleaned) }));
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    setErrors(prev => ({ ...prev, email: validateField('email', val) }));
  };

  const handleSave = () => {
    const nameErr = validateField('name', name);
    const mobileErr = validateField('mobileNumber', mobileNumber);
    const emailErr = validateField('email', email);

    if (nameErr || mobileErr || emailErr) {
      setErrors({ name: nameErr, mobileNumber: mobileErr, email: emailErr });
      return;
    }

    onSave(member.membershipId, {
      name: name.trim(),
      memberType,
      mobileNumber: mobileNumber.trim(),
      email: email.trim(),
      status
    });
  };

  if (!isOpen) return null;

  const hasErrors = Object.values(errors).some(Boolean) || !name.trim() || mobileNumber.length !== 10;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Member: ${member?.membershipId}`} widthClass="md:max-w-lg">
      <div className="space-y-4">
        <CustomInput
          label="Member Name *"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          error={errors.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <CustomSelect
            label="Member Type *"
            dropdownData={memberTypeOptions}
            value={memberType}
            onChange={(val) => setMemberType(val)}
          />
          <CustomSelect
            label="Status *"
            dropdownData={statusOptions}
            value={status}
            onChange={(val) => setStatus(val)}
          />
        </div>

        <CustomInput
          label="Mobile Number *"
          value={mobileNumber}
          onChange={(e) => handleMobileChange(e.target.value)}
          error={errors.mobileNumber}
        />

        <CustomInput
          label="Email Address (Optional)"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          error={errors.email}
        />

        <div className="flex justify-end gap-3 mt-6 border-t border-zinc-100 pt-4">
          <CustomButton
            label="Cancel"
            onClick={onClose}
            bgColor="bg-zinc-100 hover:bg-zinc-200"
            textColor="text-zinc-700"
            className="border border-zinc-300"
          />
          <CustomButton
            label={loading ? "Saving..." : "Save Changes"}
            onClick={handleSave}
            disabled={hasErrors || loading}
          />
        </div>
      </div>
    </Modal>
  );
}
