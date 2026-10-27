export function onRequest({request}) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405,headers:{Allow:'GET, HEAD'}});
  const slug = new URL(request.url).searchParams.get('post');
  const path = slug && /^[a-z0-9][a-z0-9-]{0,199}$/.test(slug) ? '/p/' + slug : '/archive';
  return new Response(null, {status:302, headers:{Location:'https://theconstructionedge.substack.com' + path,'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
