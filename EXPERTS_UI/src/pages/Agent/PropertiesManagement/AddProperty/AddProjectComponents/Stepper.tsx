type Step = {
    id: number;
    label: string;
};

type StepperProps = {
    activeStep: number;
    steps: Step[];
};

const Stepper = ({ activeStep, steps }: StepperProps) => {
    const totalSteps = steps.length;

    // progress between steps (center → center)
    const progressWidth = `${((activeStep - 1) / (totalSteps - 1)) * 100}%`;

    return (
        <div className="rounded-[15px] bg-white p-[16px] md:p-[30px]">
            <p className="text-center text-[14px] font-[Regular] text-[#707070] mb-[20px]">
                Follow the steps to create project
            </p>

            <div className="relative">

                {/* ✅ Background line (only between first & last step) */}
                <div
                    className="absolute top-[9px] h-[2px] bg-[rgba(34,34,34,0.12)]"
                    style={{
                        left: `${100 / (2 * totalSteps)}%`,
                        right: `${100 / (2 * totalSteps)}%`,
                    }}
                />

                {/* ✅ Active progress line */}
                <div
                    className="absolute top-[9px] h-[2px] bg-[#D4A373]"
                    style={{
                        left: `${100 / (2 * totalSteps)}%`,
                        width: `calc(${progressWidth} * ${(totalSteps - 1) / totalSteps})`,
                    }}
                />

                {/* Steps */}
                <div
                    className={`relative grid gap-[8px]`}
                    style={{ gridTemplateColumns: `repeat(${totalSteps}, 1fr)` }}
                >
                    {steps.map((step) => {
                        const isDone = step.id < activeStep;
                        const isActive = step.id === activeStep;

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center gap-[10px] min-w-0"
                            >
                                {/* Dot */}
                                <span
                                    className={`h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center ${isDone
                                        ? "border-[#D4A373] bg-[#D4A373]"
                                        : isActive
                                            ? "border-[#D4A373] bg-white"
                                            : "border-[rgba(34,34,34,0.15)] bg-white"
                                        }`}
                                >
                                    <span
                                        className={`h-[6px] w-[6px] rounded-full ${isDone
                                            ? "bg-white"
                                            : isActive
                                                ? "bg-[#D4A373]"
                                                : "bg-[rgba(34,34,34,0.20)]"
                                            }`}
                                    />
                                </span>

                                {/* Label */}
                                <p
                                    className={`text-[14px] font-[Regular] text-center leading-[1.2] ${isDone || isActive
                                        ? "text-[#222]"
                                        : "text-[#222]"
                                        }`}
                                >
                                    {step.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Stepper;