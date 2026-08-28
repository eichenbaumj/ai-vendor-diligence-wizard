/*
  Print / save-as-PDF button. Browser print is the zero-dependency path; the
  print stylesheet in brand.css handles the rest.
*/
import { PillButton } from "@/components/brand";

export function PrintButton() {
  return (
    <div className="no-print">
      <PillButton variant="ghost" size="md" onClick={() => window.print()}>
        Print or save as PDF
      </PillButton>
    </div>
  );
}
