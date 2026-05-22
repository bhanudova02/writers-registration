import { FaUserPlus } from "react-icons/fa6";
import { FaListCheck } from "react-icons/fa6";
import CustomInput from "../../components/custom/CustomInput";
import CustomButton from "../../components/custom/CustomButton";
import { LuShieldCheck } from "react-icons/lu";
import { adminAccessPages } from "../../lib/data";
import { useEffect, useState } from "react";
import { CustomSelect } from "../../components/custom/CustomSelect";
import { createAdmin, deleteAdmin, getAdmins, updateAdmin } from "../../services/adminService";
import EditAdminModal from "../../components/admin/EditAdminModal";
import ConfirmDeleteModal from "../../components/common/ConfirmDeleteModal";
import { toast } from 'react-toastify';


export default function AddUser() {
    const [admins, setAdmins] = useState([]);
    const [selectedAdminValue, setSelectedAdminValue] = useState("");
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [permissions, setPermissions] = useState([]);
    const [originalPermissions, setOriginalPermissions] = useState([]); // State to track original permissions for change detection

    // Validation state
    const [userNameError, setUserNameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);


    // State for Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingAdmin, setDeletingAdmin] = useState(null);

    // Validation Effects
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
        const fetchAdmins = async () => {
            try {
                const data = await getAdmins();
                setAdmins(data);
            } catch (error) {
                console.error("Failed to fetch users", error);
                toast.error("Failed to fetch users.");
            }
        };
        fetchAdmins();
    }, []);

    const handleAddUser = async () => {
        if (!userName.trim()) {
            toast.error("Username is required.");
            return;
        }
        if (userName.trim().length < 4) {
            toast.error("Username must be at least 4 characters long.");
            return;
        }
        if (!password.trim()) {
            toast.error("Password is required.");
            return;
        }
        if (password.trim().length < 4) {
            toast.error("Password must be at least 4 characters long.");
            return;
        }

        setIsProcessing(true);
        try {
            const newAdmin = await createAdmin({ username: userName, password });
            setAdmins(prevAdmins => [...prevAdmins, newAdmin]);
            setUserName("");
            setPassword("");
            toast.success("User added successfully!");
        } catch (error) {
            console.error("Failed to add user", error);
            toast.error(error.response?.data?.msg || "Failed to add user.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!id) return;
        setIsProcessing(true);
        try {
            await deleteAdmin(id);
            setAdmins(prevAdmins => prevAdmins.filter(admin => admin._id !== id));
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
            const updatedAdmin = await updateAdmin(selectedAdminValue, { permissions });
            setAdmins(prevAdmins => prevAdmins.map(admin => admin._id === selectedAdminValue ? updatedAdmin : admin));
            toast.success("Permissions updated successfully!");
            setSelectedAdminValue(""); // Reset the form
        } catch (error) {
            console.error("Failed to update permissions", error);
            toast.error(error.response?.data?.msg || "Failed to update permissions.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handlers for Edit Modal
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
            const updatedAdmin = await updateAdmin(id, updateData);
            setAdmins(prevAdmins => prevAdmins.map(admin => admin._id === id ? updatedAdmin : admin));
            toast.success("User updated successfully!");
            handleCloseEditModal();
        } catch (error) {
            console.error("Failed to update user", error);
            toast.error(error.response?.data?.msg || "Failed to update user.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handlers for Delete Modal
    const handleOpenDeleteModal = (admin) => {
        setDeletingAdmin(admin);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletingAdmin(null);
    };

    // Effect to update permissions form when an admin is selected
    useEffect(() => {
        if (selectedAdminValue) {
            const selected = admins.find(admin => admin._id === selectedAdminValue);
            if (selected) {
                const currentPerms = selected.permissions || [];
                setPermissions(currentPerms);
                setOriginalPermissions(currentPerms); // Store the original permissions to detect changes
            }
        } else {
            setPermissions([]);
            setOriginalPermissions([]); // Clear when no admin is selected
        }
    }, [selectedAdminValue, admins]);

    // Check if permissions have been modified by the user
    const hasChanges = JSON.stringify([...permissions].sort()) !== JSON.stringify([...originalPermissions].sort());
    const isCreateDisabled = !userName || userName.length < 4 || !password || password.length < 4 || !!userNameError || !!passwordError;


    return (
        <div className="pb-4">
            <div className="flex items-center gap-1 ms-1">
                <FaUserPlus className="text-lg md:text-xl text-zinc-700 -mt-0.5" />
                <h2 className="title-1">Add User</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                <div className="space-y-3">
                    <div className="bg-white border border-gray-100 px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10 rounded-md w-full">
                        <div className="space-y-2">
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
                    <div className="bg-white border border-gray-100 px-6 md:px-10 pt-6 md:pt-10 pb-4 md:pb-6 rounded-md w-full">
                        <div>
                            <h2 className="title-2 flex items-center gap-0.5">
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
                                <div className="grid grid-cols-2 gap-x-8">
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
                    <div className="bg-white border border-gray-100 px-6 md:px-10 pt-6 md:pt-8 pb-7 md:pb-10 rounded-md w-full max-h-125 hover-scrollbar">
                        <h2 className="title-2 flex items-center gap-2">
                            <FaListCheck className="text-sm md:text-base text-zinc-700 -mt-1" />
                            List Of Users
                        </h2>
                        {admins.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No users added yet.</p>
                        ) : (
                            <div>
                                {admins.map((admin) => (
                                    <div key={admin._id} className="text-[13px] md:text-[14px] text-zinc-700 font-medium border-b border-gray-100 py-2.5">
                                        <div className="flex justify-between items-center">
                                            <h2>{admin.username}</h2>
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
            <EditAdminModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                admin={editingAdmin}
                onSave={handleSaveAdmin}
                loading={isProcessing}
            />
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={() => handleDeleteUser(deletingAdmin?._id)}
                title="Confirm Deletion"
                message={`Are you sure you want to delete the user "${deletingAdmin?.username}"? This action cannot be undone.`}
                loading={isProcessing}
            />
        </div>
    )
}