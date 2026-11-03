// Client ID is public. The secret is entered directly into Wrangler's hidden prompt.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const clientId=process.argv[2];
if(!clientId||!/^[A-Za-z0-9_.-]{5,150}$/.test(clientId)) {
  console.error('Usage: node configure-auth.mjs <GitHub OAuth Client ID>');process.exit(1);
}
const config=new URL('./wrangler.toml',import.meta.url);
const original=await readFile(config,'utf8');
await writeFile(config,original.replace(/^GITHUB_CLIENT_ID = .*$/m,'GITHUB_CLIENT_ID = '+JSON.stringify(clientId)));
const wrangler=fileURLToPath(new URL('./node_modules/wrangler/bin/wrangler.js',import.meta.url));
const cwd=fileURLToPath(new URL('./',import.meta.url));
const run=args=>execFileSync(process.execPath,[wrangler,...args],{cwd,stdio:'inherit'});
console.log('Enter the GitHub Client Secret at the following Wrangler prompt. It is stored in Cloudflare, not in this repository.');
run(['pages','secret','put','GITHUB_CLIENT_SECRET','--project-name','sensior-progress-tracker']);
execFileSync(process.execPath,[fileURLToPath(new URL('./build.mjs',import.meta.url))],{cwd,stdio:'inherit'});
run(['pages','deploy','public','--project-name','sensior-progress-tracker','--branch','main','--commit-dirty=true']);
// The production alias can take a few seconds to switch to the new deployment.
let ready=false;
for(let attempt=0;attempt<10;attempt++) {
  try {
    const response=await fetch('https://sensior-progress-tracker.pages.dev/api/session');
    const session=await response.json();
    if(response.ok&&session.loginReady) {ready=true;break;}
  } catch { /* Retry a transient deployment/edge propagation failure. */ }
  if(attempt<9)await new Promise(resolve=>setTimeout(resolve,2000));
}
if(!ready)throw new Error('Login setup is not live yet. Check deployment status and Cloudflare secret configuration.');
console.log('GitHub login is enabled: https://sensior-progress-tracker.pages.dev');
