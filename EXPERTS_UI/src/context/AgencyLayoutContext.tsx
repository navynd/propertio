import { createContext, useContext } from "react";

export type AgencyShellHeaderSnapshot = {
  profileImage: string | null;
  verified: boolean;
};

export type AgencyLayoutContextValue = {
  /** Re-fetch agency profile for the shell header (avatar, verified). */
  refreshAgencyHeader: () => Promise<void>;
  /** Same avatar / verified as the shell header — use across agency pages. */
  shellHeader: AgencyShellHeaderSnapshot;
};

export const AgencyLayoutContext = createContext<AgencyLayoutContextValue>({
  refreshAgencyHeader: async () => {},
  shellHeader: { profileImage: null, verified: false },
});

export function useAgencyLayout() {
  return useContext(AgencyLayoutContext);
}
