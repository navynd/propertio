import { useCallback } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ProfileIcon,
  SavedPropertiesIcon,
  SavedAlertsIcon,
  ContactedPropertiesIcon,
  LogoutIcon,
} from "../../../Components/parts/icon";
import {
  clearAuthSession,
  getAuthUser,
  getRefreshToken,
  userLogout,
} from "../../../services/apiService";

type MenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  path?: string;
};

const menuItems: MenuItem[] = [
  {
    key: "profile",
    label: "My profile",
    icon: <ProfileIcon />,
    path: "/account/myprofile",
  },
  {
    key: "saved-properties",
    label: "Saved properties",
    icon: <SavedPropertiesIcon  />,
    path: "/account/savedproperties",
  },
  {
    key: "saved-alerts",
    label: "Saved alerts",
    icon: <SavedAlertsIcon />,
    path: "/account/savedalerts",
  },
  {
    key: "contacted-properties",
    label: "Contacted properties",
    icon: <ContactedPropertiesIcon />,
    path: "/account/contactedproperties",
  },
  {
    key: "logout",
    label: "Logout",
    icon: <LogoutIcon />,
  },
];

function AccountSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    const authUser = getAuthUser<{ id?: string; _id?: string; email?: string }>();

    if (refreshToken) {
      try {
        await userLogout({
          refreshToken,
          email: authUser?.email,
          userId: authUser?.id || authUser?._id,
        });
      } catch {
        // Still clear local session if the server call fails.
      }
    }

    clearAuthSession();
    // Full load so header and other consumers re-read cleared auth from storage.
    window.location.assign("/");
  }, []);

  return (
    <aside className="pf-account__menu-shell">
      <div className="pf-account__sidebar-header">
        <h1 className="pf-account__title">Account</h1>
      </div>
      <nav className="pf-account__menu" aria-label="Account navigation">
        {menuItems.map((item) => {
          const isLogoutItem = item.key === "logout";
          const isActive = Boolean(item.path && item.path === pathname);
          return (
            <button
              type="button"
              key={item.key}
              className={`pf-account__menu-item${
                isActive ? " pf-account__menu-item--active" : ""
              }${isLogoutItem ? " pf-account__menu-item--logout" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                if (isLogoutItem) {
                  void handleLogout();
                  return;
                }
                if (item.path) {
                  navigate(item.path);
                }
              }}
            >
              <span className="pf-account__menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default AccountSidebar;
