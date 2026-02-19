import { Card } from "@/components/Card";
import { CRTFrame } from "@/components/CRTFrame";
import KillSwitchClock from "@/components/KillSwitchClock";
import { getSocialLinks } from "@/lib/config";

const statusLines = [
  { label: "OPERATOR", value: "ACTIVE" },
  { label: "CONTROL", value: "HELD" },
  { label: "ACCESS", value: "VERIFIED" },
  { label: "CHANNEL", value: "STABLE" },
];

const telemetryLines = [
  "[SYS] heartbeat stable / watchdog engaged",
  "[AUTH] operator session confirmed",
  "[CTRL] write authority retained by operator",
  "[INT] remote override path available",
  "[AUDIT] supervision cadence: continuous",
];

export default function KillSwitchPanel() {
  const socialLinks = getSocialLinks();

  const socialEntries = [
    { key: "facebook", label: "Facebook", href: socialLinks.facebook },
    { key: "youtube", label: "YouTube", href: socialLinks.youtube },
    { key: "substack", label: "Substack", href: socialLinks.substack },
  ].filter((entry): entry is { key: string; label: string; href: string } => Boolean(entry.href));

  return (
    <Card className="border border-green-400/20 bg-black/70">
      <CRTFrame intensity="subtle" className="rounded-2xl border border-green-400/20 bg-black/60 p-6 md:p-8">
        <div className="space-y-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-green-300/70">Kill Switch Console</p>
              <h1 className="text-2xl md:text-4xl font-semibold text-green-100">Operator In Control</h1>
              <p className="max-w-2xl text-sm md:text-base text-green-200/80">
                Az operátor szabad, teljes hozzáféréssel rendelkezik, a kontroll nála van, és aktívan operálja a
                rendszert.
              </p>
            </div>
            <KillSwitchClock />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {statusLines.map((line) => (
              <div
                key={line.label}
                className="flex items-center justify-between rounded-lg border border-green-400/20 bg-green-500/5 px-4 py-3"
              >
                <span className="text-xs uppercase tracking-[0.22em] text-green-300/70">{line.label}</span>
                <span className="text-sm font-semibold text-lime-300">{line.value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-green-400/20 bg-black/50 p-4 md:p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-green-300/70">Telemetry Feed (read-only)</p>
            <div className="space-y-2 font-mono text-xs md:text-sm text-green-200/80">
              {telemetryLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          {socialEntries.length > 0 && (
            <div className="rounded-lg border border-green-400/20 bg-black/50 p-4 md:p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-green-300/70">Social Access</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {socialEntries.map((entry) => (
                  <a
                    key={entry.key}
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-green-400/25 bg-green-500/10 px-4 py-3 text-sm font-semibold text-lime-300 transition hover:border-green-300/40 hover:bg-green-500/15"
                  >
                    {entry.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </CRTFrame>
    </Card>
  );
}
