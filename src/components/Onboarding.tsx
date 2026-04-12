// Onboarding Component - 操作引导
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, FileText, Sparkles, Clapperboard, Download } from "lucide-react";
import { useAppSettingsStore } from "@/stores/app-settings-store";

const STEPS = [
  {
    icon: FileText,
    titleKey: "onboarding.step1.title",
    descKey: "onboarding.step1.description",
  },
  {
    icon: Sparkles,
    titleKey: "onboarding.step2.title",
    descKey: "onboarding.step2.description",
  },
  {
    icon: Clapperboard,
    titleKey: "onboarding.step3.title",
    descKey: "onboarding.step3.description",
  },
  {
    icon: Download,
    titleKey: "onboarding.step4.title",
    descKey: "onboarding.step4.description",
  },
];

interface OnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Onboarding({ open, onOpenChange }: OnboardingProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const { setHasCompletedOnboarding } = useAppSettingsStore();

  const handleComplete = () => {
    setHasCompletedOnboarding(true);
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const Icon = STEPS[step].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {step === 0 ? t("onboarding.welcome.title") : t(STEPS[step].titleKey)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-10 h-10 text-primary" />
          </div>

          {/* Description */}
          <p className="text-center text-muted-foreground px-4">
            {step === 0
              ? t("onboarding.welcome.description")
              : t(STEPS[step].descKey)}
          </p>

          {/* Progress dots */}
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t("common.back")}
          </Button>

          {step === STEPS.length - 1 ? (
            <Button onClick={handleComplete}>
              {t("common.done")}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {t("common.next")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Skip button */}
        {step < STEPS.length - 1 && (
          <Button
            variant="ghost"
            className="absolute top-4 right-4 text-muted-foreground"
            onClick={handleComplete}
          >
            {t("common.skip")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
