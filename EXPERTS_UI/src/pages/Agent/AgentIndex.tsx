import { useCallback, useEffect, useMemo, useState } from "react";
import { matchPath, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/AgentLayout/AgentSidebar";
import AgentHeader from "../../components/Header/AgentHeader";
import { AgentLayoutContext } from "../../context/AgentLayoutContext";
import {
    normalizeAppPathname,
    resolveAgentShellHeaderMeta,
} from "../../components/AgentLayout/agentShellHeaderMeta";
import {
    agentService,
    type AgentProfileData,
    type AgentSupportedUrlsMasterData,
} from "../../services/agentService";
import { API_BASE_URL } from "../../services/apiClient";
import { buildProfilePictureUrl } from "../../utils/agentProfileMedia";

const extractAgentImageBase = (data: AgentSupportedUrlsMasterData | null, defaultOrigin: string): string => {
    const fallback = `${defaultOrigin}/uploads/img/agents/`;
    if (!data) return fallback.replace(/\/?$/, "/");
    const source =
        (data.supportedUrls as Record<string, unknown>) ||
        (data.supportedurls as Record<string, unknown>) ||
        {};
    const agentUrl =
        (source.agentUrl as Record<string, unknown>) ||
        (source.agenturl as Record<string, unknown>) ||
        {};
    return String(agentUrl.img || fallback).replace(/\/?$/, "/");
};

function AgentIndex() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isNotificationHidden, setIsNotificationHidden] = useState(false);
    const [isToggleVisible, setIsToggleVisible] = useState(false);

    const [headerProfileImage, setHeaderProfileImage] = useState<string | null>(null);
    const [headerVerified, setHeaderVerified] = useState(false);
    const [headerAgentType, setHeaderAgentType] = useState<"agent" | "superagent">("agent");

    const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

    const loadHeaderProfile = useCallback(async () => {
        try {
            const [urlsRes, profile] = await Promise.all([
                agentService.getSupportedUrlsMasterData().catch(() => null),
                agentService.getProfile(),
            ]);
            const imgBase = extractAgentImageBase(urlsRes, defaultOrigin);
            const p = profile as AgentProfileData;
            setHeaderProfileImage(buildProfilePictureUrl(imgBase, p.profilePicture));
            setHeaderVerified(Boolean(p.isVerified));
            setHeaderAgentType(String(p.agentType ?? "").toLowerCase() === "superagent" ? "superagent" : "agent");
        } catch {
            setHeaderProfileImage(null);
            setHeaderVerified(false);
            setHeaderAgentType("agent");
        }
    }, [defaultOrigin]);

    useEffect(() => {
        void loadHeaderProfile();
    }, [loadHeaderProfile]);

    const shellMeta = useMemo(
        () => resolveAgentShellHeaderMeta(location.pathname),
        [location.pathname]
    );

    const isAgentDashboardRoute = Boolean(
        matchPath({ path: "/agent/dashboard", end: true }, normalizeAppPathname(location.pathname))
    );

    const layoutValue = useMemo(
        () => ({
            refreshAgentHeader: loadHeaderProfile,
            shellHeader: {
                profileImage: headerProfileImage,
                verified: headerVerified,
                agentType: headerAgentType,
            },
        }),
        [loadHeaderProfile, headerProfileImage, headerVerified, headerAgentType]
    );

    useEffect(() => {
        const checkNotificationVisibility = () => {
            const notificationDiv = document.querySelector(".verifynoti_div");
            if (notificationDiv) {
                const isHidden = notificationDiv.classList.contains("hidden");
                setIsNotificationHidden(isHidden);
            }
        };

        checkNotificationVisibility();

        const observer = new MutationObserver(checkNotificationVisibility);
        const notificationDiv = document.querySelector(".verifynoti_div");

        if (notificationDiv) {
            observer.observe(notificationDiv, {
                attributes: true,
                attributeFilter: ["class"],
            });
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const checkToggleVisibility = () => {
            const headertoogle_div = document.querySelector(".headertoogle_div");
            if (headertoogle_div) {
                const computedStyle = window.getComputedStyle(headertoogle_div);
                const isVisible = computedStyle.display !== "none";
                setIsToggleVisible(isVisible);
            }
        };

        const timeoutId = setTimeout(() => {
            checkToggleVisibility();
        }, 100);

        window.addEventListener("resize", checkToggleVisibility);

        const observer = new MutationObserver(checkToggleVisibility);
        const headertoogle_div = document.querySelector(".headertoogle_div");

        if (headertoogle_div) {
            observer.observe(headertoogle_div, {
                attributes: true,
                attributeFilter: ["class"],
            });
        }

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
            window.removeEventListener("resize", checkToggleVisibility);
        };
    }, []);

    return (
        <AgentLayoutContext.Provider value={layoutValue}>
            <div className="flex min-h-screen bg-[#F5F5F5] lg:mt-0 mt-[70px]">
                <Sidebar />
                <div className="flex w-full min-w-0 flex-col lg:pl-[270px] xl:pl-[290px]">
                    {!isAgentDashboardRoute ? (
                        <div className="shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
                            <AgentHeader
                                title={shellMeta.title}
                                showBack={shellMeta.showBack}
                                onBackClick={() => {
                                    if (shellMeta.showBack) navigate(-1);
                                }}
                                profileImage={headerProfileImage ?? undefined}
                                verified={headerVerified}
                                agentType={headerAgentType}
                            />
                        </div>
                    ) : null}
                    <main
                        className={`min-w-0 flex-1 bg-[#F5F5F5] ${isNotificationHidden ? "pt-[66px]" : ""} ${isToggleVisible ? "pt-[120px]" : ""
                            }`}
                    >
                        <div className="">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </AgentLayoutContext.Provider>
    );
}

export default AgentIndex;
