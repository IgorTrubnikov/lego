// Reapply centered mermaid artwork and larger dogs after importing base catalogs.
import {readFileSync,writeFileSync,readdirSync,existsSync,rmSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const suits=path.join(root,'suits');
for(const [number,marker,offset] of [['07','school-center',-18],['09','mermaid-center',21]]){
 const file=path.join(suits,readdirSync(suits).find(f=>f.startsWith('catalog-'+number+'__')));
 let svg=readFileSync(file,'utf8');
 if(svg.includes('data-fit="'+marker+'"'))continue;
 svg=svg.replace(/(<image\b[^>]*\/>)/,'<g data-fit="'+marker+'" transform="translate('+offset+' 0)">$1</g>').replace('data-preview-box="133 311 334 391"','data-preview-box="'+(133+offset)+' 311 334 391"');
 const version=createHash('sha256').update(svg).digest('hex').slice(0,12);svg=svg.replace(/data-asset-version="[^"]*"/,'data-asset-version="'+version+'"');writeFileSync(file,svg);
}
for(const [slug,price,name,height] of [['3d-shepherd',500,'Немецкая овчарка',154],['3d-labrador',450,'Светлый лабрадор',124]]){
 const stem=path.join(root,'animals',`${slug}__${price}__${name}`),source=stem+'.webp',target=stem+'.svg';
 if(!existsSync(source))continue; // Already fitted; SVG is self-contained.
 const bytes=readFileSync(source),top=695-height*1.2;
 const version=createHash('sha256').update(bytes).update('size-120').digest('hex').slice(0,12);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="409 ${Math.floor(top)-6} 191 ${Math.ceil(height*1.2)+12}"><title>${name}</title><image width="600" height="720" transform="translate(-113 -124.6) scale(1.2)" href="data:image/webp;base64,${bytes.toString('base64')}"/></svg>\n`;
 writeFileSync(target,svg);rmSync(source);
}
console.log('School uniform and mermaid centered; base dog artwork fitted.');
