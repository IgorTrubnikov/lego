// Optimize supplied review screenshots without cropping or changing their contents.
// Usage: node scripts/prepare-reviews.mjs /path/to/extracted/screenshots
import {spawnSync} from 'node:child_process';
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),source=process.argv[2];
if(!source)throw Error('Provide a directory containing review screenshots.');
const dir=path.join(root,'assets/reviews');
for(const name of ['thumbs','full'])mkdirSync(path.join(dir,name),{recursive:true});
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
const files=readdirSync(source).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
if(!files.length)throw Error('No screenshots found.');
const reviews=files.map((file,index)=>{
 const id='review-'+String(index+1).padStart(2,'0'),input=path.join(source,file);
 const full=`assets/reviews/full/${id}.webp`,thumb=`assets/reviews/thumbs/${id}.webp`;
 magick([input,'-auto-orient','-strip','-quality','94','-define','webp:method=6',path.join(root,full)]);
 magick([input,'-auto-orient','-resize','640x>','-strip','-quality','90','-define','webp:method=6',path.join(root,thumb)]);
 const dimensions=f=>magick(['identify','-format','%w %h',path.join(root,f)]).split(' ').map(Number);
 const [width,height]=dimensions(thumb),[fullWidth,fullHeight]=dimensions(full);
 return {id,title:'Отзывы покупателей · '+String(index+1).padStart(2,'0'),alt:'Скриншот отзывов покупателей LEGO.FROM.TEUILOR, лист '+(index+1),thumb,full,width,height,fullWidth,fullHeight};
});
writeFileSync(path.join(dir,'reviews.json'),JSON.stringify(reviews,null,2)+'\n');
console.log(`Prepared ${reviews.length} uncut review screenshots.`);
