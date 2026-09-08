import OtherDetailsStep, {
    type OtherDetailsFormValue,
} from "../AddProperty/AddProjectComponents/OtherDetailsStep";
import { useLocation } from "react-router-dom";

type EditOtherDetailsProps = {
    listingTransaction: string;
    value: OtherDetailsFormValue;
    onChange: (value: OtherDetailsFormValue) => void;
    onDiscard: () => void;
    onSave: () => void;
    isSaving: boolean;
};

const EditOtherDetails = ({
    listingTransaction,
    value,
    onChange,
    onDiscard,
    onSave,
    isSaving,
}: EditOtherDetailsProps) => {
    const location = useLocation();
    const isEditpath = location.pathname.includes("/agent/properties-management/edit-property");
    return (
        <div>
            <div className={`bg-white ${isEditpath ? "rounded-b-[15px]" : ""}`}>
                <OtherDetailsStep
                    listingTransaction={listingTransaction}
                    value={value}
                    onChange={onChange}
                />
            </div>
            <div className="flex items-center justify-end gap-[10px] mt-[30px]">
                <button
                    type="button"
                    onClick={onDiscard}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222] text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#D4A373] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save changes"}
                </button>
            </div>
        </div>
    );
};

export default EditOtherDetails;
