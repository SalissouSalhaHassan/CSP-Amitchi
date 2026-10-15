/**
 * Reporting Service Client
 * Handles communication with the reporting microservice (Go/Python)
 */

const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://localhost:8001';

export interface ReportData {
  template_name: string;
  data: Record<string, any>;
  options?: Record<string, any>;
}

export async function generateReport(payload: ReportData): Promise<Blob> {
  try {
    const response = await fetch(`${REPORTING_SERVICE_URL}/generate/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reporting Service Error: ${errorText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Failed to generate report:', error);
    throw error;
  }
}

/**
 * Helper to download the generated report
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
