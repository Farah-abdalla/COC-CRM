import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import React from 'react';
import { code39Bars } from './barcodeData';
export default function ItemBarcode({invoice}){
  useUiLanguage();

  const code=code39Bars(invoice.sku);
  return <div className="invoice-item-barcode"><h2>{uiT("Item barcode")}</h2><p>{invoice.number}</p>{code?<svg role="img" aria-label={uiT('Barcode '+invoice.sku)} viewBox={'0 0 '+code.width+' 82'} preserveAspectRatio="none" shapeRendering="crispEdges"><rect width={code.width} height="82" fill="white"/>{code.bars.map((bar,index)=><rect key={index} x={bar.x} y="4" width={bar.width} height="72" fill="black"/>)}</svg>:<p role="alert">{uiT("This SKU cannot be encoded. Use up to 80 encoded ASCII characters for a Code 39 barcode.")}</p>}<strong>{invoice.sku}</strong><small>{uiT("Code 39 Extended")}</small></div>;
}