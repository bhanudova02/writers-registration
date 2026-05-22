import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const adminApi = axios.create({
    baseURL: `${API_URL}/api/admins`,
    withCredentials: true,
});

const authApi = axios.create({
    baseURL: `${API_URL}/api/auth`,
    withCredentials: true,
});

export const loginAdmin = async (credentials) => {
    const response = await authApi.post('/admin-login', credentials);
    return response.data;
};

export const getAdminProfile = async () => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) {
        throw new Error('No admin token found');
    }
    const response = await authApi.get('/admin/me', {
        headers: {
            'x-auth-token': token,
        },
    });
    return response.data;
};

export const getAdmins = async () => {
    const response = await adminApi.get('/');
    return response.data;
};

export const createAdmin = async (adminData) => {
    const response = await adminApi.post('/', adminData);
    return response.data;
};

export const updateAdmin = async (id, updateData) => {
    const response = await adminApi.put(`/${id}`, updateData);
    return response.data;
};

export const deleteAdmin = async (id) => {
    const response = await adminApi.delete(`/${id}`);
    return response.data;
};
