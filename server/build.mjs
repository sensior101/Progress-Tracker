import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
const template=await readFile(new URL('./app.html',import.meta.url),'utf8');
if(!template.includes('id="cloudPanel"'))throw new Error('Cloud UI missing in template');
await mkdir(new URL('./public/',import.meta.url),{recursive:true});
await cp(new URL('./assets/sticker-packs/',import.meta.url),new URL('./public/sticker-packs/',import.meta.url),{recursive:true});
const basicSheet=await readFile(new URL('./assets/sticker-packs/basic.svg',import.meta.url),'utf8');
const basicArt=[...basicSheet.matchAll(/<g transform="translate\(66 13\) scale\(1\.08\)" ([\s\S]*?)<\/g>/g)];
if(basicArt.length!==20)throw new Error('Expected 20 basic stickers');
await Promise.all(basicArt.map((match,index)=>writeFile(
  new URL('./public/sticker-packs/basic-'+index+'.svg',import.meta.url),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 88 88"><g '+match[1]+'</g></svg>'
)));
await writeFile(new URL('./public/index.html',import.meta.url),template);
await writeFile(new URL('./public/_routes.json',import.meta.url),JSON.stringify({version:1,include:['/api/*','/auth/*'],exclude:[]}));
await writeFile(new URL('./public/_headers',import.meta.url),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
`);
console.log('Built Cloudflare Pages assets from the hosted app.');
