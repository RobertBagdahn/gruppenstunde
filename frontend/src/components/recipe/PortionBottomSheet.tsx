import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import PortionScaler from './PortionScaler';

interface PortionBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servings: number;
  onServingsChange: (servings: number) => void;
}

export default function PortionBottomSheet({
  open,
  onOpenChange,
  servings,
  onServingsChange,
}: PortionBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Portionen skalieren</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <PortionScaler
            defaultServings={servings}
            onChange={onServingsChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
