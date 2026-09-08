import { useEffect, useMemo, useState } from "react";
import { CalenderIcon, PlusIcon, TrashIcon } from "../../../../assets/icons";
import { projectsService } from "../../../../services/projectsService";
import { useToast } from "../../../../context/ToastContext";
import { createToastNotify } from "../../../../utils/toastNotify";

type ConstructionInstallment = {
    id: number;
    percentage: string;
    date: string;
};

type PaymentOption = {
    id: number;
    planName: string;
    downPayment: string;
    duringConstruction: string;
    constructionInstallments: ConstructionInstallment[];
    handoverValue: string;
};

type EditPricePayProps = {
    projectId: string;
    project: Record<string, unknown>;
    onContinue?: () => void;
    primaryActionLabel?: string;
};

type FormState = {
    projectPrice: string;
    governmentFees: string;
    paymentOptions: PaymentOption[];
};

const toNumber = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
};

const toStringValue = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string") return value;
    return "";
};

const toFormState = (project: Record<string, unknown>): FormState => {
    const launchPrice = (project.launchPrice || {}) as Record<string, unknown>;
    const paymentPlans = Array.isArray(project.paymentPlans)
        ? (project.paymentPlans as Array<Record<string, unknown>>)
        : [];

    const mappedOptions: PaymentOption[] = paymentPlans.map((plan, index) => {
        const downPayment = (plan.downPayment || {}) as Record<string, unknown>;
        const duringConstruction = (plan.duringConstruction || {}) as Record<string, unknown>;
        const onHandover = (plan.onHandover || {}) as Record<string, unknown>;
        const installments = Array.isArray(duringConstruction.installments)
            ? (duringConstruction.installments as Array<Record<string, unknown>>)
            : [];

        return {
            id: index + 1,
            planName: toStringValue(plan.planName) || `Option ${index + 1}`,
            downPayment: toStringValue(downPayment.percentage),
            duringConstruction: toStringValue(duringConstruction.percentage),
            constructionInstallments: installments.map((item, itemIndex) => ({
                id: itemIndex + 1,
                percentage: toStringValue(item.percentage),
                date: toStringValue(item.date).slice(0, 10),
            })),
            handoverValue: toStringValue(onHandover.percentage),
        };
    });

    return {
        projectPrice: toStringValue(launchPrice.startingFrom),
        governmentFees: toStringValue(project.governmentFees),
        paymentOptions: mappedOptions.length
            ? mappedOptions
            : [
                {
                    id: 1,
                    planName: "Option 1",
                    downPayment: "",
                    duringConstruction: "",
                    constructionInstallments: [],
                    handoverValue: "",
                },
            ],
    };
};

const EditPricePay = ({ projectId, project, onContinue, primaryActionLabel = "Save changes" }: EditPricePayProps) => {
    const { push } = useToast();
    const toast = createToastNotify(push);
    const initialState = useMemo(() => toFormState(project), [project]);
    const [form, setForm] = useState<FormState>(initialState);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setForm(initialState);
    }, [initialState]);

    const updateOptionField = (
        optionId: number,
        field: "downPayment" | "duringConstruction" | "handoverValue",
        value: string
    ) => {
        setForm((prev) => ({
            ...prev,
            paymentOptions: prev.paymentOptions.map((option) =>
                option.id === optionId ? { ...option, [field]: value } : option
            ),
        }));
    };

    const updateConstructionInstallment = (
        optionId: number,
        installmentId: number,
        field: "percentage" | "date",
        value: string
    ) => {
        setForm((prev) => ({
            ...prev,
            paymentOptions: prev.paymentOptions.map((option) => {
                if (option.id !== optionId) return option;
                return {
                    ...option,
                    constructionInstallments: option.constructionInstallments.map((item) =>
                        item.id === installmentId ? { ...item, [field]: value } : item
                    ),
                };
            }),
        }));
    };

    const addInstallment = (optionId: number) => {
        setForm((prev) => ({
            ...prev,
            paymentOptions: prev.paymentOptions.map((option) => {
                if (option.id !== optionId) return option;
                return {
                    ...option,
                    constructionInstallments: [
                        ...option.constructionInstallments,
                        { id: option.constructionInstallments.length + 1, percentage: "", date: "" },
                    ],
                };
            }),
        }));
    };

    const deleteInstallment = (optionId: number, installmentId: number) => {
        setForm((prev) => ({
            ...prev,
            paymentOptions: prev.paymentOptions.map((option) => {
                if (option.id !== optionId) return option;
                return {
                    ...option,
                    constructionInstallments: option.constructionInstallments.filter(
                        (item) => item.id !== installmentId
                    ),
                };
            }),
        }));
    };

    const addPaymentOption = () => {
        setForm((prev) => ({
            ...prev,
            paymentOptions: [
                ...prev.paymentOptions,
                {
                    id: prev.paymentOptions.length + 1,
                    planName: `Option ${prev.paymentOptions.length + 1}`,
                    downPayment: "",
                    duringConstruction: "",
                    constructionInstallments: [],
                    handoverValue: "",
                },
            ],
        }));
    };

    const deletePaymentOption = (optionId: number) => {
        setForm((prev) => ({
            ...prev,
            paymentOptions: prev.paymentOptions.filter((option) => option.id !== optionId),
        }));
    };

    const onDiscard = () => {
        setForm(initialState);
    };

    const onSave = async () => {
        const projectPrice = toNumber(form.projectPrice);
        const governmentFees = toNumber(form.governmentFees);
        if (!(projectPrice > 0)) {
            toast.error("Validation required", "Project price must be a positive number.");
            return;
        }
        if (!(governmentFees >= 0)) {
            toast.error("Validation required", "Government fees must be zero or more.");
            return;
        }
        if (form.paymentOptions.length < 1) {
            toast.error("Validation required", "At least one payment plan is required.");
            return;
        }

        const payloadPaymentPlans = form.paymentOptions.map((option, index) => {
            const down = toNumber(option.downPayment);
            const during = toNumber(option.duringConstruction);
            const handover = toNumber(option.handoverValue);
            const total = down + during + handover;
            if (
                !(down >= 0) ||
                !(during >= 0) ||
                !(handover >= 0) ||
                Math.abs(total - 100) > 0.01
            ) {
                throw new Error(`Payment percentages for option ${index + 1} must sum to 100.`);
            }
            return {
                planName: option.planName || `Option ${index + 1}`,
                downPayment: { percentage: down },
                duringConstruction: {
                    percentage: during,
                    installments: option.constructionInstallments.map((item) => ({
                        percentage: toNumber(item.percentage) || 0,
                        date: item.date,
                    })),
                },
                onHandover: { percentage: handover },
            };
        });

        setIsSaving(true);
        try {
            await projectsService.updateProject(projectId, {
                launchPrice: {
                    startingFrom: projectPrice,
                    currency: "AED",
                },
                governmentFees,
                paymentPlans: payloadPaymentPlans,
            });
            toast.success("Price updated", "Price and payment plan updated successfully.");
            onContinue?.();
        } catch (error: unknown) {
            const message =
                (error as { message?: string })?.message || "Failed to update price and payment plan.";
            toast.error("Update failed", message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            {/* project price */}
            <div className="bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Project price</h3>
                <div className="flex flex-col gap-[12px]">
                    <div>
                        <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                            Project Price <span className="text-[#EA3934]">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter the property price"
                            value={form.projectPrice}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, projectPrice: event.target.value }))
                            }
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                            Government Fees <span className="text-[#EA3934]">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Government Fees"
                            value={form.governmentFees}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, governmentFees: event.target.value }))
                            }
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* payment plan */}
            <div className="bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Payment Plan</h3>

                <div className="flex flex-col gap-[12px]">
                    {form.paymentOptions.map((option) => (
                        <div key={option.id} className="">
                            <div className="flex items-center justify-between gap-3 mb-[10px]">
                                <p className="text-[14px] font-[Regular] text-[#222]">Option {option.id}</p>
                                <button
                                    type="button"
                                    onClick={() => deletePaymentOption(option.id)}
                                    className="cursor-pointer  bg-white flex items-center justify-center"
                                >
                                    <TrashIcon width={20} height={20} fill="#EA3934" />
                                </button>
                            </div>
                            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[20px] p-[15px]">
                                {/* down payment and during construction */}
                                <div className="flex flex-col gap-[8px]">
                                    <div className="grid md:grid-cols-[170px_1fr] grid-cols-1 gap-[8px]">
                                        <div className="h-[44px] rounded-[8px] bg-[rgba(34,34,34,0.10)] px-[15px] text-[13px] text-[#222] font-[Medium] flex items-center">
                                            Down payment
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={option.downPayment}
                                                onChange={(e) => updateOptionField(option.id, "downPayment", e.target.value)}
                                                placeholder="Enter the percentage"
                                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] pr-[24px] text-[13px] font-[Medium] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Medium] focus:outline-none"
                                            />
                                            <span className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[12px] text-[#707070] font-[SemiBold]">%</span>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-[170px_1fr] grid-cols-1 gap-[8px]">
                                        <div className="h-[44px] rounded-[8px] bg-[rgba(34,34,34,0.10)] px-[15px] text-[13px] text-[#222] font-[Medium] flex items-center">
                                            During Construction
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={option.duringConstruction}
                                                onChange={(e) =>
                                                    updateOptionField(option.id, "duringConstruction", e.target.value)
                                                }
                                                placeholder="Enter the percentage"
                                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] pr-[24px] text-[13px] font-[Medium] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Medium] focus:outline-none"
                                            />
                                            <span className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[12px] text-[#707070] font-[SemiBold]">%</span>
                                        </div>
                                    </div>
                                </div>
                                {/* construction installments */}
                                <div className="grid md:grid-cols-[170px_auto] grid-cols-1 gap-[8px]">
                                    <div></div>
                                    {option.constructionInstallments.length > 0 && (
                                        <div className=" mt-[10px] rounded-[10px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[12px_24px] p-[10px_15px] flex flex-col gap-[8px]">
                                            {option.constructionInstallments.map((item, index) => (
                                                <div key={item.id} className=" grid md:grid-cols-[80px_auto] grid-cols-1 gap-[8px] items-center">
                                                    <h2 className="text-[13px] text-[#222] font-[Regular]">Installment {index + 1}</h2>
                                                    <div className="w-full flex align-center gap-[8px]">
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={item.percentage}
                                                                onChange={(e) =>
                                                                    updateConstructionInstallment(
                                                                        option.id,
                                                                        item.id,
                                                                        "percentage",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="00"
                                                                className="h-[44px] md:w-[88px] w-[70px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] pr-[24px] text-[13px] font-[Medium] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Medium] focus:outline-none"
                                                            />
                                                            <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[12px] text-[#707070] font-[SemiBold]">%</span>
                                                        </div>
                                                        <div className="w-full gap-[8px]">
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={item.date}
                                                                    onChange={(e) =>
                                                                        updateConstructionInstallment(option.id, item.id, "date", e.target.value)
                                                                    }
                                                                    placeholder="Select"
                                                                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] pr-[24px] text-[13px] font-[Medium] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Medium] focus:outline-none"
                                                                />
                                                                <span className="absolute right-[8px] top-1/2 -translate-y-1/2">
                                                                    <CalenderIcon width={14} height={14} />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteInstallment(option.id, item.id)}
                                                            className="flex-shrink-0 w-[44px] h-[44px] bg-[#F5F5F5] rounded-[10px] flex items-center justify-center cursor-pointer"
                                                        >
                                                            <TrashIcon width={20} height={20} fill="#222222" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* add installment during construction */}
                                <div className="grid md:grid-cols-[170px_auto] grid-cols-1 gap-[8px]">
                                    <div></div>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => addInstallment(option.id)}
                                            className="cursor-pointer w-auto mt-[8px] h-[23px] rounded-[5px] px-[8px] bg-[rgba(8,50,174,0.10)] text-[#0832AE] text-[12px] font-[SemiBold] inline-flex items-center gap-[5px]"
                                        >
                                            <PlusIcon width={12} height={12} fill="#0832AE" />
                                            Add installment during construction
                                        </button>
                                    </div>
                                </div>
                                {/* on handover */}
                                <div className="mt-[10px] grid grid-cols-[170px_1fr] gap-[8px]">
                                    <div className="h-[44px] rounded-[8px] bg-[rgba(34,34,34,0.10)] px-[15px] text-[13px] text-[#222] font-[Medium] flex items-center">
                                        On handover
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={option.handoverValue}
                                            onChange={(e) => updateOptionField(option.id, "handoverValue", e.target.value)}
                                            placeholder="Enter the percentage"
                                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] pr-[24px] text-[13px] font-[Medium] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Medium] focus:outline-none"
                                        />
                                        <span className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[12px] text-[#707070] font-[SemiBold]">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addPaymentOption}
                    className="cursor-pointer mt-[12px] w-full h-[56px] rounded-[10px] border border-dashed border-[rgba(34,34,34,0.16)] text-[#0832AE] text-[13px] font-[SemiBold] inline-flex items-center justify-center gap-[7px]"
                >
                    <PlusIcon width={13} height={13} fill="#0832AE" />
                    Add another payment option
                </button>
            </div>
            <div className="flex items-center justify-end gap-[10px] mt-[30px]">
                <button
                    type="button"
                    onClick={onDiscard}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222]  text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className={`h-[44px] rounded-[10px] px-[20px] text-[14px] font-[Bold] inline-flex items-center gap-[5px] ${isSaving ? "bg-[#EA3934]/50 text-[#FFF] cursor-not-allowed" : "bg-[#EA3934] text-[#FFF] cursor-pointer"}`}
                >
                    {isSaving ? "Saving..." : primaryActionLabel}
                </button>
            </div>
        </div>
    );
};

export default EditPricePay; 
