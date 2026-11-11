// Import the six original PNGs from Алтари.zip without repainting or distorting them.
// Usage: node scripts/prepare-wedding-assets.mjs directory-with-original-PNGs
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,rmSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('./wedding-photo-manifest.json',import.meta.url)));
const source=process.argv[2];if(!source)throw Error('Provide the directory containing the six original altar PNGs.');
const temp=mkdtempSync(path.join(os.tmpdir(),'wedding-photos-'));
try{
 // Validate and stage the complete collection before removing the previous catalog.
 for(const part of manifest){
  const original=readFileSync(path.join(source,part.source));
  const hash=createHash('sha256').update(original).digest('hex');
  if(hash!==part.sha256||original.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Unexpected original: '+part.source);
  const width=original.readUInt32BE(16),height=original.readUInt32BE(20),scale=Math.min(560/width,650/height);
  const w=Math.round(width*scale),h=Math.round(height*scale),x=Math.round((600-w)/2),y=700-h;
  const name=part.name,number=String(part.number).padStart(2,'0');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${hash.slice(0,12)}" data-preview-box="${x-6} ${y-6} ${w+12} ${h+12}"><title>${name}</title><image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${original.toString('base64')}"/></svg>\n`;
  writeFileSync(path.join(temp,`photo-${number}__400__${name}.svg`),svg);
 }
 const destination=path.join(root,'altars');mkdirSync(destination,{recursive:true});
 for(const name of readdirSync(destination))if(/\.(?:svg|png|webp)$/i.test(name))rmSync(path.join(destination,name));
 for(const name of readdirSync(temp))copyFileSync(path.join(temp,name),path.join(destination,name));
 console.log('Replaced all six altars with the original uploaded PNGs at 400 ₽ each.');
}finally{rmSync(temp,{recursive:true,force:true});}
