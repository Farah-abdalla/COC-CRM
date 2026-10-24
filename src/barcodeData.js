// Code 39 wide/narrow encodings from ZXing (Apache-2.0):
// https://github.com/zxing-js/library/blob/master/src/core/oned/Code39Reader.ts
const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const encodings=[0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00D,0x10C,0x04C,0x01C,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0C1,0x1C0,0x091,0x190,0x0D0,0x085,0x184,0x0C4,0x0A8,0x0A2,0x08A,0x02A];
function extended(text){
  let value='';
  for(const character of text){
    const code=character.charCodeAt(0);
    if(code>127)return null;
    if(code===0)value+='%U';
    else if(code<=26)value+='$'+String.fromCharCode(code+64);
    else if(code<=31)value+='%'+String.fromCharCode(code+38);
    else if(code===32)value+=' ';
    else if(code<=44)value+='/'+String.fromCharCode(code+32);
    else if(code<=46)value+=character;
    else if(code===47)value+='/O';
    else if(code<=57)value+=character;
    else if(code===58)value+='/Z';
    else if(code<=63)value+='%'+String.fromCharCode(code+11);
    else if(code===64)value+='%V';
    else if(code<=90)value+=character;
    else if(code<=95)value+='%'+String.fromCharCode(code-16);
    else if(code===96)value+='%W';
    else if(code<=122)value+='+'+String.fromCharCode(code-32);
    else value+='%'+String.fromCharCode(code-43);
  }
  return value;
}
export function code39Bars(text){
  const value=extended(String(text||''));
  if(!value||value.length>80)return null;
  let x=12;const bars=[];
  for(const char of '*'+value+'*'){
    const pattern=char==='*'?0x094:encodings[alphabet.indexOf(char)];
    for(let index=0;index<9;index++){
      const width=pattern&(1<<(8-index))?3:1;
      if(index%2===0)bars.push({x,width});
      x+=width;
    }
    x++;
  }
  return {bars,width:x+11,value};
}