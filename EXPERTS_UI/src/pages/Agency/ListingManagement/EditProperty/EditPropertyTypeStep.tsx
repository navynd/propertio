import PropertyTypeStep from "./components/PropertyTypeStep";
import PropertyDetailsStep, {
    type PropertyDetailsFormValue,
} from "./components/PropertyDetailsStep";
import { useLocation } from "react-router-dom";
type EditPropertyTypeStepProps = {
    listingTypeId: string;
    propertyTypeId: string;
    onListingTypeChange: (id: string) => void;
    onPropertyTypeChange: (id: string) => void;
    onListingTransactionChange: (transaction: string) => void;
    propertyDetails: PropertyDetailsFormValue;
    onPropertyDetailsChange: (value: PropertyDetailsFormValue) => void;
    onDiscard: () => void;
    onSave: () => void;
    isSaving: boolean;
};

const EditPropertyTypeStep = ({
    listingTypeId,
    propertyTypeId,
    onListingTypeChange,
    onPropertyTypeChange,
    onListingTransactionChange,
    propertyDetails,
    onPropertyDetailsChange,
    onDiscard,
    onSave,
    isSaving,
}: EditPropertyTypeStepProps) => {
    const location = useLocation();
    const isEditpath = location.pathname.includes("/agency/listings/edit-property");
    return (
        <div>
            <div className={`bg-white min-w-0 overflow-hidden ${isEditpath ? "rounded-b-[15px]" : ""}`}>
                <div className="border-b border-[rgba(34,34,34,0.08)]">
                    <PropertyTypeStep
                        listingTypeId={listingTypeId}
                        propertyTypeId={propertyTypeId}
                        onListingTypeChange={onListingTypeChange}
                        onPropertyTypeChange={onPropertyTypeChange}
                        onListingTransactionChange={onListingTransactionChange}
                    />
                </div>
                <div className="">
                    <PropertyDetailsStep value={propertyDetails} onChange={onPropertyDetailsChange} />
                </div>
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
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save changes"}
                </button>
            </div>
        </div>
    );
};

export default EditPropertyTypeStep;
