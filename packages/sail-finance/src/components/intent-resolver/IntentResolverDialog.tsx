import { Check, AppWindow } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui"

import { useIntentResolverStore } from "../../contexts"

/**
 * Dialog for selecting an app to handle an FDC3 intent.
 *
 * Shown when multiple apps can handle a raised intent.
 * User selects one app, or cancels to reject the intent.
 */
export function IntentResolverDialog() {
  const { isOpen, intentName, handlers, context, selectHandler, cancel } = useIntentResolverStore()

  // Get context type for display
  const contextType =
    context && typeof context === "object" && "type" in context
      ? (context as { type: string }).type
      : "unknown"

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && cancel()}>
      <SheetContent side="bottom" className="max-h-[60vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <AppWindow className="size-5" />
            Select Application
          </SheetTitle>
          <SheetDescription>
            Multiple applications can handle the <strong>{intentName}</strong> intent for{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">{contextType}</code>.
            <br />
            Select which application should receive this intent:
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-2 py-2 max-h-[40vh] overflow-y-auto">
          {handlers.map(handler => (
            <button
              key={handler.instanceId || handler.appId}
              onClick={() => selectHandler(handler)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left group"
            >
              {/* App icon or fallback */}
              <div className="flex-shrink-0 size-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {handler.appIcon ? (
                  <img
                    src={handler.appIcon}
                    alt=""
                    className="size-full object-cover"
                    onError={e => {
                      // Fallback to icon on error
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
                  <AppWindow className="size-5 text-muted-foreground" />
                )}
              </div>

              {/* App info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{handler.appName || handler.appId}</div>
                <div className="text-sm text-muted-foreground">
                  {handler.isRunning ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-2 rounded-full bg-green-500" />
                      Running instance
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-2 rounded-full bg-gray-400" />
                      Will launch app
                    </span>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Check className="size-5 text-primary" />
              </div>
            </button>
          ))}
        </div>

        {handlers.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No applications available to handle this intent.
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <button
            onClick={cancel}
            className="w-full py-2 px-4 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
