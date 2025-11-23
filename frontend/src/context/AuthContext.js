import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const syncSession = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const userData = await API.getMe();
            setUser(userData);
        } catch (err) {
            console.error("Session sync failed", err);
            localStorage.removeItem('accessToken');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncSession();
    }, []);

    const login = async (studentId, password) => {
        const data = await API.login(studentId, password);
        const { accessToken, ...userData } = data;
        localStorage.setItem('accessToken', accessToken);
        setUser(userData);
        return userData;
    };

    const register = async (data) => {
        return await API.register(data);
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        syncSession
    };

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
