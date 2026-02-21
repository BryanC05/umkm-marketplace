import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Search, ShoppingBag, MapPin, CreditCard, Package } from "lucide-react";
import { useOnboardingStore } from "@/hooks/useOnboarding";
import { useTranslation } from "@/hooks/useTranslation";

const OnboardingTour = () => {
    const { currentStep, nextStep, prevStep, completeOnboarding, skipOnboarding, isOnboardingActive } = useOnboardingStore();
    const { t } = useTranslation();

    if (!isOnboardingActive) return null;

    const steps = [
        {
            icon: Search,
            title: t('onboarding.step1Title'),
            description: t('onboarding.step1Desc'),
            illustration: "🔍"
        },
        {
            icon: ShoppingBag,
            title: t('onboarding.step2Title'),
            description: t('onboarding.step2Desc'),
            illustration: "🛒"
        },
        {
            icon: CreditCard,
            title: t('onboarding.step3Title'),
            description: t('onboarding.step3Desc'),
            illustration: "💳"
        },
        {
            icon: Package,
            title: t('onboarding.step4Title'),
            description: t('onboarding.step4Desc'),
            illustration: "📦"
        },
    ];

    const totalSteps = steps.length;
    const step = steps[currentStep];
    const Icon = step.icon;
    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-card shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-1">
                            {steps.map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-2 rounded-full transition-all ${
                                        index === currentStep
                                            ? 'w-8 bg-primary'
                                            : index < currentStep
                                            ? 'w-2 bg-accent'
                                            : 'w-2 bg-muted'
                                    }`}
                                />
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={skipOnboarding}
                            className="h-8 w-8"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="text-center mb-6">
                        <div className="text-6xl mb-4">{step.illustration}</div>
                        <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                        <p className="text-lg text-muted-foreground">{step.description}</p>
                    </div>

                    <div className="flex gap-3">
                        {!isFirstStep && (
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 h-12 gap-2"
                                onClick={prevStep}
                            >
                                <ArrowLeft className="h-5 w-5" />
                                {t('common.back')}
                            </Button>
                        )}
                        
                        {isLastStep ? (
                            <Button
                                size="lg"
                                className="flex-1 h-12 gap-2"
                                onClick={completeOnboarding}
                            >
                                {t('onboarding.gotIt')}
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="flex-1 h-12 gap-2"
                                onClick={nextStep}
                            >
                                {t('onboarding.next')}
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                        {currentStep + 1} of {totalSteps}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export const OnboardingPrompt = () => {
    const { startOnboarding, hasCompletedOnboarding } = useOnboardingStore();
    const { t } = useTranslation();

    if (hasCompletedOnboarding) return null;

    return (
        <Card className="bg-primary/5 border-primary/20 mb-6">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">👋</div>
                        <div>
                            <p className="font-semibold">{t('onboarding.welcome')}</p>
                            <p className="text-sm text-muted-foreground">{t('onboarding.welcomeDesc')}</p>
                        </div>
                    </div>
                    <Button size="lg" className="gap-2 h-11" onClick={startOnboarding}>
                        {t('onboarding.startTour')}
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default OnboardingTour;
