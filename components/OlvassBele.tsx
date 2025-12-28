export default function OlvassBele() {
  const links = [
    {
      label: "Reddit",
      href: "https://reddit.com/r/vallalhatatlan",
      description: "Sztorik, kommentek, közösség",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/vallalhatatlan2000",
      description: "Posztok és frissítések",
    },
    {
      label: "Patreon",
      href: "https://www.patreon.com/c/vallalhatatlan",
      description: "Extra cuccok és támogatás",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-3xl mx-auto">
      <header className="mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-neutral-100">
          Olvass bele
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          Ha kíváncsi vagy a hangulatra: itt találsz részleteket és beszélgetéseket.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-lime-400/30 bg-black/70 p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-lime-400/70"
          >
            <div className="text-lime-300 font-semibold">{link.label}</div>
            <div className="mt-2 text-sm text-neutral-300">{link.description}</div>
            <div className="mt-4 text-xs text-neutral-400 group-hover:text-neutral-200">
              Megnézem →
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
