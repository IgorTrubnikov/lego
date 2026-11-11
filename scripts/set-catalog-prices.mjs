// Apply the current price list without changing part IDs or artwork.
import {readdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const prices={haircuts:0,faces:0,clothes:0,pants:0,suits:550,accessories:100,animals:200,transport:150};
let changed=0;
for(const folder of [...Object.keys(prices),'children'])for(const filename of await readdir(path.join(root,folder))){
 const match=filename.match(/^(.+)__(\d+)__(.+)\.(svg|webp|png)$/);
 if(!match)continue;
 const [,slug,,name,ext]=match;
 const price=folder==='children'?(slug==='catalog-infant'?100:300):prices[folder];
 const target=`${slug}__${price}__${name}.${ext}`;
 if(target!==filename){await rename(path.join(root,folder,filename),path.join(root,folder,target));changed++;}
}
console.log(`Updated ${changed} catalog prices; artwork and stable IDs preserved.`);
