import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-5">
      <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">404 · Page not found</p>
        <h1 className="mt-3 font-serif text-4xl text-[#172b4d]">This page isn’t here.</h1>
        <p className="mt-4 text-sm leading-6 text-[#697586]">The link may be incorrect, or the page may have moved.</p>
        <Link href="/" className="mt-7 inline-block rounded-full bg-[#172b4d] px-6 py-3 text-sm font-semibold text-white">Return home</Link>
      </div>
    </main>
  )
}
