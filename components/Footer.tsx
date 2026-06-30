export default function Footer() {
  return (
    <footer className="px-6 py-16 bg-black border-t border-zinc-800 mt-20 font-mono text-gray-200">
      <div className="max-w-5xl mx-auto text-center">
        <h3 className="text-xl font-semibold mb-4 text-lime-400">Vállalhatatlan</h3>

        <div className="space-x-6 text-gray-400 mb-6">
          <a href="https://reddit.com/r/vallalhatatlan" target="_blank" className="hover:text-lime-300 transition-colors">Reddit</a>
          <a href="mailto:therealvallalhatatlan@gmail.com" className="hover:text-lime-300 transition-colors">Email</a>
          <a href="https://www.youtube.com/@V%C3%A1llalhatatlan01" className="hover:text-lime-300 transition-colors">Youtube</a>
          <a href="https://www.facebook.com/vallalhatatlan2000" className="hover:text-lime-300 transition-colors">Facebook</a>
          <a href="https://vallalhatatlan.substack.com/" className="hover:text-lime-300 transition-colors">Substack</a>
        </div>

        <p className="text-gray-500 text-sm mb-2">
          © 2025 Vállalhatatlan / rickandpam.digital
        </p>

        <p className="text-gray-600 text-xs">
          Terms of Service • Privacy Policy
        </p>
      </div>
    </footer>
  );
}
