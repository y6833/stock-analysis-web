import fs from 'fs'
import path from 'path'

function walk(dir, cb) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p, cb)
    else if (f.endsWith('.ts')) cb(p)
  }
}

function fix(file) {
  let c = fs.readFileSync(file, 'utf8')
  const orig = c

  if (c.includes("const API_URL = 'http://localhost:7001/api'")) {
    if (!c.includes('getApiRoot')) {
      const importLine = "import { getApiRoot } from '@/utils/apiBase'\n"
      const m = c.match(/^(import .+\n)+/m)
      c = m ? c.replace(m[0], m[0] + importLine) : importLine + c
    }
    c = c.replace("const API_URL = 'http://localhost:7001/api'", 'const API_URL = getApiRoot()')
  }

  if (c.includes("baseURL: 'http://localhost:7001'")) {
    if (!c.includes('getApiBaseUrl')) {
      const importLine = "import { getApiBaseUrl } from '@/utils/apiBase'\n"
      const m = c.match(/^(import .+\n)+/m)
      c = m ? c.replace(m[0], m[0] + importLine) : importLine + c
    }
    c = c.replace("baseURL: 'http://localhost:7001'", 'baseURL: getApiBaseUrl()')
  }

  if (c.includes("const API_BASE_URL = 'http://localhost:7001'")) {
    if (!c.includes('getApiBaseUrl')) {
      const importLine = "import { getApiBaseUrl } from '@/utils/apiBase'\n"
      const m = c.match(/^(import .+\n)+/m)
      c = m ? c.replace(m[0], m[0] + importLine) : importLine + c
    }
    c = c.replace("const API_BASE_URL = 'http://localhost:7001'", 'const API_BASE_URL = getApiBaseUrl()')
  }

  if (c !== orig) {
    fs.writeFileSync(file, c)
    console.log('fixed:', file)
  }
}

walk('src/services', fix)
walk('src/constants', fix)
