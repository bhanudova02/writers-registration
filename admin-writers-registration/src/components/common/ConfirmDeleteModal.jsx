import Modal from '../common/Modal';
import CustomButton from '../custom/CustomButton';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message, loading }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-zinc-700">
        {message}
      </p>
      <div className="flex justify-end gap-2 mt-6">
        <CustomButton
          label="Cancel"
          onClick={onClose}
          bgColor="bg-gray-300 hover:bg-gray-400"
        />
        <CustomButton
          label="Yes, Delete"
          onClick={onConfirm}
          bgColor="bg-red-600 hover:bg-red-700"
          disabled={loading}
        />
      </div>
    </Modal>
  );
}
