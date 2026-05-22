import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ROUTE_PERMISSIONS = {
    '/members': 'Members',
    '/registrations': 'Registrations',
    '/renewals': 'Renewals',
    '/notifications': 'Notifications',
    '/create-admin': 'Create Admin',
};

const ProtectedRoute = ({ user, children }) => {
    const location = useLocation();

    // If no user object exists, redirect to the main login page
    if (!user) {
        return <Navigate to="/admin-login" replace />;
    }

    // If the user is an employee/admin, check their permissions
    if (user.isEmployee) {
        const adminPermissions = user.permissions || [];
        const currentPath = location.pathname;

        // Admins can always access the dashboard home
        if (currentPath === '/dashboard' || currentPath === '/') {
            return children;
        }

        // Check if the admin has permission for the current route
        const requiredPermission = ROUTE_PERMISSIONS[currentPath];
        
        // If route has no specific permission requirement, grant access
        if (!requiredPermission) {
            return children;
        }
        
        if (adminPermissions.includes(requiredPermission)) {
            return children;
        }

        // If they don't have permission, redirect to unauthorized page
        return <Navigate to="/unauthorized" replace />;
    }

    // If it's a Google-authenticated user (not an admin), grant full access
    return children;
};

export default ProtectedRoute;
