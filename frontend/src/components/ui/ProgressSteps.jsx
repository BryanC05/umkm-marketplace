import { Check } from "lucide-react";

const ProgressSteps = ({ steps, currentStep }) => {

    return (
        <div className="w-full">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = currentStep > stepNumber;
                    const isCurrent = currentStep === stepNumber;

                    return (
                        <div key={index} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                                        isCompleted
                                            ? 'bg-accent border-accent text-accent-foreground'
                                            : isCurrent
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <Check className="h-6 w-6" />
                                    ) : (
                                        <span className="text-lg font-bold">{stepNumber}</span>
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <span
                                        className={`text-sm font-medium ${
                                            isCurrent ? 'text-primary' : isCompleted ? 'text-accent' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`h-0.5 flex-1 mx-2 mt-[-24px] transition-colors ${
                                        isCompleted ? 'bg-accent' : 'bg-muted-foreground/30'
                                    }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressSteps;
