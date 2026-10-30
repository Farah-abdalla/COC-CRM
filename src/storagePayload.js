export const recordKeys = ['odooReportProducts','customReports','customers','orders','exams','branches','branchLocations','invoices','creditNotes','invoiceEvents','salesRecords','inventoryItems','vendorTransactions','transfers','treasuryTransfers','treasuryBalances','expenses','commissionRules'];
export const MAX_SNAPSHOT_BYTES = 1800000;
export function validSnapshot(value) {
  return Boolean(value && typeof value === 'object' && value.data && recordKeys.every(key =>
    Array.isArray(value.data[key]) && value.data[key].every(item => key === 'branches' ? typeof item === 'string' : item && typeof item === 'object' && !Array.isArray(item))
  ) && value.matrixEdits && typeof value.matrixEdits === 'object' && !Array.isArray(value.matrixEdits));
}
export function encodeSnapshot(value) {
  if (!validSnapshot(value)) throw new Error('The saved records are incomplete or invalid.');
  const text = JSON.stringify(value);
  if (new TextEncoder().encode(text).length > MAX_SNAPSHOT_BYTES) throw new Error('Online storage is full. Download a backup and reduce saved exam images before retrying.');
  return text;
}
