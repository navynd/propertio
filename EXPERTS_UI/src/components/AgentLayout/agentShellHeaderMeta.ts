import { matchPath } from "react-router-dom";

export type AgentShellHeaderMeta = {
    title: string;
    showBack: boolean;
};

/**
 * Route → title / back affordance for the global agent shell header.
 * More specific paths must appear before prefixes they would otherwise match.
 */
const AGENT_HEADER_ROUTES: Array<{ path: string; title: string; showBack: boolean }> = [
    { path: "/agent/properties-management-details/:id", title: "Property details", showBack: true },
    { path: "/agent/properties-management/edit-property", title: "Edit property", showBack: true },
    { path: "/agent/properties-management/edit", title: "Edit property", showBack: true },
    { path: "/agent/properties-management/add-property", title: "Add Property", showBack: true },
    { path: "/agent/properties-management", title: "Properties Management", showBack: false },
    { path: "/agent/allocated/project-unit-details", title: "Unit detail", showBack: true },
    { path: "/agent/allocated/project-units", title: "Units", showBack: true },
    { path: "/agent/allocated/project-details", title: "Project details", showBack: true },
    { path: "/agent/allocated/project", title: "Allocated project", showBack: false },
    { path: "/agent/allocated/property", title: "Allocated property", showBack: false },
    { path: "/agent/leads/property-details/:id", title: "Leads detail", showBack: true },
    { path: "/agent/leads/project-details/:id", title: "Leads detail", showBack: true },
    { path: "/agent/leads/view-project-details", title: "Project details", showBack: true },
    { path: "/agent/leads/property", title: "Leads Management", showBack: false },
    { path: "/agent/leads/project", title: "Project leads", showBack: false },
    { path: "/agent/profile", title: "Your profile", showBack: false },
    { path: "/agent/notification", title: "Notification", showBack: false },
    { path: "/agent/dashboard", title: "Dashboard", showBack: false },
];

/** Strip app basename prefix when present (e.g. `/experts/agent/...` → `/agent/...`). */
export function normalizeAppPathname(pathname: string): string {
    const trimmed = pathname.replace(/^\/experts(?=\/|$)/, "") || "/";
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function resolveAgentShellHeaderMeta(pathname: string): AgentShellHeaderMeta {
    const path = normalizeAppPathname(pathname);
    for (const row of AGENT_HEADER_ROUTES) {
        if (matchPath({ path: row.path, end: true }, path)) {
            return { title: row.title, showBack: row.showBack };
        }
    }
    return { title: "Agent", showBack: false };
}
