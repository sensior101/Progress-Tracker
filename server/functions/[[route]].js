import worker from '../src/worker.mjs';
export function onRequest({request, env}) {
  return worker.fetch(request, env);
}
