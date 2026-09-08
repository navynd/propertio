import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import Loader from "../../components/Loader/loader";
import { useToast } from "../../context/ToastContext";
import { useSystemSettings } from "../../context/SystemSettingsContext";
import { systemSettingsService, type CurrencyEntry } from "../../services/systemSettingsService";
import { getApiErrorMessage } from "../../services/apiClient";
import { inputClass, sectionClass, sectionTitleClass, labelClass } from "../CMSManagement/shared/CmsFormShared";

function CurrencyManagement() {
  const { push } = useToast();
  const { updateSettings } = useSystemSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyEntry[]>([]);

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const data = await systemSettingsService.getSettings();
        if (active) {
          setCurrencies(data.currencies || []);
        }
      } catch (error) {
        push({
          type: "error",
          title: "Error Loading Currencies",
          description: getApiErrorMessage(error, "Failed to retrieve currency configuration.")
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchSettings();
    return () => { active = false; };
  }, [push]);

  const handleAddField = () => {
    const newCurrency: CurrencyEntry = {
      code: "",
      symbol: "",
      exchangeRate: 1.0,
      isDefault: currencies.length === 0, // default if it's the first currency
      isActive: true
    };
    setCurrencies(prev => [...prev, newCurrency]);
  };

  const handleRemoveField = (index: number) => {
    const target = currencies[index];
    if (target.isDefault) {
      push({
        type: "error",
        title: "Cannot Delete Default",
        description: "Please assign another currency as the default first."
      });
      return;
    }
    setCurrencies(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateField = <K extends keyof CurrencyEntry>(index: number, key: K, value: CurrencyEntry[K]) => {
    setCurrencies(prev => prev.map((entry, idx) => {
      if (idx !== index) return entry;
      const updated = { ...entry, [key]: value };

      // If setting this currency as default, unset other defaults
      if (key === "isDefault" && value === true) {
        // Also force it to be active
        updated.isActive = true;
      }
      return updated;
    }));

    if (key === "isDefault" && value === true) {
      setCurrencies(prev => prev.map((entry, idx) => {
        if (idx === index) return { ...entry, isDefault: true, isActive: true };
        return { ...entry, isDefault: false };
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (currencies.length === 0) {
      push({
        type: "error",
        title: "Validation Error",
        description: "You must configure at least one currency."
      });
      return;
    }

    const hasDefault = currencies.some(c => c.isDefault);
    if (!hasDefault) {
      push({
        type: "error",
        title: "Validation Error",
        description: "Please select one currency as the default currency."
      });
      return;
    }

    const hasEmptyCodeOrSymbol = currencies.some(c => !c.code.trim() || !c.symbol.trim());
    if (hasEmptyCodeOrSymbol) {
      push({
        type: "error",
        title: "Validation Error",
        description: "Currency code and symbol are required fields for all rows."
      });
      return;
    }

    setSaving(true);
    try {
      const cleaned = currencies.map(c => ({
        ...c,
        code: c.code.trim().toUpperCase(),
        symbol: c.symbol.trim(),
        exchangeRate: Number(c.exchangeRate) || 1.0
      }));

      const updated = await systemSettingsService.saveSettings({ currencies: cleaned });
      updateSettings(updated);
      setCurrencies(cleaned);

      push({
        type: "success",
        title: "Currencies Saved",
        description: "System currency exchange matrix updated successfully."
      });
    } catch (error) {
      push({
        type: "error",
        title: "Failed to Save Currencies",
        description: getApiErrorMessage(error, "An error occurred while saving.")
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] p-[20px] lg:p-[40px] overflow-y-auto">
      <Header title="Currency Management" />

      <form onSubmit={handleSave} className="flex flex-col gap-[20px] max-w-[900px] mt-[20px]">
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-[20px]">
            <h3 className="text-[18px] font-[Bold] text-[#222]">Currency Conversion Matrix</h3>
            <button
              type="button"
              onClick={handleAddField}
              className="px-[16px] py-[8px] bg-[#EAEAEA] text-[#222] rounded-[8px] text-[12px] font-[Bold] hover:bg-[#DDD] transition cursor-pointer"
            >
              + Add Currency
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0F0F0] text-[#707070] text-[13px] font-[SemiBold]">
                  <th className="pb-[12px] w-[120px]">Code</th>
                  <th className="pb-[12px] w-[100px]">Symbol</th>
                  <th className="pb-[12px]">Exchange Rate</th>
                  <th className="pb-[12px] w-[100px] text-center">Default</th>
                  <th className="pb-[12px] w-[100px] text-center">Status</th>
                  <th className="pb-[12px] w-[80px] text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency, index) => (
                  <tr key={index} className="border-b border-[#F7F7F7] last:border-b-0 text-[13px] text-[#222]">
                    <td className="py-[10px] pr-[10px]">
                      <input
                        type="text"
                        value={currency.code}
                        onChange={(e) => handleUpdateField(index, "code", e.target.value)}
                        placeholder="USD"
                        className={`${inputClass} uppercase`}
                        maxLength={5}
                        required
                      />
                    </td>
                    <td className="py-[10px] pr-[10px]">
                      <input
                        type="text"
                        value={currency.symbol}
                        onChange={(e) => handleUpdateField(index, "symbol", e.target.value)}
                        placeholder="$"
                        className={inputClass}
                        maxLength={5}
                        required
                      />
                    </td>
                    <td className="py-[10px] pr-[10px]">
                      <input
                        type="number"
                        step="any"
                        value={currency.exchangeRate}
                        onChange={(e) => handleUpdateField(index, "exchangeRate", parseFloat(e.target.value) || 0)}
                        placeholder="1.0"
                        className={inputClass}
                        required
                      />
                    </td>
                    <td className="py-[10px] text-center">
                      <input
                        type="radio"
                        checked={currency.isDefault}
                        onChange={() => handleUpdateField(index, "isDefault", true)}
                        className="w-[18px] h-[18px] cursor-pointer accent-[#1F3D51]"
                      />
                    </td>
                    <td className="py-[10px] text-center">
                      <input
                        type="checkbox"
                        checked={currency.isActive}
                        disabled={currency.isDefault}
                        onChange={(e) => handleUpdateField(index, "isActive", e.target.checked)}
                        className="w-[18px] h-[18px] cursor-pointer disabled:opacity-50 accent-[#1F3D51]"
                      />
                    </td>
                    <td className="py-[10px] text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveField(index)}
                        disabled={currency.isDefault}
                        className="text-[#EA3934] font-[Bold] hover:underline disabled:opacity-50 disabled:no-underline text-[12px] cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {currencies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-[30px] text-center text-[#707070] italic">
                      No currencies configured. Click "+ Add Currency" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-[44px] px-[28px] rounded-[10px] text-[#fff] text-[14px] font-[Bold] cursor-pointer theme-primary-button disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CurrencyManagement;
