import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles?: Array<'verifier' | 'operator' | 'auditor'>;
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    // Show nothing while checking auth status
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-8 w-8 text-accent" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-muted-foreground text-sm">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role-based access if required
    if (requiredRoles && user && !requiredRoles.includes(user.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
                    <p className="text-muted-foreground mb-4">
                        You don't have permission to access this page.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Required role: {requiredRoles.join(' or ')}
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
