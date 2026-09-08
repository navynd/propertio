import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ExpertRole } from "../types/auth";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: ExpertRole[];
};

const defaultRouteByRole: Record<ExpertRole, string> = {
  developer: "/developer/dashboard",
  agency: "/agency/dashboard",
  agent: "/agent/dashboard",
};

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, isAuthReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthReady) return null;

  if (!isAuthenticated || !session?.user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  const role = session.user.role;
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={defaultRouteByRole[role]} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
