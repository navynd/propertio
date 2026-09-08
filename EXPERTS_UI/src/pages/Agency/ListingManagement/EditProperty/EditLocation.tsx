import LocationAdd, {
    type PropertyLocationFormValue,
} from "../../../Agent/PropertiesManagement/AddProperty/AddProjectComponents/LocationAdd";

type EditLocationProps = {
    value: PropertyLocationFormValue;
    onChange: (value: PropertyLocationFormValue) => void;
    propertyAddress: string;
    propertyAddressPlaceId: string;
    onDiscard: () => void;
    onSave: () => void;
    isSaving: boolean;
};

const EditLocation = ({
    value,
    onChange,
    propertyAddress,
    propertyAddressPlaceId,
    onDiscard,
    onSave,
    isSaving,
}: EditLocationProps) => {
    return (
        <div>
            <div className="">
                <LocationAdd
                    value={value}
                    onChange={onChange}
                    propertyAddress={propertyAddress}
                    propertyAddressPlaceId={propertyAddressPlaceId}
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
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save changes"}
                </button>
            </div>
        </div>
    );
};

export default EditLocation;
