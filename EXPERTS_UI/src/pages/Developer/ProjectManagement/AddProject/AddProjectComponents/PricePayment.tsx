import { useEffect, useRef, useState } from "react";
import { CalenderIcon, LeftArrowIcon, PlusIcon, RightArrowIcon, TrashIcon } from "../../../../../components/CustomFile/icons";

export type ConstructionInstallmentForm = {
    id: number;
    percentage: string;
    date: string;
};

export type PaymentOptionForm = {
    id: number;
    downPayment: string;
    duringConstruction: string;
    handoverValue: string;
    constructionInstallments: ConstructionInstallmentForm[];
};

export type PricePaymentFormValue = {
    projectPrice: string;
    governmentFees: string;
    paymentOptions: PaymentOptionForm[];
};

type PricePaymentProps = {
    value: PricePaymentFormValue;
    onChange: (value: PricePaymentFormValue) => void;
};

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

const monthTitle = (date: Date) =>
    `${date.toLocaleString("en-US", { month: "long" })}(${date.getFullYear()})`;

const getCalendarCells = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];

    for (let i = 0; i < firstDayIndex; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(day);
    while (cells.length < 42) cells.push(null);
    return cells;
};

const parseDateValue = (value: string) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const PricePayment = ({ value, onChange }: PricePaymentProps) => {
    const paymentOptions = value.paymentOptions;
    const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date());
    const datePickerRef = useRef<HTMLDivElement | null>(null);
    const calendarCells = getCalendarCells(displayMonth);
    const [installmentDateError, setInstallmentDateError] = useState<string | null>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setActiveDatePicker(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateOptionField = (
        optionId: number,
        field: "downPayment" | "duringConstruction" | "handoverValue",
        nextValue: string
    ) => {
        onChange({
            ...value,
            paymentOptions: paymentOptions.map((option) =>
                option.id === optionId ? { ...option, [field]: nextValue } : option
            ),
        });
    };

    const updateConstructionInstallment = (
        optionId: number,
        installmentId: number,
        field: "percentage" | "date",
        nextValue: string
    ) => {
        onChange({
            ...value,
            paymentOptions: paymentOptions.map((option) => {
                if (option.id !== optionId) return option;
                return {
                    ...option,
                    constructionInstallments: option.constructionInstallments.map((item) =>
                        item.id === installmentId ? { ...item, [field]: nextValue } : item
                    ),
                };
            }),
        });
    };

    const addInstallment = (optionId: number) => {
        onChange({
            ...value,
            paymentOptions: paymentOptions.map((option) => {
                if (option.id !== optionId) return option;
                return {
                    ...option,
                    constructionInstallments: [
                        ...option.constructionInstallments,
                        { id: option.constructionInstallments.length + 1, percentage: "", date: "" },
                    ],
                };
            }),
        });
    };

    const deleteInstallment = (optionId: number, installmentId: number) => {
        onChange({
            ...value,
            paymentOptions: paymentOptions.map((option) => {
                if (option.id !== optionId) return option;
                return {
                    ...option,
                    constructionInstallments: option.constructionInstallments.filter(
                        (item) => item.id !== installmentId
                    ),
                };
            }),
        });
    };

    const addPaymentOption = () => {
        onChange({
            ...value,
            paymentOptions: [
                ...paymentOptions,
                {
                    id: paymentOptions.length + 1,
                    downPayment: "",
                    duringConstruction: "",
                    constructionInstallments: [],
                    handoverValue: "",
                },
            ],
        });
    };

    const deletePaymentOption = (optionId: number) => {
        onChange({
            ...value,
            paymentOptions: paymentOptions.filter((option) => option.id !== optionId),
        });
    };

    const getPickerId = (optionId: number, installmentId: number) =>
        `${optionId}-${installmentId}`;

    const openDatePicker = (optionId: number, installmentId: number, selectedDate: string) => {
        const pickerId = getPickerId(optionId, installmentId);
        setActiveDatePicker((prev) => (prev === pickerId ? null : pickerId));
        const sourceDate = parseDateValue(selectedDate);
        setDisplayMonth(new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));
    };

    const selectDate = (
        optionId: number,
        installmentId: number,
        day: number
    ) => {
        const selectedDate = new Date(
            displayMonth.getFullYear(),
            displayMonth.getMonth(),
            day
        );

        const currentOption = paymentOptions.find(
            (option) => option.id === optionId
        );

        if (!currentOption) return;

        const installmentIndex =
            currentOption.constructionInstallments.findIndex(
                (item) => item.id === installmentId
            );

        const previousInstallment =
            currentOption.constructionInstallments[installmentIndex - 1];

        const nextInstallment =
            currentOption.constructionInstallments[installmentIndex + 1];

        // check previous installment
        if (previousInstallment?.date) {
            const prevDate = new Date(previousInstallment.date);

            if (selectedDate <= prevDate) {
                setInstallmentDateError(
                    `Installment ${installmentIndex + 1
                    } date must be greater than Installment ${installmentIndex}`
                );

                return;
            }
        }

        // check next installment
        if (nextInstallment?.date) {
            const nextDate = new Date(nextInstallment.date);

            if (selectedDate >= nextDate) {
                setInstallmentDateError(
                    `Installment ${installmentIndex + 1
                    } date must be less than Installment ${installmentIndex + 2}`
                );

                return;
            }
        }

        // clear error
        setInstallmentDateError(null);

        updateConstructionInstallment(
            optionId,
            installmentId,
            "date",
            formatDisplayDate(selectedDate)
        );

        setActiveDatePicker(null);
    };
    // const selectDate = (optionId: number, installmentId: number, day: number) => {
    //     const selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    //     updateConstructionInstallment(optionId, installmentId, "date", formatDisplayDate(selectedDate));
    //     setActiveDatePicker(null);
    // };

    const shiftMonth = (direction: -1 | 1) => {
        setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    return (
        <div ref={datePickerRef}>
            {/* project price */}
            <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Project price</h3>
                <div className="flex flex-col gap-[12px]">
                    <div>
                        <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                            Project Price <span className="text-[#D4A373]">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter the property price"
                            value={value.projectPrice}
                            // onChange={(e) => onChange({ ...value, projectPrice: e.target.value })}
                            onChange={(e) => {
                                const input = e.target.value.replace(/\D/g, "");
                                onChange({ ...value, projectPrice: input });
                            }}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                            Government Fees <span className="text-[#D4A373]">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Government Fees"
                                value={value.governmentFees}
                                // onChange={(e) => onChange({ ...value, governmentFees: e.target.value })}
                                onChange={(e) => {
                                    const input = e.target.value.replace(/\D/g, "");

                                    if (input === "") {
                                        onChange({ ...value, governmentFees: "" });
                                        return;
                                    }

                                    const number = Number(input);

                                    if (number >= 1 && number <= 100) {
                                        onChange({ ...value, governmentFees: input });
                                    }
                                }}
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none"
                            />
                            <span className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[12px] text-[#707070] font-[SemiBold]">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* payment plan */}
            <div className="mt-[20px] rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">
                    Payment Plan <span className="text-[#D4A373]">*</span>
                </h3>

                <div className="flex flex-col gap-[12px]">
                    {paymentOptions.map((option) => (
                        <div key={option.id} className="">
                            <div className="flex items-center justify-between gap-3 mb-[10px]">
                                <p className="text-[14px] font-[Regular] text-[#222]">Option {option.id}</p>
                                <button
                                    type="button"
                                    onClick={() => deletePaymentOption(option.id)}
                                    className="cursor-pointer  bg-white flex items-center justify-center"
                                >
                                    <TrashIcon width={20} height={20} fill="#D4A373" />
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
                                                                // onChange={(e) =>
                                                                //     updateConstructionInstallment(
                                                                //         option.id,
                                                                //         item.id,
                                                                //         "percentage",
                                                                //         e.target.value
                                                                //     )
                                                                // }
                                                                onChange={(e) => {
                                                                    const input = e.target.value.replace(/\D/g, "");

                                                                    if (input === "") {
                                                                        updateConstructionInstallment(
                                                                            option.id,
                                                                            item.id,
                                                                            "percentage",
                                                                            ""
                                                                        );
                                                                        return;
                                                                    }

                                                                    const number = Number(input);

                                                                    if (number >= 1 && number <= 100) {
                                                                        updateConstructionInstallment(
                                                                            option.id,
                                                                            item.id,
                                                                            "percentage",
                                                                            input
                                                                        );
                                                                    }
                                                                }}
                                                                placeholder="00"
                                                                className="h-[44px] md:w-[88px] w-[70px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] pr-[24px] text-[13px] font-[Medium] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Medium] focus:outline-none"
                                                            />
                                                            <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[12px] text-[#707070] font-[SemiBold]">%</span>
                                                        </div>
                                                        <div className="w-full gap-[8px]">
                                                            {/* calendar section */}
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openDatePicker(option.id, item.id, item.date)}
                                                                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] pr-[30px] text-left text-[13px] font-[Medium] text-[#222] cursor-pointer"
                                                                >
                                                                    {item.date || "Select"}
                                                                </button>
                                                                <span className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none">
                                                                    <CalenderIcon width={14} height={14} />
                                                                </span>
                                                                {activeDatePicker === getPickerId(option.id, item.id) && (
                                                                    <div className="absolute left-0 top-[48px] z-9 h-[310px] w-[280px] rounded-[12px] bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
                                                                        <div className="flex items-center justify-between mb-[16px]">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => shiftMonth(-1)}
                                                                                className="text-[16px] font-[SemiBold] text-[#222] px-[6px] rotate-180"
                                                                            >
                                                                                <LeftArrowIcon width={14} height={14} />
                                                                            </button>
                                                                            <p className="text-[16px] font-[Bold] text-[#222]">
                                                                                {monthTitle(displayMonth)}
                                                                            </p>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => shiftMonth(1)}
                                                                                className="text-[16px] font-[SemiBold] text-[#222] px-[6px]"
                                                                            >
                                                                                <RightArrowIcon width={14} height={14} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="grid grid-cols-7 gap-y-[6px] text-center">
                                                                            {weekDays.map((day, idx) => (
                                                                                <span
                                                                                    key={`${option.id}-${item.id}-${day}-${idx}`}
                                                                                    className="text-[13px] font-[SemiBold] text-[#222]"
                                                                                >
                                                                                    {day}
                                                                                </span>
                                                                            ))}
                                                                            {calendarCells.map((day, idx) => {
                                                                                if (!day) {
                                                                                    return (
                                                                                        <span
                                                                                            key={`${option.id}-${item.id}-blank-${idx}`}
                                                                                            className="h-[30px] w-[30px] mx-auto rounded-full border border-[rgba(34,34,34,0.10)] bg-[#FAFAFA]"
                                                                                        />
                                                                                    );
                                                                                }
                                                                                const selectedDate = parseDateValue(item.date);
                                                                                const isSelected =
                                                                                    selectedDate.getDate() === day &&
                                                                                    selectedDate.getMonth() === displayMonth.getMonth() &&
                                                                                    selectedDate.getFullYear() === displayMonth.getFullYear();

                                                                                return (
                                                                                    <button
                                                                                        key={`${option.id}-${item.id}-${day}-${idx}`}
                                                                                        type="button"
                                                                                        onClick={() => selectDate(option.id, item.id, day)}
                                                                                        className={`h-[30px] w-[30px] mx-auto rounded-full text-[12px] font-[SemiBold] border transition-colors ${isSelected
                                                                                            ? "bg-[#D4A373] text-white border-[#D4A373]"
                                                                                            : "text-[#707070] border-[rgba(34,34,34,0.10)] hover:bg-[#F2F2F2]"
                                                                                            }`}
                                                                                    >
                                                                                        {day}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
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
                                            {installmentDateError && (
                                                <p className="text-[12px] font-[Medium] text-[#D4A373] mt-[8px]">
                                                    {installmentDateError}
                                                </p>
                                            )}
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
        </div>
    );
};

export default PricePayment;
