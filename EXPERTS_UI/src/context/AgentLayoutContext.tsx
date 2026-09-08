import { createContext, useContext } from "react";

export type AgentShellHeaderSnapshot = {
    profileImage: string | null;
    verified: boolean;
    agentType: "agent" | "superagent";
};

export type AgentLayoutContextValue = {
    /** Re-fetch agent profile for the shell header (avatar, verified, type). */
    refreshAgentHeader: () => Promise<void>;
    /** Same avatar / verified / type as the shell header; use on dashboard in-card header. */
    shellHeader: AgentShellHeaderSnapshot;
};

export const AgentLayoutContext = createContext<AgentLayoutContextValue>({
    refreshAgentHeader: async () => {},
    shellHeader: { profileImage: null, verified: false, agentType: "agent" },
});

export function useAgentLayout() {
    return useContext(AgentLayoutContext);
}
