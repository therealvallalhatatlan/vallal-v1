import withAuth from '@/components/withAuth';

function ProfilePage() {
  return (
    <main className="px-6 py-10 text-neutral-100">
      <section className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">profil</p>
          <h1 className="text-3xl font-semibold text-lime-400">Üdvözöllek a védett profil oldalon!</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Itt éred el a Crew-tagoknak szóló exkluzív tartalmakat és rendelésinformációkat.
          </p>
        </div>
      </section>
    </main>
  );
}

export default withAuth(ProfilePage);
