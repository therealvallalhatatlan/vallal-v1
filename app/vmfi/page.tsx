import MainContent from "@/components/MainContent";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import VideoPlayer from "@/components/video/VideoPlayer";
import VmfiContent from "@/components/vmfi/VmfiContent";

export const metadata = {
  title: "Vállalhatatlan MikroFilm Intézet",
};

export default function Page() {
  return (
    <MainContent>
      <Navigation />

      <div className="min-h-screen lg:h-screen lg:flex lg:items-stretch">
        {/* Left: sticky video (wider on desktop) */}
        <div className="w-full lg:w-[61.8%] h-full flex items-stretch p-0 bg-black">
          <div className="w-full h-full sticky top-0">
            <VideoPlayer />
          </div>
        </div>

        {/* Right: content column (narrower on desktop) */}
        <div className="w-full lg:w-[38.2%] h-full overflow-y-auto p-6 lg:p-12 scrollbar-thin scrollbar-thumb-lime-500/20 scrollbar-track-zinc-950">
          <VmfiContent />
        </div>
      </div>

      <Footer />
    </MainContent>
  );
}
