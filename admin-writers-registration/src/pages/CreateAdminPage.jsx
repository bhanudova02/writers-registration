import { FaUserPlus } from "react-icons/fa6";
import { FaListCheck } from "react-icons/fa6";
import CustomInput from "../components/custom/CustomInput";
import CustomButton from "../components/custom/CustomButton";
import { LuShieldCheck } from "react-icons/lu";
import { adminAccessPages } from "../lib/data";
import { useEffect, useState } from "react";
import { CustomSelect } from "../components/custom/CustomSelect";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import EditAdminModal from "../components/admin/EditAdminModal";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import { toast } from 'react-toastify';


export default function CreateAdminPage() {
    const [admins, setAdmins] = useState([]);
    const [selectedAdminValue, setSelectedAdminValue] = useState("");
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [permissions, setPermissions] = useState([]);
    const [originalPermissions, setOriginalPermissions] = useState([]);

    const [userNameError, setUserNameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingAdmin, setDeletingAdmin] = useState(null);

    useEffect(() => {
        if (userName && userName.length < 4) {
            setUserNameError("Username must be at least 4 characters.");
        } else {
            setUserNameError("");
        }
    }, [userName]);

    useEffect(() => {
        if (password && password.length < 4) {
            setPasswordError("Password must be at least 4 characters.");
        } else {
            setPasswordError("");
        }
    }, [password]);


    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
            const data = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
            setAdmins(data);
        });
        return () => unsub();
    }, []);

    const handleAddUser = async () => {
        if (!userName.trim() || userName.trim().length < 4) {
            toast.error("Valid username is required.");
            return;
        }
        if (!password.trim() || password.trim().length < 4) {
            toast.error("Valid password is required.");
            return;
        }

        setIsProcessing(true);
        try {
            const newAdminRef = doc(db, 'admins', userName.trim().toLowerCase());
            await setDoc(newAdminRef, {
                username: userName.trim(),
                password: password.trim(),
                email: `${userName.trim().toLowerCase()}@tcwa.in`,
                displayName: userName.trim(),
                permissions: ['Dashboard'],
                active: true,
                createdAt: new Date().toISOString()
            });
            setUserName("");
            setPassword("");
            toast.success("Admin user added successfully!");
        } catch (error) {
            console.error("Failed to add user", error);
            toast.error("Failed to add user.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!id) return;
        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, 'admins', id));
            toast.success("User deleted successfully!");
            handleCloseDeleteModal();
        } catch (error) {
            console.error("Failed to delete user", error);
            toast.error("Failed to delete user.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePermissionChange = (pageTitle) => {
        setPermissions(prev =>
            prev.includes(pageTitle)
                ? prev.filter(p => p !== pageTitle)
                : [...prev, pageTitle]
        );
    };

    const handleUpdatePermissions = async () => {
        if (!selectedAdminValue) {
            toast.info("Please select a user to update permissions.");
            return;
        }
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, 'admins', selectedAdminValue), {
                permissions
            });
            toast.success("Permissions updated successfully!");
            setSelectedAdminValue("");
        } catch (error) {
            console.error("Failed to update permissions", error);
            toast.error("Failed to update permissions.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenEditModal = (admin) => {
        setEditingAdmin(admin);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingAdmin(null);
    };

    const handleSaveAdmin = async (id, updateData) => {
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, 'admins', id), updateData);
            toast.success("User updated successfully!");
            handleCloseEditModal();
        } catch (error) {
            console.error("Failed to update user", error);
            toast.error("Failed to update user.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenDeleteModal = (admin) => {
        setDeletingAdmin(admin);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletingAdmin(null);
    };

    useEffect(() => {
        if (selectedAdminValue) {
            const selected = admins.find(admin => admin._id === selectedAdminValue);
            if (selected) {
                const currentPerms = selected.permissions || [];
                setPermissions(currentPerms);
                setOriginalPermissions(currentPerms);
            }
        } else {
            setPermissions([]);
            setOriginalPermissions([]);
        }
    }, [selectedAdminValue, admins]);

    const hasChanges = JSON.stringify([...permissions].sort()) !== JSON.stringify([...originalPermissions].sort());
    const isCreateDisabled = !userName || userName.length < 4 || !password || password.length < 4 || !!userNameError || !!passwordError;

    return (
        <div className="pb-4">
            <div className="flex items-center gap-1 ms-1 mb-4">
                <FaUserPlus className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h2 className="text-xl font-bold">Add Admin User</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                <div className="space-y-3">
                    <div className="bg-white border border-gray-100 px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10 rounded-md w-full shadow-sm">
                        <div className="space-y-4">
                            <CustomInput
                                type="text"
                                label="User Name"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                error={userNameError}
                            />
                            <CustomInput
                                type="password"
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                error={passwordError}
                            />
                            <CustomButton
                                label="Add User"
                                className="mt-1 w-full"
                                onClick={handleAddUser}
                                disabled={isCreateDisabled || isProcessing}
                            />
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 px-6 md:px-10 pt-6 md:pt-10 pb-4 md:pb-6 rounded-md w-full shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-0.5 mb-4">
                                <LuShieldCheck className="text-sm md:text-lg text-zinc-700 -mt-1" />
                                Allow user access to selected pages
                            </h2>
                            <div className="mt-3 ms-0 md:ms-3">
                                <div>
                                    <CustomSelect
                                        label="Select User"
                                        dropdownData={admins.map(admin => ({ value: admin._id, label: admin.username }))}
                                        value={selectedAdminValue}
                                        onChange={(val) => setSelectedAdminValue(val)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-x-8 mt-4">
                                    {adminAccessPages.map((page, index) => (
                                        <label key={index} className="flex items-center gap-2 mt-3 select-none border border-gray-100 bg-gray-50/80 px-2 py-1 cursor-pointer rounded-sm hover:bg-gray-200/80 has-[:checked]:bg-zinc-200">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 accent-gray-600 cursor-pointer"
                                                checked={permissions.includes(page.title)}
                                                onChange={() => handlePermissionChange(page.title)}
                                                disabled={!selectedAdminValue}
                                            />
                                            <span
                                                className="text-[12px] md:text-[13.5px] mt-[1.5px] font-medium text-zinc-700">
                                                {page.title}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full flex justify-end mt-4">
                                <CustomButton
                                    label="Update Permissions"
                                    className="w-fit"
                                    onClick={handleUpdatePermissions}
                                    disabled={!selectedAdminValue || !hasChanges || isProcessing}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="bg-white border border-gray-100 px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10 rounded-md w-full max-h-125 overflow-y-auto shadow-sm">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <FaListCheck className="text-sm md:text-base text-zinc-700 -mt-1" />
                            List Of Users
                        </h2>
                        {admins.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No users added yet.</p>
                        ) : (
                            <div>
                                {admins.map((admin) => (
                                    <div key={admin._id} className="text-[13px] md:text-[14px] text-zinc-700 font-medium border-b border-gray-100 py-3">
                                        <div className="flex justify-between items-center">
                                            <h2>{admin.username} <span className="text-xs text-gray-400">({admin.active ? 'Active' : 'Inactive'})</span></h2>
                                            <div className="flex gap-2">
                                                <CustomButton label="Edit" bgColor="bg-gray-400 hover:bg-gray-600" onClick={() => handleOpenEditModal(admin)} />
                                                <CustomButton label="Delete" bgColor="bg-red-500 hover:bg-red-600" onClick={() => handleOpenDeleteModal(admin)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isEditModalOpen && (
                <EditAdminModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    admin={editingAdmin}
                    onSave={handleSaveAdmin}
                    loading={isProcessing}
                />
            )}
            {isDeleteModalOpen && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseDeleteModal}
                    onConfirm={() => handleDeleteUser(deletingAdmin?._id)}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete the user "${deletingAdmin?.username}"? This action cannot be undone.`}
                    loading={isProcessing}
                />
            )}
        </div>
    )
}
