import type { AgentCountryMasterItem } from "../services/agentService";

/** Country row for phone dial UI (master `countries` + display). */
export type PhoneCountryRow = {
    id: string;
    name: string;
    code: string;
    dialCode: string;
    flag: string;
    displayOrder: number;
};

export function normalizeDialCode(raw?: string | null): string {
    const t = String(raw ?? "").trim();
    if (!t) return "";
    return t.startsWith("+") ? t : `+${t}`;
}

export function mapAgentCountryToPhoneRow(c: AgentCountryMasterItem): PhoneCountryRow {
    const code = String(c.code ?? "").trim().toUpperCase();
    const flag =
        (c.flag && String(c.flag).trim()) ||
        (code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : "");
    return {
        id: String(c._id),
        name: String(c.name ?? "").trim() || code,
        code,
        dialCode: normalizeDialCode(c.phoneCode),
        flag,
        displayOrder: typeof c.displayOrder === "number" ? c.displayOrder : 9999,
    };
}

export function sortPhoneCountryRows(list: PhoneCountryRow[]): PhoneCountryRow[] {
    return [...list].sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.name.localeCompare(b.name);
    });
}
