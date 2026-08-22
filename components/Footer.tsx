import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
  style: "italic",
});

export default function Footer() {
  return (
    <footer
      className="px-6 py-16 bg-transparent border-t border-zinc-800 mt-20 font-mono text-gray-200"
      style={{
        backgroundImage: "url('/img/footer-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-5xl mx-auto text-start">
        <h3
          className={`${montserrat.className} text-xl font-extrabold italic mb-4 mt-12 text-lime-100/80`}
        >
          Vállalhatatlan
        </h3>

        <div className="space-x-6 text-zinc-100 mb-6">
          <a
            href="https://reddit.com/r/vallalhatatlan"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-300 transition-colors"
          >
            Reddit
          </a>

          <a
            href="mailto:therealvallalhatatlan@gmail.com"
            className="hover:text-lime-300 transition-colors"
          >
            Email
          </a>

          <a
            href="https://www.youtube.com/@V%C3%A1llalhatatlan01"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-300 transition-colors"
          >
            Youtube
          </a>

          <a
            href="https://www.facebook.com/vallalhatatlan2000"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-300 transition-colors"
          >
            Facebook
          </a>

          <a
            href="https://vallalhatatlan.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-300 transition-colors"
          >
            Substack
          </a>
        </div>

        <p className="text-zinc-300/70 text-sm mb-2">
          © 2025 Vállalhatatlan / rickandpam.digital
        </p>

        <p className="text-zinc-500 text-xs">
          Terms of Service • Privacy Policy
        </p>
      </div>
    </footer>
  );
}