import {readFile,writeFile,mkdir} from 'node:fs/promises';
const template=await readFile(new URL('./app.html',import.meta.url),'utf8');
if(!template.includes('id="cloudPanel"'))throw new Error('Cloud UI missing in template');
await mkdir(new URL('./public/',import.meta.url),{recursive:true});
await writeFile(new URL('./public/index.html',import.meta.url),template);
await writeFile(new URL('./public/_routes.json',import.meta.url),JSON.stringify({version:1,include:['/api/*','/auth/*'],exclude:[]}));
await writeFile(new URL('./public/_headers',import.meta.url),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
`);
console.log('Built Cloudflare Pages assets from the hosted app.');
