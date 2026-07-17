# **FDC3-Sail: FAQ**

### **What is Sail and how does it relate to FDC3?**

Sail is a free, open source, web-based, FDC3 desktop agent. , where people are able to test out the FDC3 application interoperability. FDC3 is the standard, Sail is the digital playground.

Sail lets anyone test drive apps inside a browser without having to download heavy software. This is especially useful for:

- Organisations where policies restrict installing new software but where FDC3 would be useful.
- People who want to carry out a low-stakes evaluation of Sail or FDC3 before committing further to the platform.
- Developers who need a free reference implementation of the FDC3 standard that they can use to test their application's interoperability.

### **What is FDC3 for exactly?**

FDC3 is designed to stop users having to manually copy and paste data between different programs in order to view information. It provides a protocol so that applications can share data and trigger workflows between each other automatically.

To learn more about FDC3, see:

- [What is FDC3?](https://fdc3.finos.org)
- [FDC3 overview slideshow](https://docs.google.com/presentation/d/1yvttxu1y1ffiEmmaJtDRe_5sY2soCR-Tk7UAXQbbpoE/edit?slide=id.p#slide=id.p)

<img alt="Desktop Agent Diagram" src="https://fdc3.finos.org/assets/images/api-3-275a05da9ce0df54edd7e9f602b4841c.png" width="450" align="right">

### **What is a desktop agent?**

A desktop agent acts as a central 'traffic controller' running on your computer. Rather than applications communicating with one another directly, the agent sits in the middle, listening for data from App A and securely routing it to App B. Desktop agents do this in two ways:

- **Using intents**: An intent is like a request for an action to be performed. The desktop agent will receive intent requests coming from open applications, and passes them onto the other applications in order to complete a workflow.
- **By Broadcasting Context**: Applications can broadcast small items of data (called context) on various types of channel. The desktop agent manages the channel system and ensures that applications receive messages from the correct channels.

### **What is FINOS and the Linux Foundation?**

- The Linux Foundation is the world's largest non-profit group, helping industries and organizations to build free to use, open technology together. [Linux Foundation Website](https://www.linuxfoundation.org/about?_gl=1*1wh6qbm*_up*MQ..*_ga*MjAxODc1NTA1NS4xNzg0MTA5NzA4*_ga_BKD8K5CRV0*czE3ODQxMDk3MDYkbzEkZzAkdDE3ODQxMDk3MDYkajYwJGwwJGgw*_ga_FBYHX832ZD*czE3ODQxMDk3MDYkbzEkZzAkdDE3ODQxMDk3MDYkajYwJGwwJGgw)
- FINOS (the Fintech open source Foundation) is the Fintech Open Source Foundation, a subsidiary of the Linux Foundation. They host the FDC3 standard. [FINOS Website](https://www.finos.org/about-us)

### **How can beginners easily start to use FDC3 without prior knowledge about programming?**

Beginners do not need to code to use FDC3. It is normally built into many modern financial programs. As a user, all you need to do is to click applications and channels to link applications together. For example, click a stock ticker in the news app and watch as your other windows update automatically. You can try this out in FDC3 at [sail.fdc3.finos.org](https://sail.fdc3.finos.org).

### **How can FDC3 benefit user experience?**

FDC3 Sail makes working across multiple finance apps smoother and faster by doing the following:

- Removing double-typing, all you need to do is click once to update all of your apps.
- It organizes the applications via workspaces and tiles.
- It allows applications to stay on-task via broadcasting of shared contextual information describing the subject of the task.

### **What will happen to my applications if I go offline?**

FDC3 Sail allows applications to communicate with one another over encrypted websocket communications via the Sail server. If the server can't be reached, the applications in your browser won't be able to interoperate.

### **If one of my apps crashes, how would this affect my other apps?**

A single app crash would not affect the overall Sail application window. This is because FDC3 applications are loosely connected independent programs. So if your charting app crashes your news feed, chat window and other trading platforms will be able to continue to talk to each other completely unaffected.

### **How does FDC3 protect my financial data?**

Applications cannot spy on your desktop or grab data from other platforms freely, as applications have no direct relationship with their counterparts.

This is because FDC3 Sail makes use of browser sandboxing: individual applications are protected are unable to inspect one anther if they are come from different URL domains.

FDC3 also provides further security and identity features beyond this to stop applications from impersonating one another and allowing encrypted app-to-app communication. See more at [FDC3 Website - Security & Identity](https://fdc3.finos.org/docs/next/api/security)

### **What devices can FDC3 Sail be used on?**

FDC3 Sail can be used on an standards-compliant browser. It is built to be platform agnostic, meaning that it runs seamlessly across many operating systems.

### **How does Sail act as a 'sandbox'?**

Sail will run directly inside any ordinary browser. It creates an isolated, 'digital playground'. In this space developers and designers can drop in their new financial applications to see if they are able to follow the FDC3 rules correctly, basically seeing if their app is able to talk to other apps directly. It mimics a complex trader desktop without the need to install heavy, high-security corporate systems onto your device.

Browsers contain a built in "Sandbox" which prevents applications on different hosts from interfering with each other. This means, applications are distinct in FDC3. However, FDC3 provides a standardized way for applications to communicate intents and context between one another, bridging the traditional restrictions of the sandbox. This is implemented in Sail via [PostMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

### **How Can I Use Sail to test workflows?**

You can use Sail as a lightweight desktop agent when validating FDC3 workflows:

- **Catch integration issues early:** Many workflow failures happen when one app sends context or intents that another app cannot handle. Sail lets you exercise those interactions in a browser and surface mismatches before they reach a production environment.

- **Speed up development:** Testing on a bank network is often slow and heavily gated. Sail provides a local sandbox where teams can iterate in minutes instead of waiting on full infrastructure.

- **Verify core FDC3 behavior:** Sail confirms that apps can launch, share context, and raise intents as expected—giving you confidence that a workflow works end to end before wider rollout.

### **How can I add new applications into Sail?**

Firstly, let's talk about app directories: an app directory contains a number of AppD records. Each record describes a single FDC3 application. This tells the desktop agent exactly where each application lives, its name, and what kind of data it sends/receives. Sail can support multiple app directories. To add a new directory:

1.  Hit the ellipsis icon on the top right of the Sail UI to open the config screen.
2.  Select the directories tab.
3.  Press "Click to add a new directory"
4.  Enter the directory URL and give it a name.
5.  Slide the activation slider to the right to enable that directory.
6.  Close the config screen and go to the "Start Application" panel.
7.  You should see the new applications from your directory listed there.

### **What do I need to do in order to create my own app which is compatible with FDC3?**

You are able to turn any basic financial web page into an FDC3 app by following these steps:

1. Web apps cannot talk to each other directly through FDC3 without a host framework. Your app must be run inside an enterprise container or a browser extension.
2. Create your app definition by describing it so that the desktop agent knows how to launch it, and what data it supports. Use a configuration file in JSON to host this.
3. The web app needs to be actively listening for incoming data or intents from the rest of the desktop. You can do this by adding the code to handle data using JS.
4. Test your app using FDC3-Sail. To do this you will need to serve your application locally. Then configure your App Definition JSON, drop it into Sail's local directory, and use Sail's built-in [FDC3 Workbench](https://github.com/finos/FDC3/blob/main/toolbox/fdc3-workbench/README.md) to mock and monitor interactions.
   \*\*This is a heavily simplified explanation, so see these links for further understanding:

- Learn through the online course, [How to develop with FDC3](https://training.linuxfoundation.org/training/developing-solutions-with-fdc3-lfd237/)
- Also see [toolbox package holding sample web applications](https://github.com/finos/FDC3/tree/main/toolbox/fdc3-example-apps)
- Don't forget, [Using the FDC3 Workbench](https://finsemble.interop.io/docs/connect-apps/interop/FDC3Workbench/) which provides more in-depth examples and more advanced intel on the code.
