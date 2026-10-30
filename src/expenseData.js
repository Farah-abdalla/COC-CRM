import {requireTreasuryAccount,treasuryAccountFor} from './paymentMethods.js';
import {amountToCents} from './treasuryAmounts.js';
export const expenseCategories=['Rent','Utilities','Salaries','Supplies','Maintenance','Transport','Other'];
export const expenseMethods=['Cash','Bank transfer','Instapay','Wallet','Card','Other'];
export function validExpenseDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validateExpense(row){
 if(!Number.isSafeInteger(row.amountCents)||row.amountCents<=0)throw new Error('Expense amount must be greater than zero.');
 if(typeof row.branch!=='string'||!row.branch.trim())throw new Error('Choose an expense branch.');
 if(!validExpenseDate(row.date))throw new Error('Choose a valid expense date.');
 if(typeof row.description!=='string'||!row.description.trim()||row.description.length>500)throw new Error('Enter an expense description of up to 500 characters.');
 if(typeof row.category!=='string'||!row.category.trim()||row.category.length>80)throw new Error('Enter an expense category of up to 80 characters.');
 if(row.treasuryCategory)requireTreasuryAccount(row.method,row.treasuryCategory);
 if(!expenseMethods.includes(row.method))throw new Error('Choose a valid payment method.');
 if(typeof row.paidTo!=='string'||row.paidTo.length>120||typeof row.reference!=='string'||row.reference.length>200)throw new Error('Payee or reference is too long.');
}
export function prepareExpense(form,branches){
 const row={id:form.id||crypto.randomUUID(),date:form.date,branch:String(form.branch||'').trim(),category:String(form.category||'').trim(),description:String(form.description||'').trim(),method:form.method,treasuryCategory:form.method==='Other'?requireTreasuryAccount(form.method,form.treasuryCategory):treasuryAccountFor(form.method)||'',paidTo:String(form.paidTo||'').trim(),reference:String(form.reference||'').trim(),amountCents:amountToCents(form.amount),updatedAt:new Date().toISOString()};
 validateExpense(row);
 if(!branches.includes(row.branch))throw new Error('Choose a branch from your assigned locations.');
 return row;
}
