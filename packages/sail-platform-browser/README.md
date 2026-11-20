# `@finos/sail-platform-browser`

Shared browser helpers for Sail shells (popup close watching). Not FDC3/WCP.

Shell-specific session implementations (`SailOneUserSession`, `SailFinanceUserSession`)
own open/close mounting and layout persistence; this package only shares the popup
lifecycle helper used when apps open as browser windows.
