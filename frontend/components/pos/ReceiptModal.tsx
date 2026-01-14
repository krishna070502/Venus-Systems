'use client'

import { Sale, SaleItem } from '@/lib/types/poultry'
import { X, Printer, Download, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRef } from 'react'

interface ReceiptModalProps {
    isOpen: boolean
    onClose: () => void
    sale: Sale
    storeName: string
    storeAddress?: string
    storePhone?: string
}

export function ReceiptModal({ isOpen, onClose, sale, storeName, storeAddress, storePhone }: ReceiptModalProps) {
    const receiptRef = useRef<HTMLDivElement>(null)

    if (!isOpen) return null

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header/Actions */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/30 print:hidden">
                    <div className="flex items-center gap-2 text-green-600 font-bold">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Success</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors"
                            title="Print Receipt"
                        >
                            <Printer className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-accent rounded-full transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-auto p-8 bg-white text-black font-mono text-sm leading-tight print:p-0 print:overflow-visible print-content" ref={receiptRef}>
                    <div className="max-w-[80mm] mx-auto print:max-w-full">
                        {/* Store Info */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-1">{storeName}</h2>
                            {storeAddress && <p className="text-[10px] opacity-70 mb-0.5">{storeAddress}</p>}
                            {storePhone && <p className="text-[10px] opacity-70">PH: {storePhone}</p>}
                        </div>

                        {/* Transaction Details */}
                        <div className="border-y border-black border-dashed py-3 mb-6 space-y-1">
                            <div className="flex justify-between">
                                <span className="opacity-60 uppercase text-[10px]">Receipt No:</span>
                                <span className="font-bold">{sale.receipt_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-60 uppercase text-[10px]">Date:</span>
                                <span>{new Date(sale.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-60 uppercase text-[10px]">Payment:</span>
                                <span className="font-bold">{sale.payment_method}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-60 uppercase text-[10px]">Customer:</span>
                                <span>{sale.customer_name || 'Walk-in Customer'}</span>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-6">
                            <thead className="border-b border-black border-dashed">
                                <tr>
                                    <th className="text-left py-2 font-black uppercase text-[10px]">Item</th>
                                    <th className="text-right py-2 font-black uppercase text-[10px]">Qty</th>
                                    <th className="text-right py-2 font-black uppercase text-[10px]">Rate</th>
                                    <th className="text-right py-2 font-black uppercase text-[10px]">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black divide-dashed">
                                {sale.items?.map((item, idx) => {
                                    const weight = Number(item.weight) || 0;
                                    const price = Number(item.price_snapshot) || 0;
                                    return (
                                        <tr key={item.id || idx}>
                                            <td className="py-2">
                                                <div className="font-bold uppercase text-[11px]">{item.sku_name || 'Item'}</div>
                                                {item.sku_code && <div className="text-[9px] opacity-50">{item.sku_code}</div>}
                                            </td>
                                            <td className="text-right py-2 tabular-nums">{weight.toFixed(3)}</td>
                                            <td className="text-right py-2 tabular-nums">{price.toFixed(2)}</td>
                                            <td className="text-right py-2 font-bold tabular-nums">
                                                {(weight * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* Summary */}
                        <div className="border-t-2 border-black pt-4 space-y-2">
                            <div className="flex justify-between text-lg font-black uppercase tracking-tighter">
                                <span>Grand Total</span>
                                <span>₹{(Number(sale.total_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-center pt-8">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">*** Thank You! Visit Again ***</p>
                                <p className="text-[8px] opacity-40 mt-1">VENUS SYSTEM POS v1.0</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Styles */}
                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        .print-content, .print-content * {
                            visibility: visible !important;
                        }
                        .print-content {
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            margin: 0 !important;
                            padding: 20px !important;
                            background: white !important;
                            z-index: 99999 !important;
                        }
                        @page {
                            margin: 0;
                            size: 80mm auto;
                        }
                    }
                `}</style>
            </div>
        </div>
    )
}
