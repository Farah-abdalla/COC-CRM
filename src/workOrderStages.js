export const workOrderStages=['New','Glasses Prep','RX','Lab','Tint','Shipping','Waiting','Done','Received','Returned'];
const previousStages={'In progress':'Glasses Prep',Ready:'Done',Delivered:'Received',Cancelled:'Returned',Shiping:'Shipping'};
export const workOrderStage=value=>workOrderStages.includes(value)?value:previousStages[value]||'New';