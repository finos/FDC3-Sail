import { LogoSail } from "@/components/ui"

const GITHUB_REPO = "https://github.com/finos/fdc3-sail"

/**
 * Bottom strip promoting Sail v3 and community entry points (GitHub + meetings QR).
 */
export function SailV3JoinBanner() {
  return (
    <aside
      className="border-border bg-muted/70 text-foreground ring-primary/15 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-t-2 border-t-primary/40 px-4 py-3.5 ring-1 ring-inset sm:px-5"
      aria-label="Sail v3 and community"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <LogoSail className="text-primary size-11 shrink-0 sm:size-12" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold tracking-tight sm:text-xl">Sail v3</span>
            <span className="bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
              Coming soon
            </span>
          </p>
          <p className="text-foreground text-sm font-semibold leading-snug sm:text-base">
            Get involved — star the repo on GitHub and join Sail community meetings.
          </p>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-end justify-end gap-6">
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noreferrer noopener"
          className="hover:bg-background/80 flex flex-col items-center gap-1 rounded-md p-1 transition-colors"
        >
          <img
            src="/promo/qr-sail-github.svg"
            alt="QR code linking to the Sail repository on GitHub"
            width={72}
            height={72}
            className="bg-background rounded-sm shadow-sm"
          />
          <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            GitHub
          </span>
        </a>
        <div className="flex flex-col items-center gap-1 rounded-md p-1">
          <img
            src="/promo/qr-sail-meetings.svg"
            alt="QR code for Sail community meetings"
            width={72}
            height={72}
            className="bg-background rounded-sm shadow-sm"
          />
          <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Meetings
          </span>
        </div>
      </div>
    </aside>
  )
}
