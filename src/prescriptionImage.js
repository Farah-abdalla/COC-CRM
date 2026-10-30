export const prepareExamImage = file => new Promise((resolve,reject)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){reject(new Error('Choose a JPG, PNG, or WebP image.'));return;}
  if(file.size>10*1024*1024){reject(new Error('Choose an image smaller than 10 MB.'));return;}
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('The image could not be read. Please try again.'));
  reader.onload=()=>{
    const image=new Image();
    image.onerror=()=>reject(new Error('The image could not be opened. Choose another image.'));
    image.onload=()=>{
      try{
        const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        const context=canvas.getContext('2d');if(!context)throw new Error('Image upload is unavailable in this browser.');
        context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
        let dataUrl=canvas.toDataURL('image/jpeg',0.85);
        if(dataUrl.length>1200000)dataUrl=canvas.toDataURL('image/jpeg',0.65);
        if(dataUrl.length>1500000)throw new Error('The image is too large to save. Choose a smaller image.');
        resolve({dataUrl,name:file.name});
      }catch(error){reject(error);}
    };
    image.src=String(reader.result);
  };
  reader.readAsDataURL(file);
});
