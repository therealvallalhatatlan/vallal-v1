import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
  style: "italic",
});

export default function Footer() {
  return (
    <footer
      className="px-6 py-6 bg-black border-t border-zinc-800 font-mono text-gray-200">
      <div className="max-w-5xl mx-auto text-center">

        <div className="space-x-6 text-zinc-100/50 hover:text-zinc-100 uppercase mb-6" style={{ fontFamily: "var(--font-mono-tech)" }}>
          <a
            href="https://reddit.com/r/vallalhatatlan"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-100 transition-colors"
          >
            Reddit
          </a>

          <a
            href="mailto:therealvallalhatatlan@gmail.com"
            className="hover:text-lime-100 transition-colors"
          >
            Email
          </a>

          <a
            href="https://www.youtube.com/@V%C3%A1llalhatatlan01"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-100 transition-colors"
          >
            Youtube
          </a>

          <a
            href="https://www.facebook.com/vallalhatatlan2000"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-100 transition-colors"
          >
            Facebook
          </a>

          <a
            href="https://vallalhatatlan.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lime-100 transition-colors"
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