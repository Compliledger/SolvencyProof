import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'verifier' | 'operator' | 'auditor';

export interface User {
    name: string;
    email: string;
    role: UserRole;
    loginTime: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (name: string, email: string, role: UserRole) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'solvency_auth_user';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getStoredUser(): User | null {
    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return null;

        const user: User = JSON.parse(stored);

        // Check if session expired
        if (Date.now() - user.loginTime > SESSION_DURATION) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
        }

        return user;
    } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
}

function storeUser(user: User): void {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
        console.error('[Auth] Failed to store user:', e);
    }
}

function clearStoredUser(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Also clear legacy keys if they exist
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from localStorage on mount
    useEffect(() => {
        const storedUser = getStoredUser();
        if (storedUser) {
            setUser(storedUser);
        }
        setIsLoading(false);
    }, []);

    const login = (name: string, email: string, role: UserRole) => {
        const newUser: User = {
            name,
            email,
            role,
            loginTime: Date.now(),
        };
        setUser(newUser);
        storeUser(newUser);
    };

    const logout = () => {
        setUser(null);
        clearStoredUser();
    };

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        storeUser(updatedUser);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
