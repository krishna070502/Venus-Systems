/**
 * PDF Generation Utility
 * Generates professional PDF documents for receipts and payment vouchers
 */

export interface PDFDocumentData {
  type: 'RECEIPT' | 'PAYMENT'
  documentNumber: string
  date: string
  partyName: string
  amount: number
  paymentMethod: string
  referenceNumber?: string
  notes?: string
  storeAddress?: string
}

/**
 * Generates a PDF document by opening a new window with formatted HTML and triggering print
 */
export function generatePDF(data: PDFDocumentData): void {
  const isReceipt = data.type === 'RECEIPT'
  const title = isReceipt ? 'Receipt' : 'Payment Voucher'
  const partyLabel = isReceipt ? 'Received From' : 'Paid To'
  const colorClass = isReceipt ? '#16a34a' : '#dc2626'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${data.documentNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 20mm;
    }
    
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1f2937;
      background: white;
      padding: 40px;
      line-height: 1.6;
    }
    
    .document {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, ${colorClass}15, ${colorClass}05);
      border-bottom: 2px solid ${colorClass}30;
      padding: 30px;
      text-align: center;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 4px;
    }
    
    .store-name {
      font-size: 14px;
      font-weight: 500;
      color: #4b5563;
      margin-bottom: 8px;
    }
    
    .company-tagline {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    
    .document-title {
      display: inline-block;
      background: ${colorClass};
      color: white;
      padding: 8px 24px;
      border-radius: 20px;
      font-size: 18px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .content {
      padding: 30px;
    }
    
    .document-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px dashed #e5e7eb;
    }
    
    .info-group {
      text-align: left;
    }
    
    .info-group:last-child {
      text-align: right;
    }
    
    .info-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .party-section {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .party-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .party-name {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .amount-section {
      background: ${colorClass}10;
      border: 2px solid ${colorClass}30;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 30px;
    }
    
    .amount-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .amount-value {
      font-size: 36px;
      font-weight: 700;
      color: ${colorClass};
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .detail-item {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
    }
    
    .detail-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .detail-value {
      font-size: 16px;
      font-weight: 500;
      color: #1f2937;
    }
    
    .notes-section {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }
    
    .notes-label {
      font-size: 12px;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .notes-value {
      font-size: 14px;
      color: #78350f;
    }
    
    .footer {
      border-top: 2px dashed #e5e7eb;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    
    .signature-line {
      border-top: 1px solid #9ca3af;
      padding-top: 8px;
      margin-top: 60px;
    }
    
    .signature-label {
      font-size: 12px;
      color: #6b7280;
    }
    
    .print-date {
      font-size: 11px;
      color: #9ca3af;
      text-align: right;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .document {
        border: none;
        box-shadow: none;
      }
      
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="company-name">Venus Chicken</div>
      ${data.storeAddress ? `<div class="store-name">${data.storeAddress}</div>` : ''}
      <div class="company-tagline">Premium Poultry Products</div>
      <div class="document-title">${title}</div>
    </div>
    
    <div class="content">
      <div class="document-info">
        <div class="info-group">
          <div class="info-label">${title} Number</div>
          <div class="info-value">${data.documentNumber}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Date</div>
          <div class="info-value">${data.date}</div>
        </div>
      </div>
      
      <div class="party-section">
        <div class="party-label">${partyLabel}</div>
        <div class="party-name">${data.partyName}</div>
      </div>
      
      <div class="amount-section">
        <div class="amount-label">Amount ${isReceipt ? 'Received' : 'Paid'}</div>
        <div class="amount-value">${formatCurrency(data.amount)}</div>
      </div>
      
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Payment Method</div>
          <div class="detail-value">${data.paymentMethod}</div>
        </div>
        ${data.referenceNumber ? `
        <div class="detail-item">
          <div class="detail-label">Reference Number</div>
          <div class="detail-value">${data.referenceNumber}</div>
        </div>
        ` : `
        <div class="detail-item">
          <div class="detail-label">Reference Number</div>
          <div class="detail-value">-</div>
        </div>
        `}
      </div>
      
      ${data.notes ? `
      <div class="notes-section">
        <div class="notes-label">Notes</div>
        <div class="notes-value">${data.notes}</div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">${isReceipt ? 'Received By' : 'Paid By'}</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Authorized Signature</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="print-date no-print" style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    Generated on ${new Date().toLocaleString('en-IN')}
  </div>
  
  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  } else {
    alert('Please allow pop-ups to download the PDF')
  }
}

// =============================================================================
// PURCHASE BILL PDF GENERATION
// =============================================================================

export interface PurchaseBillData {
  purchaseId: string
  date: string
  supplierName: string
  birdType: string
  birdCount: number
  totalWeight: number
  pricePerKg: number
  totalAmount: number
  status: string
  vehicleNumber?: string
  driverName?: string
  notes?: string
  storeName?: string
}

/**
 * Generates a Purchase Bill PDF document
 */
export function generatePurchaseBillPDF(data: PurchaseBillData): void {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const statusColor = data.status === 'COMMITTED' ? '#16a34a' : data.status === 'DRAFT' ? '#ca8a04' : '#dc2626'

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Bill - ${data.purchaseId.slice(0, 8)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 20mm; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1f2937;
      background: white;
      padding: 40px;
      line-height: 1.6;
    }
    .document {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1E4DD815, #1E4DD805);
      border-bottom: 2px solid #1E4DD830;
      padding: 30px;
      text-align: center;
    }
    .company-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .store-name {
      font-size: 14px;
      font-weight: 500;
      color: #4b5563;
      margin-bottom: 8px;
    }
    .company-tagline {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    .document-title {
      display: inline-block;
      background: #1E4DD8;
      color: white;
      padding: 8px 24px;
      border-radius: 20px;
      font-size: 18px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content { padding: 30px; }
    .document-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px dashed #e5e7eb;
    }
    .info-group { text-align: left; }
    .info-group:last-child { text-align: right; }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    .supplier-section {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .supplier-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .supplier-name {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .details-table th,
    .details-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .details-table th {
      background: #f9fafb;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .details-table td {
      font-size: 15px;
      color: #1f2937;
    }
    .details-table .right { text-align: right; }
    .amount-section {
      background: #1E4DD810;
      border: 2px solid #1E4DD830;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 30px;
    }
    .amount-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .amount-value {
      font-size: 36px;
      font-weight: 700;
      color: #1E4DD8;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background: ${statusColor}20;
      color: ${statusColor};
    }
    .notes-section {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }
    .notes-label {
      font-size: 12px;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .notes-value {
      font-size: 14px;
      color: #78350f;
    }
    .footer {
      border-top: 2px dashed #e5e7eb;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    .signature-line {
      border-top: 1px solid #9ca3af;
      padding-top: 8px;
      margin-top: 60px;
    }
    .signature-label {
      font-size: 12px;
      color: #6b7280;
    }
    @media print {
      body { padding: 0; }
      .document { border: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="company-name">Venus Chicken</div>
      ${data.storeName ? `<div class="store-name">${data.storeName}</div>` : ''}
      <div class="company-tagline">Premium Poultry Products</div>
      <div class="document-title">Purchase Bill</div>
    </div>
    
    <div class="content">
      <div class="document-info">
        <div class="info-group">
          <div class="info-label">Bill ID</div>
          <div class="info-value">${data.purchaseId.slice(0, 8).toUpperCase()}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Status</div>
          <div class="status-badge">${data.status}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Date</div>
          <div class="info-value">${data.date}</div>
        </div>
      </div>
      
      <div class="supplier-section">
        <div class="supplier-label">Supplier</div>
        <div class="supplier-name">${data.supplierName}</div>
      </div>
      
      <table class="details-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="right">Quantity</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${data.birdType === 'BROILER' ? '🐔' : '🐓'} ${data.birdType}</strong><br>
              <span style="font-size: 13px; color: #6b7280;">Live Birds</span>
            </td>
            <td class="right">
              <strong>${data.birdCount}</strong> birds<br>
              <span style="font-size: 13px; color: #6b7280;">${data.totalWeight.toFixed(3)} kg</span>
            </td>
            <td class="right">${formatCurrency(data.pricePerKg)}/kg</td>
            <td class="right"><strong>${formatCurrency(data.totalAmount)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div class="amount-section">
        <div class="amount-label">Total Amount Payable</div>
        <div class="amount-value">${formatCurrency(data.totalAmount)}</div>
      </div>
      
      ${data.vehicleNumber || data.driverName ? `
      <div class="details-table" style="margin-bottom: 20px;">
        <tr>
          ${data.vehicleNumber ? `<td><strong>Vehicle:</strong> ${data.vehicleNumber}</td>` : ''}
          ${data.driverName ? `<td><strong>Driver:</strong> ${data.driverName}</td>` : ''}
        </tr>
      </div>
      ` : ''}
      
      ${data.notes ? `
      <div class="notes-section">
        <div class="notes-label">Notes</div>
        <div class="notes-value">${data.notes}</div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Supplier Signature</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Authorized Signature</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="no-print" style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    Generated on ${new Date().toLocaleString('en-IN')}
  </div>
  
  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
    `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  } else {
    alert('Please allow pop-ups to download the PDF')
  }
}

// =============================================================================
// SALE BILL PDF GENERATION
// =============================================================================

export interface SaleItem {
  skuName: string
  weight: number
  rate: number
  total: number
}

export interface SaleBillData {
  receiptNumber: string
  date: string
  customerName: string
  customerPhone?: string
  items: SaleItem[]
  totalAmount: number
  paymentMethod: string
  saleType: string
  notes?: string
  storeName?: string
}

/**
 * Generates a Sale Bill / Invoice PDF document
 */
export function generateSaleBillPDF(data: SaleBillData): void {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const totalWeight = data.items.reduce((acc, item) => acc + item.weight, 0)

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sale Invoice - ${data.receiptNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; background: white; padding: 40px; line-height: 1.6; }
  .document { max-width: 800px; margin: 0 auto; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #16a34a15, #16a34a05); border-bottom: 2px solid #16a34a30; padding: 30px; text-align: center; }
  .company-name { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
  .store-name { font-size: 14px; font-weight: 500; color: #4b5563; margin-bottom: 8px; }
  .company-tagline { font-size: 14px; color: #6b7280; margin-bottom: 20px; }
  .document-title { display: inline-block; background: #16a34a; color: white; padding: 8px 24px; border-radius: 20px; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .content { padding: 30px; }
  .document-info { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px dashed #e5e7eb; }
  .info-group { text-align: left; }
  .info-group:last-child { text-align: right; }
  .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-value { font-size: 16px; font-weight: 600; color: #1f2937; }
  .customer-section { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
  .customer-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
  .customer-name { font-size: 20px; font-weight: 600; color: #1f2937; }
  .customer-phone { font-size: 14px; color: #6b7280; margin-top: 4px; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .items-table th, .items-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  .items-table th { background: #f9fafb; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .items-table td { font-size: 15px; color: #1f2937; }
  .items-table .right { text-align: right; }
  .items-table tfoot td { font-weight: 600; background: #f9fafb; }
  .amount-section { background: #16a34a10; border: 2px solid #16a34a30; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px; }
  .amount-label { font-size: 14px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
  .amount-value { font-size: 36px; font-weight: 700; color: #16a34a; }
  .payment-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #3b82f620; color: #3b82f6; margin-top: 12px; }
  .notes-section { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 30px; }
  .notes-label { font-size: 12px; color: #92400e; text-transform: uppercase; margin-bottom: 8px; }
  .notes-value { font-size: 14px; color: #78350f; }
  .footer { border-top: 2px dashed #e5e7eb; padding: 20px 30px; display: flex; justify-content: space-between; align-items: flex-end; }
  .signature-box { text-align: center; min-width: 200px; }
  .signature-line { border-top: 1px solid #9ca3af; padding-top: 8px; margin-top: 60px; }
  .signature-label { font-size: 12px; color: #6b7280; }
  @media print { body { padding: 0; } .document { border: none; } .no-print { display: none !important; } }
</style>
</head>
<body>
<div class="document">
  <div class="header">
    <div class="company-name">Venus Chicken</div>
    ${data.storeName ? `<div class="store-name">${data.storeName}</div>` : ''}
    <div class="company-tagline">Premium Poultry Products</div>
    <div class="document-title">Sales Invoice</div>
  </div>
  <div class="content">
    <div class="document-info">
      <div class="info-group"><div class="info-label">Receipt Number</div><div class="info-value">${data.receiptNumber}</div></div>
      <div class="info-group"><div class="info-label">Sale Type</div><div class="info-value">${data.saleType}</div></div>
      <div class="info-group"><div class="info-label">Date</div><div class="info-value">${data.date}</div></div>
    </div>
    <div class="customer-section">
      <div class="customer-label">Sold To</div>
      <div class="customer-name">${data.customerName}</div>
      ${data.customerPhone ? `<div class="customer-phone">📞 ${data.customerPhone}</div>` : ''}
    </div>
    <table class="items-table">
      <thead><tr><th>#</th><th>Product</th><th class="right">Weight (kg)</th><th class="right">Rate (₹/kg)</th><th class="right">Amount</th></tr></thead>
      <tbody>${data.items.map((item, idx) => `<tr><td>${idx + 1}</td><td><strong>${item.skuName}</strong></td><td class="right">${item.weight.toFixed(2)}</td><td class="right">${formatCurrency(item.rate)}</td><td class="right"><strong>${formatCurrency(item.total)}</strong></td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2"><strong>Total</strong></td><td class="right"><strong>${totalWeight.toFixed(2)} kg</strong></td><td></td><td class="right"><strong>${formatCurrency(data.totalAmount)}</strong></td></tr></tfoot>
    </table>
    <div class="amount-section">
      <div class="amount-label">Total Amount</div>
      <div class="amount-value">${formatCurrency(data.totalAmount)}</div>
      <div class="payment-badge">${data.paymentMethod}</div>
    </div>
    ${data.notes ? `<div class="notes-section"><div class="notes-label">Notes</div><div class="notes-value">${data.notes}</div></div>` : ''}
  </div>
  <div class="footer">
    <div class="signature-box"><div class="signature-line"><div class="signature-label">Customer Signature</div></div></div>
    <div class="signature-box"><div class="signature-line"><div class="signature-label">Authorized Signature</div></div></div>
  </div>
</div>
<div class="no-print" style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">Generated on ${new Date().toLocaleString('en-IN')}</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  } else {
    alert('Please allow pop-ups to download the PDF')
  }
}


