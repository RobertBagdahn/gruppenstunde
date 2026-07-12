import { useState } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface PdfOption {
  key: string
  label: string
  queryParam: string
  checkedValue: string
  uncheckedValue: string
  defaultChecked: boolean
}

const MEAL_PLAN_OPTIONS: PdfOption[] = [
  {
    key: "include_notes",
    label: "Notizbereiche",
    queryParam: "include_notes",
    checkedValue: "true",
    uncheckedValue: "false",
    defaultChecked: true,
  },
  {
    key: "show_shopping_list",
    label: "Einkaufsliste",
    queryParam: "exclude_shopping_list",
    checkedValue: "false",
    uncheckedValue: "true",
    defaultChecked: true,
  },
  {
    key: "show_nutrition",
    label: "Nährwert-Tabelle",
    queryParam: "exclude_nutrition",
    checkedValue: "false",
    uncheckedValue: "true",
    defaultChecked: true,
  },
  {
    key: "show_allergens",
    label: "Allergen-Matrix",
    queryParam: "exclude_allergens",
    checkedValue: "false",
    uncheckedValue: "true",
    defaultChecked: true,
  },
  {
    key: "compact_mode",
    label: "Kompaktmodus (fortlaufend)",
    queryParam: "compact_mode",
    checkedValue: "true",
    uncheckedValue: "false",
    defaultChecked: false,
  },
]

export type PdfExportOption = "meal_plan" | "recipe" | "cooking_schedule"

interface PdfExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseUrl: string
  optionType: PdfExportOption
}

export function PdfExportDialog({
  open,
  onOpenChange,
  baseUrl,
  optionType,
}: PdfExportDialogProps) {
  const options = optionType === "meal_plan" ? MEAL_PLAN_OPTIONS : []

  const initialChecked: Record<string, boolean> = {}
  for (const opt of options) {
    initialChecked[opt.key] = opt.defaultChecked
  }

  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked)
  const [pageFormat, setPageFormat] = useState("A4")

  const buildUrl = (): string => {
    const params = new URLSearchParams()
    params.set("page_format", pageFormat)

    for (const opt of options) {
      const isChecked = checked[opt.key]
      params.set(opt.queryParam, isChecked ? opt.checkedValue : opt.uncheckedValue)
    }

    const queryString = params.toString()
    return `${baseUrl}?${queryString}`
  }

  const handleOpen = () => {
    const url = buildUrl()
    window.open(url, "_blank")
    onOpenChange(false)
  }

  const toggleOption = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Als PDF öffnen</DialogTitle>
          <DialogDescription>
            Wähle Optionen für den PDF-Export
          </DialogDescription>
        </DialogHeader>

        {options.length > 0 && (
          <div className="space-y-3 py-2">
            {options.map((opt) => (
              <div key={opt.key} className="flex items-center gap-2">
                <Checkbox
                  id={`pdf-opt-${opt.key}`}
                  checked={checked[opt.key]}
                  onCheckedChange={() => toggleOption(opt.key)}
                />
                <Label
                  htmlFor={`pdf-opt-${opt.key}`}
                  className="text-sm cursor-pointer"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 py-2">
          <Label htmlFor="pdf-page-format" className="text-sm">
            Seitenformat:
          </Label>
          <Select value={pageFormat} onValueChange={setPageFormat}>
            <SelectTrigger id="pdf-page-format" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleOpen}>
            <Printer className="mr-2 h-4 w-4" />
            PDF öffnen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
