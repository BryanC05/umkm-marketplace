import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const HelpTooltip = ({ content, title, side = "top" }) => {
    const [isOpen, setIsOpen] = useState(false);

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    return (
        <div className="relative inline-flex">
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <HelpCircle className="h-4 w-4" />
            </Button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className={`absolute ${positionClasses[side]} z-50 w-64 p-4 bg-card border rounded-lg shadow-lg`}
                    >
                        <div className="flex items-start justify-between gap-2 mb-2">
                            {title && (
                                <p className="font-semibold text-sm">{title}</p>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">{content}</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default HelpTooltip;
