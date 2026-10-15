import { jsPDF } from "jspdf";
import { DesignerElement, PageSize, Orientation, PAGE_DIMENSIONS } from "./types";

export async function exportDesignToPDF(elements: DesignerElement[], pageSize: PageSize, orientation: Orientation, name: string) {
  const element = document.querySelector(".bg-grid-pattern") || document.querySelector(".bg-white.shadow-2xl");
  if (!element) {
    if (typeof window !== "undefined") window.print();
    return;
  }

  try {
    // Attempt dynamic html2canvas if available, otherwise window.print fallback
    let canvas: HTMLCanvasElement | null = null;
    try {
      const html2canvasModule = await import(/* webpackIgnore: true */ "html2canvas" as any).catch(() => null);
      if (html2canvasModule) {
        const html2canvas = html2canvasModule.default || html2canvasModule;
        canvas = await html2canvas(element as HTMLElement, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
      }
    } catch {
      canvas = null;
    }

    if (canvas) {
      const imgData = canvas.toDataURL("image/png");
      const doc = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: pageSize.toLowerCase() as any,
      });

      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      doc.save(`${name.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
    } else {
      window.print();
    }
  } catch (err) {
    console.error("Export PDF error, falling back to print:", err);
    window.print();
  }
}

export async function exportDesignToImage(format: "png" | "jpeg", name: string) {
  const element = document.querySelector(".bg-grid-pattern") || document.querySelector(".bg-white.shadow-2xl");
  if (!element) return;

  try {
    const html2canvasModule = await import(/* webpackIgnore: true */ "html2canvas" as any).catch(() => null);
    if (!html2canvasModule) {
      console.warn("html2canvas not installed; image export unavailable");
      return;
    }
    const html2canvas = html2canvasModule.default || html2canvasModule;
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 3,
      useCORS: true,
      backgroundColor: format === "jpeg" ? "#ffffff" : null,
    });

    const imgData = canvas.toDataURL(`image/${format}`, 1.0);
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `${name.replace(/\s+/g, "_")}_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Export Image error:", err);
  }
}

export function exportDesignToJSON(elements: DesignerElement[], pageSize: PageSize, orientation: Orientation, name: string) {
  const payload = {
    templateName: name,
    pageSize,
    orientation,
    elements,
    createdAt: new Date().toISOString(),
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${name.replace(/\s+/g, "_")}_Template.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
