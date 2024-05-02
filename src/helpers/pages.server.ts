import process from 'node:process'

import { globby } from 'globby'

const pages: string[] = []

export async function getStaticAppPages() {
  if (pages.length) {
    return pages
  }

  if (process.env.NODE_ENV === 'development') {
    // ref: https://github.com/vercel/next.js/issues/3351#issuecomment-348162538
    const pageData = await globby([`**/page.tsx`, '!_*.tsx'], {
      cwd: `${process.cwd()}/src/app`,
    })
    return pageData.map((item) => {
      if (item === 'page.tsx') {
        return '/'
      }
      return item.replace('/page.tsx', '')
    })
  }
  const pageData = await globby(['page.js', '**/page.js', '!_**/page.js'], {
    cwd: `${process.cwd()}/.next/server/app`,
  })
  return pageData.map((item) => {
    if (item === 'page.js') {
      return '/'
    }
    return item.replace('/page.js', '')
  })
}
