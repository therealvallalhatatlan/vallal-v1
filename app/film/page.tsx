import FilmHero from "@/components/film/FilmHero";
import FilmSupportForm from "@/components/film/FilmSupportForm";

export default function FilmPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-white">

      <div className="fixed inset-0 -z-10">
        <video
          className="h-full w-full object-cover"
          src="/videos/bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0" />
        
      </div>
      <div className="relative isolate -mt-20 w-full bg-black/0">
        <div className="mx-auto max-w-5xl space-y-12 px-0 py-16">
          <div className="bg-black/90 mt-[80vh]">
          <FilmSupportForm />
          </div>
        </div>
      </div>
    </div>
  );
}