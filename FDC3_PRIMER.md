# An FDC3 Primer for Electron and Web Developers 

## What is FDC3?

FDC3 is an application interoperability standard originating in the world of financial desktop applications (FDC3 = *Financial Desktop Connectivity and Collaboration Consortium*).  The financial desktop world (think Bloomberg terminals with multiple screens filled with financial data and trading windows - see illustration below) has historically put cross-application workflow at a premium.  FDC3 provides a common language for interop,  allowing applications to share data and functionality by writing to a single standard.  

![image](/images/terminal.webp)

The FDC3 standard has 3 pillars:

- *API* - the client API which standardizes implementation across apps
- *Context Data and Intents* - a standard language of 'nouns' and 'verbs' that apps use to talk to one another
- *App Directory* - defines a standard REST api and schema for directories that house app metadata and identity


This project implements all aspects of FDC3.  

- The *API* is implemented as a preload script in the Electron project.  Any app running in the Electron client will be provided with the FDC3 API through this preload, the main process then executes the business logic for routing context and intents between apps.
- *Context Data and Intents* are the core of the business logic handling for the Electron app.  The App Directory implementation also provides a standard (and extensible) set of Context Data and Intent definitions.
- The project contains a local *App Directory* implementation using Node that can easily be extended or swapped out for any standard FDC3 App Directory.



## Common Use Cases

### Portal Building 

A key part of the FDC3 standard is focused on creating a common interface for accessing a directory of trusted applications - the App Directory.  The most prominent use case for the app directory is for building portals that provide users with easy access to a curated set of apps for their organization.  FDC3 takes this up a level from earlier portal/portlet systems because all of the apps within the directory can now have trusted interoperability!  

![image](/images/portal.png)

### Context Linking

There are many use cases where a user may want to link multiple applications so that a change in one cascades to the others.  This kind of linking is particularly beneficial when applications are deconstructed into focused micro-frontends.  FDC3 standardizes the context data that is passed between apps to make building this kind of functionality simple. 

A common use case in finance might be a portfolio app (i.e. a grid of stocks, bonds, or other financial instruments) linked to any number of charting, news, and other informational apps.  As a user clicks through their portfolio, the linked apps load the new instrument context automatically, automating countless clicks and re-keys.  While this scenario is from finance, any workflow with multiple, repetitive tasks across different applications can benefit from context linking.  

![image](/images/context.png)

### Intent Discovery

Probably the most powerful feature of FDC3 is its intents system.  This is inspired by similar intents systems on mobile and allows applications to dynamically discover capabilities at runtime.  Like with context data, FDC3 standardizes a set of intents.  All an application has to do is raise an intent, and the end user can discover what apps are available that can handle that intent.   For example, an app can raise the intent *ViewChart*.  If there are options available, the user will be presented with a dialog allowing them to choose their preferred charting app.  As different users may have different applications available and different preferences, this provides a much better experience than either hard coding or not offering the charting capability at all.

FDC3 also allows an application to raise a context and discover what applications and intents are available.  This allows for rich discovery and interlinking between your app ecosystem.

Another nice feature of intents is that they enable window / tab reuse in an intuitive way.  When an intent is raised, I can reuse the app instances I have open and just send a new context to them.  While mundane, this is a very useful feature for information work and helps limit “tab hell” when working across a large number of applications and contexts.

![image](/images/raiseIntent.png)

![image](/images/raiseContext.png)


## Implementing

The basics for an application owner / developer to implement FDC3 are very simple.  

If you are running in an FDC3 enabled client (in the standard, called a *Desktop Agent*), then the FDC3 API is automatically injected into the browser window.   This API will enable your app to

- Broadcast context to other apps
- Handle incoming context events
- Raise intents
- Handle incoming intents events
- Manage context linking with other apps


Your app can use as much or as little of FDC3 interop as is appropriate (or feasible).  When evaluating what functionality to expose through FDC3, it is useful to ask these questions:

- Is the app context driven?  E.g. does the app display content/functionality based on a clear single input that is portable across other apps?  Common inputs might be:
   - A search query
   - A common identifier for a person, company, geolocation, or anything else that might bridge across multiple applications
   - A proprietary identifier that your app has mapping for 
- Are there discrete functions exposed by the app that take a context input like described above?  If so, these can be defined as intents
- Are there entities displayed in your app that can serve as context for other apps?  If so, these can be contexts to broadcast over FDC3.
- Are there entities displayed in your app that can serve as jumping off points to other functionality?  These are candidates for intent discovery either through the `raiseIntent` or `raiseIntentsForContext` APIs.

View the full api documentation [here](https://fdc3.finos.org/docs/api/overview).


### Progressively Enhancing your App for FDC3

FDC3 is conceived of as an add-on to existing web standards.  As such, it is designed to support implementation through progressive enhancement.  I.e. you can write a completely standard web app that selectively mixes in additional FDC3 functionality when running in a client that supports it.  Doing so is very simple.


An FDC3 Desktop Agent will fire the `fdc3Ready` event (using standard browser APIs) when the API is ready.  In your app, the presence of the FDC3 api can be tested by checking for `fdc3` on the window object and listening for the `fdc3Ready` event.  With this, conditional logic can be built.

```javascript

let useFDC3 = false;

function initFDC3() {
  //add context and intent listeners for your app
  const contextListener = fdc3.addContextListener('fdc3.contact', contact => { ... });
  const intentListener = fdc3.addIntentListener('StartChat', context => {
    // start chat has been requested by another application
   });

    useFDC3 = true;
}


const intentClickHandler = async (intent, context)=> {
	//if fdc3 exists, then raise an intent
    if (useFDC3){
        await fdc3.raiseIntent(intent, context);
    }
	
};

const contextClickHandler = (context)=> {
	//if fdc3 exists, then broadcast context
    if (useFDC3){
        fdc3.broadcast(context);
    }
	
};

if (window.fdc3) {
  initFDC3();
} else {
  window.addEventListener("fdc3Ready", () => {initFDC3();});
}


```


# Learn More

- [FDC3 Home](https://fdc3.finos.org)
- [Getting Started](https://fdc3.finos.org/docs/fdc3-intro) 
- [FDC3 on Github](https://github.com/finos/fdc3)
- [FDC3 on NPM](https://www.npmjs.com/package/@finos/fdc3)