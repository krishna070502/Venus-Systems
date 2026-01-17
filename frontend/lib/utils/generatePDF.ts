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
