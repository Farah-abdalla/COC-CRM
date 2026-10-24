export const FRAME_COMMISSION_EGP=50;
export const VEGAS_LENS_COMMISSION_EGP=50;
export const frameCommission=invoice=>String(invoice.sku||'').toLowerCase().includes('frame')?FRAME_COMMISSION_EGP:0;
export const vegasLensCommission=invoice=>{
  const sku=String(invoice.sku||'').toLowerCase();
  return sku.includes('vegas')&&/len(?:s|ses)?/.test(sku)?VEGAS_LENS_COMMISSION_EGP:0;
};
export const invoiceCommission=invoice=>frameCommission(invoice)+vegasLensCommission(invoice);
export const salesPeople=['Saif','Mohamed Alaa','Mohamed Ashraf','Ehsan'];