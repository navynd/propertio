import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/Loader/loader";

function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        await logout();
      } catch {
        // Session cleared in AuthContext; still send user to login.
      } finally {
        navigate("/", { replace: true });
      }
    };
    void run();
  }, [logout, navigate]);

  return (
    <div className="fixed inset-0 z-[10060] flex flex-col items-center justify-center gap-3 bg-[#F5F5F5]">
      <Loader size={72} margin={0} />
      <p className="text-[14px] font-[Medium] text-[#707070]">Signing out…</p>
    </div>
  );
}

export default Logout;
