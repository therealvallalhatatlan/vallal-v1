export default function Navigation() {
  return (
    <nav className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex w-full items-center justify-end gap-6 text-sm uppercase tracking-[0.18em] text-neutral-300">
        <a href="/link-4" className="hover:text-lime-300 transition-colors">
          <span className="text-lime-300">Új! </span>
          Online Reader
        </a>
        <a
          href="/checkout"
          className="rounded-lg bg-lime-500 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-black transition-colors hover:bg-lime-400"
        >
          Letöltés
        </a>
      </div>
    </nav>
  )
}
