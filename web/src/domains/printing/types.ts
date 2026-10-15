export type PrintFormat = 'A4' | 'A5' | 'Ticket';
export type PrintOrientation = 'Portrait' | 'Landscape';

export interface PrintOptions {
  format: PrintFormat;
  orientation: PrintOrientation;
  zoom: number;
  showWatermark: boolean;
  qrVerification: boolean;
}

export interface DocumentData {
  type: 
    | 'StudentCard'
    | 'SchoolReport'
    | 'PaymentReceipt'
    | 'Certificate'
    | 'Timetable'
    | 'Invoice'
    | 'BulkBulletins';
  payload: any;
}

export interface PrintJob {
  id: string;
  timestamp: number;
  document: DocumentData;
  options: PrintOptions;
  status: 'Pending' | 'Completed' | 'Failed';
}
