import { AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type NutritionalTag } from '@/schemas/mealPlan';

interface AllergenWarningBadgeProps {
  allergenTags?: NutritionalTag[];
}

export function AllergenWarningBadge({ allergenTags = [] }: AllergenWarningBadgeProps) {
  if (allergenTags.length === 0) {
    return null;
  }

  const allergenNames = allergenTags.map((tag) => tag.name).join(', ');
  const tooltipText = `Enthält: ${allergenNames}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center text-red-600 hover:text-red-700 cursor-pointer">
            <AlertCircle className="w-4 h-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-destructive text-destructive-foreground">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
