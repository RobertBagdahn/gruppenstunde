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
  portions: number;
  onPortionsChange: (portions: number) => void;
}

export default function PortionBottomSheet({
  open,
  onOpenChange,
  portions,
  onPortionsChange,
}: PortionBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Portionen skalieren</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <PortionScaler
            defaultPortions={portions}
            onChange={onPortionsChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
