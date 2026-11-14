// Compatibility entry point: use only the uploaded original WebPs and reviewed masks.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const result=spawnSync('python',[fileURLToPath(new URL('./prepare-original-torsos.py',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
