# io.Connect from interop.io

## 1. Use The Client Libraries

- Full Documentation of the [Client Library Setup](https://docs.interop.io/browser/getting-started/fdc3-compliance/index.html)

## 1. Update the Apps to Use io.Connect

```
cd training
npm install @interopio/fdc3
npm install @interopio/browser
npm install @interopio/widget
```

2.  Replace `fdc3Ready()` with `ioConnectClientSetup()` in tradelist.ts and pricer.ts, e.g.

```
// lab-6
ioConnectClientSetup().then(() => {
```

## 2. Start The Apps in io.Connect Browser

- [Full Documentation is Provided Here](Io.Connect.pdf)

1.  Go to https://sandbox.cloud.interop.io in Chrome.
2.  On the top bar of the screen, hit the Interop.Io logo on the top left and select "Create an FDC3 app" from the menu.
3.  A new panel will open up with lots of apps, including the FDC3 Workbench. In the "App importer" tab, paste the URL of the training app directory:

- http://localhost:5000/static/opt/io.connect/training-appd.v2.json

4.  Press Load. (Nothing appears to happen after this).

5.  Click the interop.io logo again, you should see tradelist and pricer apps towards the bottom of the menu, which you can open and add to the desktop.
