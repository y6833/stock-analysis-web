/**
 * Cloudflare Pages Function — 可选 API 反代
 * 在 Pages 设置 BACKEND_URL 环境变量指向 Egg.js 后端
 * 前端 VITE_API_BASE_URL 留空，请求走 /api/* 同域反代
 */
export async function onRequest(context) {
  const { request, env } = context
  const backend = env.BACKEND_URL || env.VITE_API_BASE_URL

  if (!backend) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'BACKEND_URL not configured. Set it in Cloudflare Pages environment variables.',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, backend.replace(/\/$/, ''))

  const headers = new Headers(request.headers)
  headers.delete('host')

  const response = await fetch(
    new Request(target.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual',
    }),
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
