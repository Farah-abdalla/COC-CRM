import {invoiceSubtotalCents} from './invoiceItems.js';
const cents=value=>Math.round((Number(value)||0)*100);
export function invoiceAmounts(invoice){
  const subtotalCents=invoiceSubtotalCents(invoice),discountCents=cents(invoice.discount);
  const shippingCents=cents(invoice.shippingCharge),adjustmentCents=cents(invoice.adjustment);
  const itemTotalCents=subtotalCents-discountCents;
  const originalTotalCents=Math.max(0,itemTotalCents+shippingCents+adjustmentCents),originalPaidCents=cents(invoice.paid);
  const refundedCents=cents(invoice.refundedAmount),totalCents=invoice.isVoided?0:originalTotalCents-refundedCents,paidCents=originalPaidCents-refundedCents;
  return {refunded:refundedCents/100,originalTotal:originalTotalCents/100,originalPaid:originalPaidCents/100,subtotal:subtotalCents/100,discount:discountCents/100,itemTotal:itemTotalCents/100,shippingCharge:shippingCents/100,adjustment:adjustmentCents/100,total:totalCents/100,paid:paidCents/100,balance:(totalCents-paidCents)/100};
}
export const branchPhone=branch=>String(branch||'').trim().toLowerCase()==='nasr city'?'01126783242':'';