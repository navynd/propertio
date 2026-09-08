import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { authStorage } from "../services/authStorage";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = authStorage.getAccessToken();
  if (!accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}
