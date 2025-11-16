export default function Footer() {
  return (
    <footer className="px-6 py-16 bg-black border-t border-zinc-800 mt-20">
      <div className="max-w-5xl mx-auto text-center">
        <h3 className="text-xl font-semibold mb-4">Vállalhatatlan</h3>

        <div className="space-x-6 text-gray-400 mb-6">
          <a href="https://reddit.com/r/vallalhatatlan" target="_blank">Reddit</a>
          <a href="mailto:therealvallalhatatlan@gmail.com">Email</a>
          <a href="https://www.youtube.com/@V%C3%A1llalhatatlan01">Youtube</a>
          <a href="https://www.facebook.com/vallalhatatlan2000">Facebook</a>
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
