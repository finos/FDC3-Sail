# io.Connect from interop.io

## 1. Use The Client Libraries

- Full Documentation of the [Client Library Setup](https://docs.interop.io/browser/getting-started/fdc3-compliance/index.html)

1.  Install The Connectifi NPM Module like this:

```
cd training
npm install @interopio/fdc3
npm install @interopio/browser-platform
```

## 2. Start The Apps in io.Connect Browser

- [Full Documentation is Provided Here](Io.Connect.pdf)

1.  Go to https://sandbox.cloud.interop.io in Chrome.
2.  On the top bar of the screen, hit the "+" button and select "Create an FDC3 app" from the menu.
3.  A new panel will open up with lots of apps, including the FDC3 Workbench. In the "App importer" tab, paste the URL of one of the training apps:

- http://localhost:5000/static/tradelist/index.html
- http://localhost:5000/static/pricer/index.html

4. Give a name, e.g. "tradelist", "pricer" and click Load and you'll see your applications appear.

## Open Questions

- Setting User Channels for apps
- Loading multiple instances of apps / reloading apps
- AppD Record - how to load this up?
