import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { CardElement, CardSize, Orientation, CARD_DIMENSIONS } from "./types";

export async function exportCardToPDF(cardType: CardSize, orientation: Orientation, name: string) {
  const element = document.querySelector(".bg-white.shadow-2xl");
  if (!element) return;

  try {
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 4, // High DPI rendering
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const dim = CARD_DIMENSIONS[cardType] || CARD_DIMENSIONS.CR80;

    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: [85.6, 54], // Exact PVC CR80 mm size
    });

    doc.addImage(imgData, "PNG", 0, 0, 85.6, 54);
    doc.save(`${name.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
  } catch (err) {
    console.error("Export Card PDF error:", err);
  }
}

export async function exportCardToImage(format: "png" | "jpeg", name: string) {
  const element = document.querySelector(".bg-white.shadow-2xl");
  if (!element) return;

  try {
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 4,
      useCORS: true,
      backgroundColor: format === "jpeg" ? "#ffffff" : null,
    });

    const imgData = canvas.toDataURL(`image/${format}`, 1.0);
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `${name.replace(/\s+/g, "_")}_Card.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Export Image error:", err);
  }
}

export function exportCardToJSON(rectoElements: CardElement[], versoElements: CardElement[], cardType: CardSize, orientation: Orientation, name: string) {
  const payload = {
    templateName: name,
    cardType,
    orientation,
    rectoElements,
    versoElements,
    createdAt: new Date().toISOString(),
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${name.replace(/\s+/g, "_")}_CardTemplate.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
