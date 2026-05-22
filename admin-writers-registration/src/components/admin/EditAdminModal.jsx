import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import CustomInput from '../custom/CustomInput';
import CustomButton from '../custom/CustomButton';

export default function EditAdminModal({ isOpen, onClose, admin, onSave, loading }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (admin) {
      setUsername(admin.username);
      setPassword(''); // Always clear password for security
      setUsernameError('');
      setPasswordError('');
    }
  }, [admin]);

  useEffect(() => {
    if (username && username.trim().length < 4) {
      setUsernameError('Username must be at least 4 characters.');
    } else {
      setUsernameError('');
    }
  }, [username]);

  useEffect(() => {
    // Password is optional, but if entered, it must be valid
    if (password && password.length < 4) {
      setPasswordError('Password must be at least 4 characters.');
    } else {
      setPasswordError('');
    }
  }, [password]);


  const handleSave = () => {
    if (usernameError || passwordError || !username.trim()) {
      return;
    }
    const updateData = { username: username.trim() };
    if (password) {
      updateData.password = password;
    }
    onSave(admin._id, updateData);
  };

  if (!isOpen) return null;

  const isInvalid = !!usernameError || !!passwordError || !username.trim();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit User: ${admin?.username}`}>
      <div className="space-y-4">
        <CustomInput
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={usernameError}
        />
        <CustomInput
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          error={passwordError}
        />
        <div className="flex justify-end gap-2 mt-4">
          <CustomButton
            label="Cancel"
            onClick={onClose}
            bgColor="bg-gray-300 hover:bg-gray-400"
          />
          <CustomButton
            label="Save Changes"
            onClick={handleSave}
            disabled={isInvalid || loading}
          />
        </div>
      </div>
    </Modal>
  );
}
