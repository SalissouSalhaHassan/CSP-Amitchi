import { jsPDF } from 'jspdf';
// import printJS from 'print-js';

export interface ThermalData {
  schoolName: string;
  reference: string;
  date: string;
  items: { label: string; value: string | number }[];
  total: number;
  currency: string;
  footer: string;
}

export const printThermalTicket = (data: ThermalData, width: 58 | 80 = 80) => {
  // We use jsPDF to create a long strip matching the thermal printer width
  const doc = new jsPDF({
    unit: 'mm',
    format: [width, 200], // Height is flexible for thermal
  });

  const xCenter = width / 2;
  let y = 10;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.schoolName.toUpperCase(), xCenter, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`REF: ${data.reference}`, xCenter, y, { align: 'center' });
  
  y += 4;
  doc.text(`Date: ${data.date}`, xCenter, y, { align: 'center' });
  
  y += 4;
  doc.text('------------------------------------------', xCenter, y, { align: 'center' });
  
  // Items
  y += 6;
  doc.setFont('helvetica', 'bold');
  data.items.forEach(item => {
    doc.text(item.label, 5, y);
    doc.text(`${item.value}`, width - 5, y, { align: 'right' });
    y += 5;
  });
  
  y += 2;
  doc.text('------------------------------------------', xCenter, y, { align: 'center' });
  
  // Total
  y += 6;
  doc.setFontSize(10);
  doc.text('TOTAL:', 5, y);
  doc.text(`${data.total} ${data.currency}`, width - 5, y, { align: 'right' });
  
  // Footer
  y += 10;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(data.footer, xCenter, y, { align: 'center', maxWidth: width - 10 });

  // Output and print
  const base64 = doc.output('dataurlstring').split(',')[1];
  
  import('print-js').then((module) => {
    const printJS = module.default;
    printJS({
      printable: base64,
      type: 'pdf',
      base64: true,
    });
  });
};
