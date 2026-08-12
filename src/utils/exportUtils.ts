import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface StatementColumn {
  header: string;
  key: string;
  formatter?: (val: any, row: any) => string | number;
}

export function exportToExcel(
  title: string,
  columns: StatementColumn[],
  data: any[],
  filename: string
) {
  try {
    const formattedRows = data.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        const rawVal = row[col.key];
        obj[col.header] = col.formatter ? col.formatter(rawVal, row) : (rawVal ?? "");
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    
    // Set column width based on headers length
    const colWidths = columns.map((col) => ({
      wch: Math.max(col.header.length * 2, 18),
    }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الحساب");

    const cleanFilename = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, cleanFilename);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
}

export async function exportToPdf(
  elementId: string,
  filename: string,
  title?: string
) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`تعذر العثور على عنصر كشف الحساب (${elementId}) للتصدير.`);
  }

  const canvasCtx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

  const colorToRgb = (colorStr: string): string => {
    if (!canvasCtx || !colorStr) return colorStr;
    try {
      canvasCtx.fillStyle = "#000000";
      canvasCtx.fillStyle = colorStr;
      const res = canvasCtx.fillStyle;
      if (res.includes("oklch")) {
        return "#475569";
      }
      return res;
    } catch {
      return "#475569";
    }
  };

  const replaceOklchInString = (str: string): string => {
    if (!str || !str.includes("oklch")) return str;
    return str.replace(/oklch\([^)]+\)/gi, (match) => {
      const converted = colorToRgb(match);
      return converted || "#475569";
    });
  };

  // Render element cleanly using html2canvas with onclone hook
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth + 50,
    onclone: (clonedDoc, clonedEl) => {
      // 1. Sanitize all <style> blocks in the cloned document
      const styleElements = clonedDoc.querySelectorAll("style");
      styleElements.forEach((styleEl) => {
        if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
          styleEl.textContent = replaceOklchInString(styleEl.textContent);
        }
      });

      // 2. Sanitize inline style attributes & computed oklch colors on all elements
      const allElements = clonedDoc.querySelectorAll<HTMLElement>("*");
      allElements.forEach((el) => {
        const styleAttr = el.getAttribute("style");
        if (styleAttr && styleAttr.includes("oklch")) {
          el.setAttribute("style", replaceOklchInString(styleAttr));
        }

        try {
          const computed = window.getComputedStyle(el);
          const colorProps = [
            "color",
            "backgroundColor",
            "border-color",
            "border-top-color",
            "border-right-color",
            "border-bottom-color",
            "border-left-color",
            "outline-color",
            "box-shadow",
            "text-decoration-color",
            "fill",
            "stroke"
          ];
          colorProps.forEach((prop) => {
            const val = computed.getPropertyValue(prop);
            if (val && val.includes("oklch")) {
              const cleanVal = replaceOklchInString(val);
              el.style.setProperty(prop, cleanVal, "important");
            }
          });
        } catch (e) {
          // ignore computed style errors
        }
      });
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const orientation = imgHeight > imgWidth ? "portrait" : "landscape";
  const pdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pdfWidth = pageWidth;
  const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

  let heightLeft = pdfHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  const cleanFilename = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}
