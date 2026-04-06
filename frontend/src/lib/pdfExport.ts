import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PdfExportOptions {
  title: string;
  filename?: string;
  /** CSS selector or element to capture. Defaults to [data-pdf-content] */
  selector?: string;
  element?: HTMLElement;
}

/**
 * Export a rendered HTML element (with Markdown content) to a nicely formatted PDF.
 * The element should already be rendered in the DOM before calling this function.
 */
export async function exportToPdf({
  title,
  filename,
  selector = '[data-pdf-content]',
  element,
}: PdfExportOptions): Promise<void> {
  const target = element ?? document.querySelector<HTMLElement>(selector);
  if (!target) {
    throw new Error('PDF-Export: Kein Element gefunden.');
  }

  // Capture the element as a canvas
  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in mm
  const pdfWidth = 210;
  const pdfHeight = 297;
  const margin = 15;
  const contentWidth = pdfWidth - 2 * margin;
  const contentHeight = pdfHeight - 2 * margin;

  // Scale image to fit the PDF width
  const ratio = contentWidth / (imgWidth / 2); // divide by 2 because of scale: 2
  const scaledHeight = (imgHeight / 2) * ratio;

  const pdf = new jsPDF('p', 'mm', 'a4');

  // If the content fits on one page
  if (scaledHeight <= contentHeight) {
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, scaledHeight);
  } else {
    // Multi-page: slice the image into pages
    let remainingHeight = imgHeight / 2; // in original pixels (before ratio)
    let sourceY = 0;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      // How many original pixels fit on one page
      const pagePixelHeight = contentHeight / ratio;
      const sliceHeight = Math.min(pagePixelHeight, remainingHeight);

      // Create a temporary canvas for this slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgWidth;
      sliceCanvas.height = sliceHeight * 2; // scale: 2

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          sourceY * 2, // source Y (scaled)
          imgWidth,
          sliceHeight * 2, // source height (scaled)
          0,
          0,
          imgWidth,
          sliceHeight * 2,
        );
      }

      const sliceImgData = sliceCanvas.toDataURL('image/png');
      const sliceScaledHeight = sliceHeight * ratio;

      pdf.addImage(sliceImgData, 'PNG', margin, margin, contentWidth, sliceScaledHeight);

      sourceY += sliceHeight;
      remainingHeight -= sliceHeight;
      pageIndex++;
    }
  }

  const safeFilename = (filename ?? title)
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  pdf.save(`${safeFilename}.pdf`);
}
