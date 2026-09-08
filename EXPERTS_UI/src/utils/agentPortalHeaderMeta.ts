/**
 * Page title + back affordance for the global agent shell header (`AgentIndex`).
 * Match the copy used by individual screens before the header was centralized.
 */
export function getAgentPortalHeaderMeta(pathname: string): { title: string; showBack: boolean } {
    if (pathname.startsWith("/agent/properties-management-details/")) {
        return { title: "Property details", showBack: true };
    }
    if (pathname === "/agent/properties-management/edit" || pathname === "/agent/properties-management/edit-property") {
        return { title: "Edit property", showBack: true };
    }
    if (pathname === "/agent/properties-management/add-property") {
        return { title: "Add Property", showBack: true };
    }
    if (pathname === "/agent/properties-management") {
        return { title: "Properties Management", showBack: false };
    }

    if (pathname.startsWith("/agent/leads/property-details/")) {
        return { title: "Leads detail", showBack: true };
    }
    if (pathname.startsWith("/agent/leads/project-details/")) {
        return { title: "Leads detail", showBack: true };
    }
    if (pathname === "/agent/leads/view-project-details") {
        return { title: "Project details", showBack: true };
    }
    if (pathname === "/agent/leads/property") {
        return { title: "Leads Management", showBack: false };
    }
    if (pathname === "/agent/leads/project") {
        return { title: "Project leads", showBack: false };
    }

    if (pathname === "/agent/allocated/project-unit-details") {
        return { title: "Unit detail", showBack: true };
    }
    if (pathname === "/agent/allocated/project-units") {
        return { title: "Units", showBack: true };
    }
    if (pathname === "/agent/allocated/project-details") {
        return { title: "Project details", showBack: true };
    }
    if (pathname === "/agent/allocated/project") {
        return { title: "Allocated project", showBack: false };
    }
    if (pathname === "/agent/allocated/property") {
        return { title: "Allocated property", showBack: false };
    }

    if (pathname === "/agent/profile") {
        return { title: "Your profile", showBack: false };
    }
    if (pathname === "/agent/dashboard") {
        return { title: "Dashboard", showBack: false };
    }

    return { title: "Portal", showBack: false };
}
