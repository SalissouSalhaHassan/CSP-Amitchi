"use client";

import CanteenPosSystem from "./CanteenPosSystem";

interface CanteenPOSProps {
  items?: any[];
  invoices?: any[];
  schoolName?: string;
}

export default function CanteenPOS({ items = [], invoices = [], schoolName }: CanteenPOSProps) {
  return <CanteenPosSystem initialItems={items} initialInvoices={invoices} schoolName={schoolName} />;
}
