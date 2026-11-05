// One-time/local photo preparation; not required by the Pages build.
// Usage: node scripts/import-gallery.mjs /directory/with/originals
// Requires ImageMagick with HEIC support. Originals are read only.
import {readFile,readdir,mkdir,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const inputRoot=process.argv[2];
if(!inputRoot)throw new Error('Укажите папку с исходными фотографиями. Требуется ImageMagick с поддержкой HEIC.');
async function walk(dir){let result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,entry.name);if(entry.isDirectory())result.push(...await walk(f));else if(entry.isFile())result.push(f);}return result;}
function magick(args){const result=spawnSync('magick',args,{encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr);return result.stdout.trim();}
const works=JSON.parse(await readFile(path.join(root,'assets/gallery/works.json'),'utf8'));
const inputs=await walk(path.resolve(inputRoot));
await mkdir(path.join(root,'assets/gallery/thumbs'),{recursive:true});await mkdir(path.join(root,'assets/gallery/full'),{recursive:true});
const prepared=[];
for(const work of works){
 const candidates=inputs.filter(f=>path.basename(f)===work.source);
 if(!candidates.length&&work.thumb&&work.full){
  await access(path.join(root,work.thumb));await access(path.join(root,work.full));prepared.push(work);continue;
 }
 if(candidates.length!==1)throw new Error(`Для ${work.source} найдено ${candidates.length} файлов, нужен один.`);
 const source=candidates[0]+'[0]';
 const base=[source,'-auto-orient','-colorspace','sRGB'];
 const thumb=path.join(root,'assets/gallery/thumbs',work.id+'.webp'),full=path.join(root,'assets/gallery/full',work.id+'.webp');
 magick([...base,'-resize','720x720>','-strip','-quality','80',thumb]);
 magick([...base,'-resize','1800x1800>','-strip','-quality','86',full]);
 const [width,height]=magick(['identify','-format','%w %h',thumb]).split(' ').map(Number);
 const [fullWidth,fullHeight]=magick(['identify','-format','%w %h',full]).split(' ').map(Number);
 prepared.push({...work,thumb:'assets/gallery/thumbs/'+work.id+'.webp',full:'assets/gallery/full/'+work.id+'.webp',width,height,fullWidth,fullHeight});
 console.log(work.source+' → '+work.id);
}
await writeFile(path.join(root,'assets/gallery/works.json'),JSON.stringify(prepared,null,2)+'\n');
