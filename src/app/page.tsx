import Link from 'next/link'

import { getStaticAppPages } from '@/helpers/pages.server'

export default async function Home() {
  const pages = await getStaticAppPages()

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <ul className='flex flex-col'>
        {pages.map((item) => {
          return (
            <li key={item}>
              <Link href={item} className='inline-block w-full text-cyan-500 underline hover:text-cyan-400'>{item}</Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
