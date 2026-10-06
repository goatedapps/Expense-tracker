import {cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const dest=path.join(root,'www');
await rm(dest,{recursive:true,force:true});await mkdir(dest,{recursive:true});
// Explicit allowlist: never bundle personal backups, credentials or build files.
for(const name of ['index.html','styles.css','js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'])await cp(path.join(root,name),path.join(dest,name),{recursive:true});
console.log('Prepared offline web assets for Android.');
