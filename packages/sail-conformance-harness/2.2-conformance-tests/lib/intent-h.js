/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/process/browser.js"
/*!*****************************************!*\
  !*** ./node_modules/process/browser.js ***!
  \*****************************************/
(module) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ },

/***/ "./src/constants.ts"
/*!**************************!*\
  !*** ./src/constants.ts ***!
  \**************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * Constants used in compliance testing
 */
const constants = {
    ShortWait: 1000,
    Fdc3Timeout: 500, // The amount of time to wait for the FDC3Ready event during initialisation
    TestTimeout: 20000, // Tests that take longer than this (in milliseconds) will fail
    WaitTime: 5000, // The amount of time to wait for mock apps to finish processing
    WindowCloseWaitTime: 2000, // The amount of time to allow for clean-up of closed windows
    NoListenerTimeout: 120000, // the amount of time to allow for a DA to timeout waiting on a context or intent listener
    // FDC3 does not define this timeout so this should be extended if the DA uses a longer timeout
    ControlChannel: 'app-control', //app channel used for passing messages between mock apps and tests
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (constants);


/***/ },

/***/ "./src/mock/mock-functions.ts"
/*!************************************!*\
  !*** ./src/mock/mock-functions.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   closeWindowOnCompletion: () => (/* binding */ closeWindowOnCompletion),
/* harmony export */   sendContextToTests: () => (/* binding */ sendContextToTests),
/* harmony export */   validateContext: () => (/* binding */ validateContext)
/* harmony export */ });
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants */ "./src/constants.ts");

const closeWindowOnCompletion = async (fdc3) => {
    const appControlChannel = await fdc3.getOrCreateChannel(_constants__WEBPACK_IMPORTED_MODULE_0__["default"].ControlChannel);
    await appControlChannel.addContextListener('closeWindow', async (context) => {
        //notify app A that window was closed
        const closedContext = {
            type: 'windowClosed',
            testId: context.testId,
        };
        await appControlChannel.broadcast(closedContext);
        setTimeout(() => {
            //yield to make sure the broadcast gets out before we close
            window.close();
        }, 5);
    });
};
const sendContextToTests = async (fdc3, context) => {
    const appControlChannel = await fdc3.getOrCreateChannel(_constants__WEBPACK_IMPORTED_MODULE_0__["default"].ControlChannel);
    await appControlChannel.broadcast(context);
};
const validateContext = (fdc3, receivedContextType, expectedContextType) => {
    if (expectedContextType !== receivedContextType) {
        sendContextToTests(fdc3, {
            type: 'error',
            errorMessage: `Incorrect context received for intent 'aTestingIntent. Expected ${expectedContextType}, got ${receivedContextType}`,
        });
    }
};


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/DesktopAgentProxy.js"
/*!****************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/DesktopAgentProxy.js ***!
  \****************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DesktopAgentProxy: () => (/* binding */ DesktopAgentProxy)
/* harmony export */ });
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util/Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js");

/**
 * This splits out the functionality of the desktop agent into
 * app, channels and intents concerns.
 */
class DesktopAgentProxy {
    heartbeat;
    channels;
    intents;
    apps;
    connectables;
    constructor(heartbeat, channels, intents, apps, connectables, logLevel) {
        this.heartbeat = heartbeat;
        this.intents = intents;
        this.channels = channels;
        this.apps = apps;
        this.connectables = connectables;
        //Default log level is set in the Logger utility
        if (logLevel) {
            _util_Logger_js__WEBPACK_IMPORTED_MODULE_0__.Logger.setLogLevel(logLevel);
        }
        //bind all functions to allow destructuring
        this.addEventListener = this.addEventListener.bind(this);
        this.getInfo = this.getInfo.bind(this);
        this.broadcast = this.broadcast.bind(this);
        this.addContextListener = this.addContextListener.bind(this);
        this.getUserChannels = this.getUserChannels.bind(this);
        this.getSystemChannels = this.getSystemChannels.bind(this);
        this.getOrCreateChannel = this.getOrCreateChannel.bind(this);
        this.createPrivateChannel = this.createPrivateChannel.bind(this);
        this.leaveCurrentChannel = this.leaveCurrentChannel.bind(this);
        this.joinUserChannel = this.joinUserChannel.bind(this);
        this.joinChannel = this.joinChannel.bind(this);
        this.getCurrentChannel = this.getCurrentChannel.bind(this);
        this.joinChannel = this.joinChannel.bind(this);
        this.findIntent = this.findIntent.bind(this);
        this.findIntentsByContext = this.findIntentsByContext.bind(this);
        this.raiseIntent = this.raiseIntent.bind(this);
        this.addIntentListener = this.addIntentListener.bind(this);
        this.raiseIntentForContext = this.raiseIntentForContext.bind(this);
        this.open = this.open.bind(this);
        this.findInstances = this.findInstances.bind(this);
        this.getAppMetadata = this.getAppMetadata.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.connect = this.connect.bind(this);
    }
    addEventListener(type, handler) {
        return this.channels.addEventListener(handler, type);
    }
    getInfo() {
        return this.apps.getImplementationMetadata();
    }
    async broadcast(context) {
        const channel = await this.channels.getUserChannel();
        if (channel) {
            return channel.broadcast(context);
        }
        else {
            return Promise.resolve();
        }
    }
    addContextListener(contextTypeOrHandler, handler) {
        let theContextType;
        let theHandler;
        if (contextTypeOrHandler == null && typeof handler === 'function') {
            theContextType = null;
            theHandler = handler;
        }
        else if (typeof contextTypeOrHandler === 'string' && typeof handler === 'function') {
            theContextType = contextTypeOrHandler;
            theHandler = handler;
        }
        else if (typeof contextTypeOrHandler === 'function') {
            // deprecated one-arg version
            theContextType = null;
            theHandler = contextTypeOrHandler;
        }
        else {
            //invalid call
            // TODO: Replace with Standardized error when #1490 is resolved
            throw new Error('Invalid arguments passed to addContextListener!');
        }
        return this.channels.addContextListener(theHandler, theContextType);
    }
    getUserChannels() {
        return this.channels.getUserChannels();
    }
    getSystemChannels() {
        return this.channels.getUserChannels();
    }
    getOrCreateChannel(channelId) {
        return this.channels.getOrCreate(channelId);
    }
    createPrivateChannel() {
        return this.channels.createPrivateChannel();
    }
    leaveCurrentChannel() {
        return this.channels.leaveUserChannel();
    }
    joinUserChannel(channelId) {
        return this.channels.joinUserChannel(channelId);
    }
    joinChannel(channelId) {
        return this.channels.joinUserChannel(channelId);
    }
    getCurrentChannel() {
        return this.channels.getUserChannel();
    }
    findIntent(intent, context, resultType) {
        return this.intents.findIntent(intent, context, resultType);
    }
    findIntentsByContext(context) {
        return this.intents.findIntentsByContext(context);
    }
    ensureAppId(app) {
        if (typeof app === 'string') {
            return {
                appId: app,
            };
        }
        else if (app?.appId) {
            return app;
        }
        else {
            return undefined;
        }
    }
    raiseIntent(intent, context, app) {
        return this.intents.raiseIntent(intent, context, this.ensureAppId(app));
    }
    addIntentListener(intent, handler) {
        return this.intents.addIntentListener(intent, handler);
    }
    raiseIntentForContext(context, app) {
        return this.intents.raiseIntentForContext(context, this.ensureAppId(app));
    }
    open(app, context) {
        return this.apps.open(this.ensureAppId(app), context);
    }
    findInstances(app) {
        return this.apps.findInstances(app);
    }
    getAppMetadata(app) {
        return this.apps.getAppMetadata(app);
    }
    async disconnect() {
        await Promise.all(this.connectables.map(c => c.disconnect()));
    }
    async connect() {
        await Promise.all(this.connectables.map(c => c.connect()));
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/apps/DefaultAppSupport.js"
/*!*********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/apps/DefaultAppSupport.js ***!
  \*********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultAppSupport: () => (/* binding */ DefaultAppSupport)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/throwIfUndefined.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/throwIfUndefined.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js");



class DefaultAppSupport {
    messaging;
    messageExchangeTimeout;
    appLaunchTimeout;
    constructor(messaging, messageExchangeTimeout, appLaunchTimeout) {
        this.messaging = messaging;
        this.messageExchangeTimeout = messageExchangeTimeout;
        this.appLaunchTimeout = appLaunchTimeout;
    }
    async findInstances(app) {
        const request = {
            type: 'findInstancesRequest',
            payload: {
                app,
            },
            meta: this.messaging.createMeta(),
        };
        const out = await this.messaging.exchange(request, 'findInstancesResponse', this.messageExchangeTimeout);
        return out.payload.appIdentifiers ?? [];
    }
    async getAppMetadata(app) {
        const request = {
            type: 'getAppMetadataRequest',
            payload: {
                app: app,
            },
            meta: this.messaging.createMeta(),
        };
        const response = await this.messaging.exchange(request, 'getAppMetadataResponse', this.messageExchangeTimeout);
        (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_1__.throwIfUndefined)(response.payload.appMetadata, 'Invalid response from Desktop Agent to getAppMetadata!', response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ResolveError.TargetAppUnavailable);
        return response.payload.appMetadata;
    }
    async open(app, context) {
        const request = {
            type: 'openRequest',
            payload: {
                app: {
                    appId: app.appId,
                    instanceId: app.instanceId,
                },
                context,
            },
            meta: this.messaging.createMeta(),
        };
        const response = await this.messaging.exchange(request, 'openResponse', this.appLaunchTimeout);
        (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_1__.throwIfUndefined)(response.payload.appIdentifier, 'Invalid response from Desktop Agent to open!', response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.OpenError.AppNotFound);
        return response.payload.appIdentifier;
    }
    async getImplementationMetadata() {
        const request = {
            type: 'getInfoRequest',
            payload: {},
            meta: this.messaging.createMeta(),
        };
        const response = await this.messaging.exchange(request, 'getInfoResponse', this.messageExchangeTimeout);
        if (response.payload.implementationMetadata) {
            return response.payload.implementationMetadata;
        }
        else {
            //This will only happen if the DA implementation returns an invalid message with a missing implementationMetadata property
            _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.error('Invalid response from Desktop Agent to open!', response);
            const unknownImpl = {
                fdc3Version: 'unknown',
                provider: 'unknown',
                appMetadata: { appId: 'unknown', instanceId: 'unknown' },
                optionalFeatures: {
                    OriginatingAppMetadata: false,
                    UserChannelMembershipAPIs: false,
                    DesktopAgentBridging: false,
                },
            };
            return unknownImpl;
        }
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannel.js"
/*!**********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannel.js ***!
  \**********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultChannel: () => (/* binding */ DefaultChannel)
/* harmony export */ });
/* harmony import */ var _listeners_DefaultContextListener_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../listeners/DefaultContextListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultContextListener.js");

class DefaultChannel {
    messaging;
    messageExchangeTimeout;
    id;
    type;
    displayMetadata;
    constructor(messaging, messageExchangeTimeout, id, type, displayMetadata) {
        this.messaging = messaging;
        this.messageExchangeTimeout = messageExchangeTimeout;
        this.id = id;
        this.type = type;
        this.displayMetadata = displayMetadata;
        //bind all functions to allow destructuring
        this.broadcast = this.broadcast.bind(this);
        this.getCurrentContext = this.getCurrentContext.bind(this);
        this.addContextListener = this.addContextListener.bind(this);
    }
    async broadcast(context) {
        const request = {
            meta: this.messaging.createMeta(),
            payload: {
                channelId: this.id,
                context,
            },
            type: 'broadcastRequest',
        };
        await this.messaging.exchange(request, 'broadcastResponse', this.messageExchangeTimeout);
    }
    async getCurrentContext(contextType) {
        // first, ensure channel state is up-to-date
        const request = {
            meta: this.messaging.createMeta(),
            payload: {
                channelId: this.id,
                contextType: contextType ?? null,
            },
            type: 'getCurrentContextRequest',
        };
        const response = await this.messaging.exchange(request, 'getCurrentContextResponse', this.messageExchangeTimeout);
        return response.payload.context ?? null;
    }
    async addContextListener(contextTypeOrHandler, handler) {
        let theContextType;
        let theHandler;
        if (contextTypeOrHandler == null && typeof handler === 'function') {
            theContextType = null;
            theHandler = handler;
        }
        else if (typeof contextTypeOrHandler === 'string' && typeof handler === 'function') {
            theContextType = contextTypeOrHandler;
            theHandler = handler;
        }
        else if (typeof contextTypeOrHandler === 'function') {
            // deprecated one-arg version
            theContextType = null;
            theHandler = contextTypeOrHandler;
        }
        else {
            //invalid call
            // TODO: Replace with Standardized error when #1490 is resolved
            throw new Error('Invalid arguments passed to addContextListener!');
        }
        return await this.addContextListenerInner(theContextType, theHandler);
    }
    async addContextListenerInner(contextType, theHandler) {
        const listener = new _listeners_DefaultContextListener_js__WEBPACK_IMPORTED_MODULE_0__.DefaultContextListener(this.messaging, this.messageExchangeTimeout, this.id, contextType, theHandler);
        await listener.register();
        return listener;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannelSupport.js"
/*!*****************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannelSupport.js ***!
  \*****************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultChannelSupport: () => (/* binding */ DefaultChannelSupport)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _DefaultPrivateChannel_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./DefaultPrivateChannel.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultPrivateChannel.js");
/* harmony import */ var _DefaultChannel_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./DefaultChannel.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannel.js");
/* harmony import */ var _listeners_DefaultContextListener_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../listeners/DefaultContextListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultContextListener.js");
/* harmony import */ var _listeners_DesktopAgentEventListener_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../listeners/DesktopAgentEventListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DesktopAgentEventListener.js");
/* harmony import */ var _util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/throwIfUndefined.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/throwIfUndefined.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js");







class DefaultChannelSupport {
    messaging;
    channelSelector;
    messageExchangeTimeout;
    userChannels = null;
    userChannelListeners = [];
    currentChannel = null;
    constructor(messaging, channelSelector, messageExchangeTimeout) {
        this.messaging = messaging;
        this.channelSelector = channelSelector;
        this.messageExchangeTimeout = messageExchangeTimeout;
        this.channelSelector.setChannelChangeCallback((channelId) => {
            _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('Channel selector reports channel changed: ', channelId);
            if (channelId == null) {
                this.leaveUserChannel();
            }
            else {
                this.joinUserChannel(channelId);
            }
        });
    }
    async connect() {
        //retrieve the current user channel in case the Desktop Agent started us on a channel
        this.currentChannel = await this.getUserChannel();
        //register for channelChangedEvents to track any DesktopAgent managed user channel changes
        await this.addEventListener(async (e) => {
            const cce = e;
            const newChannelId = cce.details.currentChannelId;
            _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('Desktop Agent reports channel changed: ', newChannelId);
            let theChannel = null;
            // if theres a newChannelId, retrieve details of the channel
            if (newChannelId != null) {
                theChannel = (await this.getUserChannels()).find(uc => uc.id == newChannelId) ?? null;
                if (!theChannel) {
                    // Channel not found - query user channels in case they have changed for some reason
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('Unknown user channel, querying Desktop Agent for updated user channels: ', newChannelId);
                    await this.getUserChannels();
                    theChannel = (await this.getUserChannels()).find(uc => uc.id == newChannelId) ?? null;
                    if (!theChannel) {
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.warn('Received user channel update with unknown user channel (user channel listeners will not work): ', newChannelId);
                    }
                }
            }
            this.currentChannel = theChannel;
            this.channelSelector.updateChannel(theChannel?.id ?? null, await this.getUserChannels());
        }, 'userChannelChanged');
    }
    async disconnect() {
        // no-op
    }
    async addEventListener(handler, type) {
        const listener = new _listeners_DesktopAgentEventListener_js__WEBPACK_IMPORTED_MODULE_4__.DesktopAgentEventListener(this.messaging, this.messageExchangeTimeout, type, handler);
        await listener.register();
        return listener;
    }
    async getUserChannel() {
        if (this.currentChannel) {
            //if the current channel is know,, return it as this variable is maintained by a channelChangedEvent listener
            return this.currentChannel;
        }
        else {
            const request = {
                meta: this.messaging.createMeta(),
                type: 'getCurrentChannelRequest',
                payload: {},
            };
            const response = await this.messaging.exchange(request, 'getCurrentChannelResponse', this.messageExchangeTimeout);
            (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_5__.throwIfUndefined)(response.payload.channel, 'Invalid response from Desktop Agent to getCurrentChannel (channel should be explicitly null if no channel is set)!', response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ChannelError.NoChannelFound);
            //handle successful responses - errors will already have been thrown by exchange above
            /* istanbul ignore else */
            if (response.payload.channel) {
                return new _DefaultChannel_js__WEBPACK_IMPORTED_MODULE_2__.DefaultChannel(this.messaging, this.messageExchangeTimeout, response.payload.channel.id, 'user', response.payload.channel.displayMetadata);
            }
            else if (response.payload.channel === null) {
                //this is a valid response if no channel is set
                return null;
            }
            else {
                //Should not reach here as we will throw in exchange or throwIfNotFound
                return null;
            }
        }
    }
    async getUserChannels() {
        //If the user channels are known, return them as they are not expected to change
        if (this.userChannels) {
            return this.userChannels;
        }
        else {
            const request = {
                meta: this.messaging.createMeta(),
                type: 'getUserChannelsRequest',
                payload: {},
            };
            const response = await this.messaging.exchange(request, 'getUserChannelsResponse', this.messageExchangeTimeout);
            //handle successful responses
            const channels = response.payload.userChannels;
            this.userChannels = channels.map(c => new _DefaultChannel_js__WEBPACK_IMPORTED_MODULE_2__.DefaultChannel(this.messaging, this.messageExchangeTimeout, c.id, 'user', c.displayMetadata));
            return this.userChannels;
        }
    }
    async getOrCreate(id) {
        const request = {
            meta: this.messaging.createMeta(),
            type: 'getOrCreateChannelRequest',
            payload: {
                channelId: id,
            },
        };
        const response = await this.messaging.exchange(request, 'getOrCreateChannelResponse', this.messageExchangeTimeout);
        (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_5__.throwIfUndefined)(response.payload.channel, 'Invalid response from Desktop Agent to getOrCreate!', response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ChannelError.CreationFailed);
        const out = new _DefaultChannel_js__WEBPACK_IMPORTED_MODULE_2__.DefaultChannel(this.messaging, this.messageExchangeTimeout, id, 'app', response.payload.channel.displayMetadata);
        return out;
    }
    async createPrivateChannel() {
        const request = {
            meta: this.messaging.createMeta(),
            type: 'createPrivateChannelRequest',
            payload: {},
        };
        const response = await this.messaging.exchange(request, 'createPrivateChannelResponse', this.messageExchangeTimeout);
        (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_5__.throwIfUndefined)(response.payload.privateChannel, 'Invalid response from Desktop Agent to createPrivateChannel!', response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ChannelError.CreationFailed);
        return new _DefaultPrivateChannel_js__WEBPACK_IMPORTED_MODULE_1__.DefaultPrivateChannel(this.messaging, this.messageExchangeTimeout, response.payload.privateChannel.id);
    }
    async leaveUserChannel() {
        const request = {
            meta: this.messaging.createMeta(),
            type: 'leaveCurrentChannelRequest',
            payload: {},
        };
        await this.messaging.exchange(request, 'leaveCurrentChannelResponse', this.messageExchangeTimeout);
        this.currentChannel = null;
        this.channelSelector.updateChannel(null, await this.getUserChannels());
    }
    async joinUserChannel(id) {
        const request = {
            meta: this.messaging.createMeta(),
            type: 'joinUserChannelRequest',
            payload: {
                channelId: id,
            },
        };
        await this.messaging.exchange(request, 'joinUserChannelResponse', this.messageExchangeTimeout);
        const userChannels = await this.getUserChannels();
        this.currentChannel = userChannels.find(c => c.id == id) ?? null;
        if (this.currentChannel == null) {
            throw new Error(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ChannelError.NoChannelFound);
        }
        this.channelSelector.updateChannel(id, userChannels);
        for (const l of this.userChannelListeners) {
            await l.changeChannel();
        }
    }
    async addContextListener(handler, type) {
        /**
         *  Utility class used to wrap the DefaultContextListener to match the internal channel id
         *  and ensure it gets removed when its unsubscribe function is called.
         */
        class UnsubscribingDefaultContextListener extends _listeners_DefaultContextListener_js__WEBPACK_IMPORTED_MODULE_3__.DefaultContextListener {
            container;
            constructor(container, messaging, messageExchangeTimeout, contextType, handler, messageType = 'broadcastEvent') {
                super(messaging, messageExchangeTimeout, null, contextType, handler, messageType);
                this.container = container;
            }
            async unsubscribe() {
                super.unsubscribe();
                this.container.userChannelListeners = this.container.userChannelListeners.filter(l => l != this);
            }
            async register() {
                await super.register();
                await this.changeChannel();
            }
            async changeChannel() {
                if (this.container.currentChannel != null) {
                    const context = await this.container.currentChannel?.getCurrentContext(this.contextType ?? undefined);
                    if (context) {
                        this.handler(context);
                    }
                }
            }
            onAMatchingChannel(m) {
                return this.container.currentChannel != null && m.payload.channelId == this.container.currentChannel.id;
            }
            openBroadcastEvent(m) {
                return m.payload.channelId == null;
            }
            filter(m) {
                return (m.type == this.messageType &&
                    (this.onAMatchingChannel(m) || this.openBroadcastEvent(m)) &&
                    (m.payload.context?.type == this.contextType || this.contextType == null));
            }
        }
        const listener = new UnsubscribingDefaultContextListener(this, this.messaging, this.messageExchangeTimeout, type, handler);
        this.userChannelListeners.push(listener);
        await listener.register();
        return listener;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultPrivateChannel.js"
/*!*****************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultPrivateChannel.js ***!
  \*****************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultPrivateChannel: () => (/* binding */ DefaultPrivateChannel)
/* harmony export */ });
/* harmony import */ var _DefaultChannel_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./DefaultChannel.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannel.js");
/* harmony import */ var _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../listeners/PrivateChannelEventListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/PrivateChannelEventListener.js");
/* harmony import */ var _listeners_DefaultContextListener_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../listeners/DefaultContextListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultContextListener.js");



class DefaultPrivateChannel extends _DefaultChannel_js__WEBPACK_IMPORTED_MODULE_0__.DefaultChannel {
    constructor(messaging, messageExchangeTimeout, id) {
        super(messaging, messageExchangeTimeout, id, 'private');
        //bind all functions to allow destructuring
        this.addContextListener = this.addContextListener.bind(this);
        this.addEventListener = this.addEventListener.bind(this);
        this.disconnect = this.disconnect.bind(this);
    }
    async addEventListener(type, handler) {
        let a;
        switch (type) {
            case 'addContextListener':
                a = new _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__.PrivateChannelAddContextEventListener(this.messaging, this.messageExchangeTimeout, this.id, handler);
                break;
            case 'unsubscribe':
                a = new _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__.PrivateChannelUnsubscribeEventListener(this.messaging, this.messageExchangeTimeout, this.id, handler);
                break;
            case 'disconnect':
                a = new _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__.PrivateChannelDisconnectEventListener(this.messaging, this.messageExchangeTimeout, this.id, handler);
                break;
            case null:
                a = new _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__.PrivateChannelNullEventListener(this.messaging, this.messageExchangeTimeout, this.id, handler);
                break;
            default:
                throw new Error('Unsupported event type: ' + type);
        }
        await a.register();
        return a;
    }
    //implementations of the deprecated listener functions
    onAddContextListener(handler) {
        //Adapt handler type for differences between addEventListener and onAddContextListener handler types
        const adaptorHandler = (event) => {
            handler(event.details.contextType ?? undefined);
        };
        const l = new _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__.PrivateChannelAddContextEventListener(this.messaging, this.messageExchangeTimeout, this.id, adaptorHandler);
        l.register();
        return l;
    }
    onUnsubscribe(handler) {
        //Adapt handler type for differences between addEventListener and onUnsubscribeListener handler types
        const adaptorHandler = (event) => {
            handler(event.details.contextType ?? undefined);
        };
        const l = new _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__.PrivateChannelUnsubscribeEventListener(this.messaging, this.messageExchangeTimeout, this.id, adaptorHandler);
        l.register();
        return l;
    }
    onDisconnect(handler) {
        //Adapt handler type for differences between addEventListener and onDisconnectListener handler types
        const adaptorHandler = () => {
            handler();
        };
        const l = new _listeners_PrivateChannelEventListener_js__WEBPACK_IMPORTED_MODULE_1__.PrivateChannelDisconnectEventListener(this.messaging, this.messageExchangeTimeout, this.id, adaptorHandler);
        l.register();
        return l;
    }
    async disconnect() {
        const msg = {
            meta: this.messaging.createMeta(),
            payload: {
                channelId: this.id,
            },
            type: 'privateChannelDisconnectRequest',
        };
        await this.messaging.exchange(msg, 'privateChannelDisconnectResponse', this.messageExchangeTimeout);
    }
    async addContextListenerInner(contextType, theHandler) {
        const listener = new _listeners_DefaultContextListener_js__WEBPACK_IMPORTED_MODULE_2__.DefaultContextListener(this.messaging, this.messageExchangeTimeout, this.id, contextType, theHandler);
        await listener.register();
        return listener;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/heartbeat/DefaultHeartbeatSupport.js"
/*!********************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/heartbeat/DefaultHeartbeatSupport.js ***!
  \********************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultHeartbeatSupport: () => (/* binding */ DefaultHeartbeatSupport)
/* harmony export */ });
/* harmony import */ var _listeners_HeartbeatListener_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../listeners/HeartbeatListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/HeartbeatListener.js");

/**
 * Handles disconnection and heartbeats for the proxy.
 */
class DefaultHeartbeatSupport {
    messaging;
    heartbeatListener = null;
    constructor(messaging) {
        this.messaging = messaging;
    }
    async connect() {
        this.heartbeatListener = new _listeners_HeartbeatListener_js__WEBPACK_IMPORTED_MODULE_0__.HeartbeatListener(this.messaging);
        this.heartbeatListener.register();
    }
    async disconnect() {
        await this.heartbeatListener?.unsubscribe();
        return this.messaging.disconnect();
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/index.js"
/*!****************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/index.js ***!
  \****************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractFDC3Logger: () => (/* reexport safe */ _util_AbstractFDC3Logger_js__WEBPACK_IMPORTED_MODULE_7__.AbstractFDC3Logger),
/* harmony export */   AbstractMessaging: () => (/* reexport safe */ _messaging_AbstractMessaging_js__WEBPACK_IMPORTED_MODULE_1__.AbstractMessaging),
/* harmony export */   DefaultAppSupport: () => (/* reexport safe */ _apps_DefaultAppSupport_js__WEBPACK_IMPORTED_MODULE_5__.DefaultAppSupport),
/* harmony export */   DefaultChannel: () => (/* reexport safe */ _channels_DefaultChannel_js__WEBPACK_IMPORTED_MODULE_2__.DefaultChannel),
/* harmony export */   DefaultChannelSupport: () => (/* reexport safe */ _channels_DefaultChannelSupport_js__WEBPACK_IMPORTED_MODULE_4__.DefaultChannelSupport),
/* harmony export */   DefaultHeartbeatSupport: () => (/* reexport safe */ _heartbeat_DefaultHeartbeatSupport_js__WEBPACK_IMPORTED_MODULE_6__.DefaultHeartbeatSupport),
/* harmony export */   DefaultIntentSupport: () => (/* reexport safe */ _intents_DefaultIntentSupport_js__WEBPACK_IMPORTED_MODULE_3__.DefaultIntentSupport),
/* harmony export */   DesktopAgentProxy: () => (/* reexport safe */ _DesktopAgentProxy_js__WEBPACK_IMPORTED_MODULE_0__.DesktopAgentProxy)
/* harmony export */ });
/* harmony import */ var _DesktopAgentProxy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./DesktopAgentProxy.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/DesktopAgentProxy.js");
/* harmony import */ var _messaging_AbstractMessaging_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./messaging/AbstractMessaging.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/messaging/AbstractMessaging.js");
/* harmony import */ var _channels_DefaultChannel_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./channels/DefaultChannel.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannel.js");
/* harmony import */ var _intents_DefaultIntentSupport_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./intents/DefaultIntentSupport.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/intents/DefaultIntentSupport.js");
/* harmony import */ var _channels_DefaultChannelSupport_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./channels/DefaultChannelSupport.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannelSupport.js");
/* harmony import */ var _apps_DefaultAppSupport_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./apps/DefaultAppSupport.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/apps/DefaultAppSupport.js");
/* harmony import */ var _heartbeat_DefaultHeartbeatSupport_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./heartbeat/DefaultHeartbeatSupport.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/heartbeat/DefaultHeartbeatSupport.js");
/* harmony import */ var _util_AbstractFDC3Logger_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./util/AbstractFDC3Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/AbstractFDC3Logger.js");











/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/intents/DefaultIntentResolution.js"
/*!******************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/intents/DefaultIntentResolution.js ***!
  \******************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultIntentResolution: () => (/* binding */ DefaultIntentResolution)
/* harmony export */ });
class DefaultIntentResolution {
    messaging;
    source;
    intent;
    result;
    constructor(messaging, result, source, intent) {
        this.messaging = messaging;
        this.result = result;
        this.source = source;
        this.intent = intent;
        //bind all functions to allow destructuring
        this.getResult = this.getResult.bind(this);
    }
    getResult() {
        return this.result;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/intents/DefaultIntentSupport.js"
/*!***************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/intents/DefaultIntentSupport.js ***!
  \***************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultIntentSupport: () => (/* binding */ DefaultIntentSupport)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _DefaultIntentResolution_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./DefaultIntentResolution.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/intents/DefaultIntentResolution.js");
/* harmony import */ var _listeners_DefaultIntentListener_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../listeners/DefaultIntentListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultIntentListener.js");
/* harmony import */ var _channels_DefaultChannel_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../channels/DefaultChannel.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultChannel.js");
/* harmony import */ var _channels_DefaultPrivateChannel_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../channels/DefaultPrivateChannel.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/channels/DefaultPrivateChannel.js");
/* harmony import */ var _util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/throwIfUndefined.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/throwIfUndefined.js");






const convertIntentResult = async ({ payload }, messaging, messageExchangeTimeout) => {
    const result = payload.intentResult;
    if (result?.channel) {
        const { channel } = result;
        switch (channel.type) {
            case 'private': {
                return new _channels_DefaultPrivateChannel_js__WEBPACK_IMPORTED_MODULE_4__.DefaultPrivateChannel(messaging, messageExchangeTimeout, channel.id);
            }
            case 'app':
            case 'user':
            default: {
                return new _channels_DefaultChannel_js__WEBPACK_IMPORTED_MODULE_3__.DefaultChannel(messaging, messageExchangeTimeout, channel.id, channel.type, channel.displayMetadata);
            }
        }
    }
    else if (result?.context) {
        return result.context;
    }
    else {
        return;
    }
};
class DefaultIntentSupport {
    messaging;
    intentResolver;
    messageExchangeTimeout;
    appLaunchTimeout;
    constructor(messaging, intentResolver, messageExchangeTimeout, appLaunchTimeout) {
        this.messaging = messaging;
        this.intentResolver = intentResolver;
        this.messageExchangeTimeout = messageExchangeTimeout;
        this.appLaunchTimeout = appLaunchTimeout;
    }
    async findIntent(intent, context, resultType) {
        const request = {
            type: 'findIntentRequest',
            payload: {
                intent,
                context,
                resultType,
            },
            meta: this.messaging.createMeta(),
        };
        const result = await this.messaging.exchange(request, 'findIntentResponse', this.messageExchangeTimeout);
        const appIntent = result.payload.appIntent;
        if (appIntent.apps.length == 0) {
            throw new Error(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ResolveError.NoAppsFound);
        }
        else {
            return {
                intent: appIntent.intent,
                apps: appIntent.apps,
            };
        }
    }
    async findIntentsByContext(context) {
        const request = {
            type: 'findIntentsByContextRequest',
            payload: {
                context,
            },
            meta: this.messaging.createMeta(),
        };
        const result = await this.messaging.exchange(request, 'findIntentsByContextResponse', this.messageExchangeTimeout);
        const appIntents = result.payload.appIntents;
        if (!appIntents || appIntents.length == 0) {
            throw new Error(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ResolveError.NoAppsFound);
        }
        else {
            return appIntents;
        }
    }
    async createResultPromise(request) {
        const rp = await this.messaging.waitFor(m => m.type == 'raiseIntentResultResponse' && m.meta.requestUuid == request.meta.requestUuid);
        const ir = await convertIntentResult(rp, this.messaging, this.messageExchangeTimeout);
        return ir;
    }
    async raiseIntent(intent, context, app) {
        const meta = this.messaging.createMeta();
        const request = {
            type: 'raiseIntentRequest',
            payload: {
                intent,
                context,
                app: app,
            },
            meta: meta,
        };
        const resultPromise = this.createResultPromise(request);
        const response = await this.messaging.exchange(request, 'raiseIntentResponse', this.appLaunchTimeout);
        (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_5__.throwIfUndefined)(response.payload.appIntent ?? response.payload.intentResolution, 'Invalid response from Desktop Agent to raiseIntent, either payload.appIntent or payload.intentResolution must be set!', response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ResolveError.NoAppsFound);
        if (response.payload.appIntent) {
            // Needs further resolution, we need to invoke the resolver
            const result = await this.intentResolver.chooseIntent([response.payload.appIntent], context);
            if (result) {
                return this.raiseIntent(intent, context, result.appId);
            }
            else {
                throw new Error(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ResolveError.UserCancelled);
            }
        }
        else {
            // Was resolved
            const details = response.payload.intentResolution;
            return new _DefaultIntentResolution_js__WEBPACK_IMPORTED_MODULE_1__.DefaultIntentResolution(this.messaging, resultPromise, details.source, details.intent);
        }
    }
    async raiseIntentForContext(context, app) {
        const request = {
            type: 'raiseIntentForContextRequest',
            payload: {
                context,
                app: app,
            },
            meta: this.messaging.createMeta(),
        };
        const resultPromise = this.createResultPromise(request);
        const response = await this.messaging.exchange(request, 'raiseIntentForContextResponse', this.appLaunchTimeout);
        (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_5__.throwIfUndefined)(response.payload.appIntents ?? response.payload.intentResolution, 'Invalid response from Desktop Agent to raiseIntentForContext, either payload.appIntents or payload.intentResolution must be set!', response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ResolveError.NoAppsFound);
        if (response.payload.appIntents) {
            // Needs further resolution, we need to invoke the resolver
            const result = await this.intentResolver.chooseIntent(response.payload.appIntents, context);
            if (result) {
                return this.raiseIntent(result.intent, context, result.appId);
            }
            else {
                throw new Error(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.ResolveError.UserCancelled);
            }
        }
        else {
            // Was resolved
            const details = response.payload.intentResolution;
            return new _DefaultIntentResolution_js__WEBPACK_IMPORTED_MODULE_1__.DefaultIntentResolution(this.messaging, resultPromise, details.source, details.intent);
        }
    }
    async addIntentListener(intent, handler) {
        const out = new _listeners_DefaultIntentListener_js__WEBPACK_IMPORTED_MODULE_2__.DefaultIntentListener(this.messaging, intent, handler, this.messageExchangeTimeout);
        await out.register();
        return out;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/AbstractListener.js"
/*!*************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/AbstractListener.js ***!
  \*************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractListener: () => (/* binding */ AbstractListener)
/* harmony export */ });
/* harmony import */ var _util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/throwIfUndefined.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/throwIfUndefined.js");
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");


/**
 * Common to all listeners - they need to be registered and unregistered with messaging and also
 * send notification messages when connected and disconnected
 */
class AbstractListener {
    messaging;
    messageExchangeTimeout;
    subscribeRequestType;
    subscribeResponseType;
    unsubscribeRequestType;
    unsubscribeResponseType;
    subscriptionPayload;
    id = null;
    handler;
    constructor(messaging, messageExchangeTimeout, subscriptionPayload, handler, subscribeRequestType, subscribeResponseType, unsubscribeRequestType, unsubscribeResponseType) {
        this.messaging = messaging;
        this.messageExchangeTimeout = messageExchangeTimeout;
        this.handler = handler;
        this.subscriptionPayload = subscriptionPayload;
        this.subscribeRequestType = subscribeRequestType;
        this.subscribeResponseType = subscribeResponseType;
        this.unsubscribeRequestType = unsubscribeRequestType;
        this.unsubscribeResponseType = unsubscribeResponseType;
    }
    async unsubscribe() {
        /* istanbul ignore else */
        if (this.id) {
            this.messaging.unregister(this.id);
            const unsubscribeMessage = {
                meta: this.messaging.createMeta(),
                payload: {
                    listenerUUID: this.id,
                },
                type: this.unsubscribeRequestType,
            };
            await this.messaging.exchange(unsubscribeMessage, this.unsubscribeResponseType, this.messageExchangeTimeout);
            return;
        }
        else {
            //should never happen as we throw on creating a listener without an ID
            throw new Error("This listener doesn't have an id and hence can't be removed!");
        }
    }
    async register() {
        const subscribeMessage = {
            meta: this.messaging.createMeta(),
            payload: this.subscriptionPayload,
            type: this.subscribeRequestType,
        };
        const response = await this.messaging.exchange(subscribeMessage, this.subscribeResponseType, this.messageExchangeTimeout);
        this.id = response?.payload?.listenerUUID ?? null;
        //coalesce so that nullish values become undefined
        (0,_util_throwIfUndefined_js__WEBPACK_IMPORTED_MODULE_0__.throwIfUndefined)(this.id ?? undefined, "The Desktop Agent's response did not include a listenerUUID, which will mean this listener can't be removed!", response, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_1__.ChannelError.CreationFailed);
        this.messaging.register(this);
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultContextListener.js"
/*!*******************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultContextListener.js ***!
  \*******************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultContextListener: () => (/* binding */ DefaultContextListener)
/* harmony export */ });
/* harmony import */ var _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AbstractListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/AbstractListener.js");

class DefaultContextListener extends _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__.AbstractListener {
    channelId;
    messageType;
    contextType;
    constructor(messaging, messageExchangeTimeout, channelId, contextType, handler, messageType = 'broadcastEvent') {
        super(messaging, messageExchangeTimeout, { channelId, contextType }, handler, 'addContextListenerRequest', 'addContextListenerResponse', 'contextListenerUnsubscribeRequest', 'contextListenerUnsubscribeResponse');
        this.channelId = channelId;
        this.messageType = messageType;
        this.contextType = contextType;
    }
    filter(m) {
        return (m.type == this.messageType &&
            m.payload.channelId == this.channelId &&
            (m.payload.context?.type == this.contextType || this.contextType == null));
    }
    action(m) {
        this.handler(m.payload.context, {
            source: m.payload.originatingApp,
        });
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultIntentListener.js"
/*!******************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DefaultIntentListener.js ***!
  \******************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultIntentListener: () => (/* binding */ DefaultIntentListener)
/* harmony export */ });
/* harmony import */ var _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AbstractListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/AbstractListener.js");

class DefaultIntentListener extends _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__.AbstractListener {
    intent;
    constructor(messaging, intent, action, messageExchangeTimeout) {
        super(messaging, messageExchangeTimeout, { intent }, action, 'addIntentListenerRequest', 'addIntentListenerResponse', 'intentListenerUnsubscribeRequest', 'intentListenerUnsubscribeResponse');
        this.intent = intent;
    }
    filter(m) {
        return m.type == 'intentEvent' && m.payload.intent == this.intent;
    }
    action(m) {
        const done = this.handler(m.payload.context, {
            source: m.payload.originatingApp,
        });
        this.handleIntentResult(done, m);
    }
    intentResultRequestMessage(ir, m) {
        const out = {
            type: 'intentResultRequest',
            meta: {
                requestUuid: m.meta.eventUuid,
                timestamp: new Date(),
            },
            payload: {
                intentResult: convertIntentResult(ir),
                intentEventUuid: m.meta.eventUuid,
                raiseIntentRequestUuid: m.payload.raiseIntentRequestUuid,
            },
        };
        return out;
    }
    handleIntentResult(done, m) {
        if (done == null) {
            // send an empty intent result response
            return this.messaging.exchange(this.intentResultRequestMessage(undefined, m), 'intentResultResponse', this.messageExchangeTimeout);
        }
        else {
            // respond after promise completes
            return done.then(ir => {
                return this.messaging.exchange(this.intentResultRequestMessage(ir, m), 'intentResultResponse', this.messageExchangeTimeout);
            });
        }
    }
}
function convertIntentResult(intentResult) {
    if (!intentResult) {
        //consider any falsy result to be void...
        return {}; // void result
    }
    switch (intentResult.type) {
        case 'user':
        case 'app':
        case 'private':
            // it's a channel
            return {
                channel: {
                    type: intentResult.type,
                    id: intentResult.id,
                    displayMetadata: intentResult.displayMetadata,
                },
            };
        default:
            // it's a context
            return {
                context: intentResult,
            };
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DesktopAgentEventListener.js"
/*!**********************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/DesktopAgentEventListener.js ***!
  \**********************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DesktopAgentEventListener: () => (/* binding */ DesktopAgentEventListener)
/* harmony export */ });
/* harmony import */ var _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AbstractListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/AbstractListener.js");

const handleChannelChangedEvent = (handler, m) => {
    const currentChannelId = m.payload.currentChannelId ?? m.payload.newChannelId ?? null;
    const channelChangedEvent = {
        type: 'userChannelChanged',
        details: {
            currentChannelId,
        },
    };
    handler(channelChangedEvent);
};
function wrapHandler(handler) {
    return (m) => {
        if (m.type === 'channelChangedEvent') {
            return handleChannelChangedEvent(handler, m);
        }
        //forward other events
        handler({
            type: m.type,
            details: m.payload,
        });
    };
}
function getRequestPayload(type) {
    if (type == 'userChannelChanged') {
        return {
            type: 'USER_CHANNEL_CHANGED',
        };
    }
    else if (type == null) {
        return {
            type: null,
        };
    }
    else {
        throw new Error('UnknownEventType');
    }
}
function getEventType(type) {
    if (type == 'userChannelChanged') {
        return 'channelChangedEvent';
    }
    else if (type == null) {
        return null;
    }
    else {
        throw new Error('UnknownEventType');
    }
}
/**
 * Listens to channel changed events (currently) from the desktop agent and forwards them to the provided handler.
 */
class DesktopAgentEventListener extends _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__.AbstractListener {
    type;
    constructor(messaging, messageExchangeTimeout, type, handler) {
        super(messaging, messageExchangeTimeout, getRequestPayload(type), wrapHandler(handler), 'addEventListenerRequest', 'addEventListenerResponse', 'eventListenerUnsubscribeRequest', 'eventListenerUnsubscribeResponse');
        this.type = getEventType(type);
    }
    action(m) {
        this.handler(m);
    }
    filter(m) {
        return m.type === this.type || this.type == null;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/HeartbeatListener.js"
/*!**************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/HeartbeatListener.js ***!
  \**************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HeartbeatListener: () => (/* binding */ HeartbeatListener)
/* harmony export */ });
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js");

class HeartbeatListener {
    id;
    messaging;
    constructor(messaging) {
        this.id = 'heartbeat-' + messaging.createUUID();
        this.messaging = messaging;
    }
    filter(m) {
        return m.type === 'heartbeatEvent';
    }
    action(_m) {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_0__.Logger.debug('Responding to heartbeat request', _m);
        const request = {
            type: 'heartbeatAcknowledgementRequest',
            meta: {
                requestUuid: this.messaging.createUUID(),
                timestamp: new Date(),
            },
            payload: {
                heartbeatEventUuid: _m.meta.eventUuid,
            },
        };
        this.messaging.post(request);
    }
    async register() {
        this.messaging.register(this);
    }
    async unsubscribe() {
        this.messaging.unregister(this.id);
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/PrivateChannelEventListener.js"
/*!************************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/PrivateChannelEventListener.js ***!
  \************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PrivateChannelAddContextEventListener: () => (/* binding */ PrivateChannelAddContextEventListener),
/* harmony export */   PrivateChannelDisconnectEventListener: () => (/* binding */ PrivateChannelDisconnectEventListener),
/* harmony export */   PrivateChannelNullEventListener: () => (/* binding */ PrivateChannelNullEventListener),
/* harmony export */   PrivateChannelUnsubscribeEventListener: () => (/* binding */ PrivateChannelUnsubscribeEventListener)
/* harmony export */ });
/* harmony import */ var _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AbstractListener.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/listeners/AbstractListener.js");
/* harmony import */ var _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @finos/fdc3-schema */ "./node_modules/@finos/fdc3-schema/dist/src/index.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js");



const { isPrivateChannelOnAddContextListenerEvent, isPrivateChannelOnDisconnectEvent, isPrivateChannelOnUnsubscribeEvent, } = _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_1__.BrowserTypes;
class AbstractPrivateChannelEventListener extends _AbstractListener_js__WEBPACK_IMPORTED_MODULE_0__.AbstractListener {
    privateChannelId;
    eventMessageTypes;
    constructor(messaging, messageExchangeTimeout, privateChannelId, eventMessageTypes, eventType, handler) {
        super(messaging, messageExchangeTimeout, { privateChannelId, listenerType: eventType }, handler, 'privateChannelAddEventListenerRequest', 'privateChannelAddEventListenerResponse', 'privateChannelUnsubscribeEventListenerRequest', 'privateChannelUnsubscribeEventListenerResponse');
        this.privateChannelId = privateChannelId;
        this.eventMessageTypes = eventMessageTypes;
    }
    filter(m) {
        return this.eventMessageTypes.includes(m.type) && this.privateChannelId == m.payload.privateChannelId;
    }
    action(m) {
        this.handler(m);
    }
}
class PrivateChannelNullEventListener extends AbstractPrivateChannelEventListener {
    constructor(messaging, messageExchangeTimeout, channelId, handler) {
        const wrappedHandler = (msg) => {
            let type;
            let details;
            switch (msg.type) {
                case 'privateChannelOnAddContextListenerEvent':
                    type = 'addContextListener';
                    details = { contextType: msg.payload.contextType };
                    break;
                case 'privateChannelOnUnsubscribeEvent':
                    type = 'unsubscribe';
                    details = { contextType: msg.payload.contextType };
                    break;
                case 'privateChannelOnDisconnectEvent':
                    type = 'disconnect';
                    details = null;
                    break;
            }
            const event = {
                type,
                details,
            };
            handler(event);
        };
        super(messaging, messageExchangeTimeout, channelId, [
            'privateChannelOnAddContextListenerEvent',
            'privateChannelOnUnsubscribeEvent',
            'privateChannelOnDisconnectEvent',
        ], 'addContextListener', wrappedHandler);
    }
}
class PrivateChannelDisconnectEventListener extends AbstractPrivateChannelEventListener {
    constructor(messaging, messageExchangeTimeout, channelId, handler) {
        const wrappedHandler = (msg) => {
            if (isPrivateChannelOnDisconnectEvent(msg)) {
                const event = {
                    type: 'disconnect',
                    details: null,
                };
                handler(event);
            }
            else {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.error('PrivateChannelDisconnectEventListener was called for a different message type!', msg);
            }
        };
        super(messaging, messageExchangeTimeout, channelId, ['privateChannelOnDisconnectEvent'], 'disconnect', wrappedHandler);
    }
}
class PrivateChannelAddContextEventListener extends AbstractPrivateChannelEventListener {
    constructor(messaging, messageExchangeTimeout, channelId, handler) {
        const wrappedHandler = (msg) => {
            if (isPrivateChannelOnAddContextListenerEvent(msg)) {
                const event = {
                    type: 'addContextListener',
                    details: { contextType: msg.payload.contextType },
                };
                handler(event);
            }
            else {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.error('PrivateChannelAddContextEventListener was called for a different message type!', msg);
            }
        };
        super(messaging, messageExchangeTimeout, channelId, ['privateChannelOnAddContextListenerEvent'], 'addContextListener', wrappedHandler);
    }
}
class PrivateChannelUnsubscribeEventListener extends AbstractPrivateChannelEventListener {
    constructor(messaging, messageExchangeTimeout, channelId, handler) {
        const wrappedHandler = (msg) => {
            if (isPrivateChannelOnUnsubscribeEvent(msg)) {
                const event = {
                    type: 'unsubscribe',
                    details: { contextType: msg.payload.contextType },
                };
                handler(event);
            }
            else {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.error('PrivateChannelUnsubscribeEventListener was called for a different message type!', msg);
            }
        };
        super(messaging, messageExchangeTimeout, channelId, ['privateChannelOnUnsubscribeEvent'], 'unsubscribe', wrappedHandler);
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/messaging/AbstractMessaging.js"
/*!**************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/messaging/AbstractMessaging.js ***!
  \**************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractMessaging: () => (/* binding */ AbstractMessaging)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js");


class AbstractMessaging {
    appIdentifier;
    constructor(appIdentifier) {
        this.appIdentifier = appIdentifier;
    }
    waitFor(filter, timeoutMs, timeoutErrorMessage) {
        const id = this.createUUID();
        return new Promise((resolve, reject) => {
            let done = false;
            let timeout = null;
            const l = {
                id,
                filter: filter,
                action: m => {
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug('Received from DesktopAgent: ', m);
                    done = true;
                    this.unregister(id);
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    resolve(m);
                },
                register: async () => {
                    this.register(l);
                },
                unsubscribe: async () => {
                    this.unregister(id);
                },
            };
            this.register(l);
            if (timeoutMs) {
                timeout = setTimeout(() => {
                    this.unregister(id);
                    if (!done) {
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.error(`waitFor rejecting after ${timeoutMs}ms at ${new Date().toISOString()} with ${timeoutErrorMessage}`);
                        reject(new Error(timeoutErrorMessage));
                    }
                }, timeoutMs);
            }
        });
    }
    async exchange(message, expectedTypeName, timeoutMs) {
        const prom = this.waitFor(m => {
            return m.type == expectedTypeName && m.meta.requestUuid == message.meta.requestUuid;
        }, timeoutMs, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.ApiTimeout);
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug('Sending to DesktopAgent: ', message);
        this.post(message);
        try {
            const out = await prom;
            if (out?.payload?.error) {
                throw new Error(out.payload.error);
            }
            else {
                return out;
            }
        }
        catch (error) {
            if (error.message == _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.ApiTimeout) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.error(`Timed-out while waiting for ${expectedTypeName} with requestUuid ${message.meta.requestUuid}`);
            }
            throw error;
        }
    }
    getAppIdentifier() {
        return this.appIdentifier;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/AbstractFDC3Logger.js"
/*!**********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/util/AbstractFDC3Logger.js ***!
  \**********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractFDC3Logger: () => (/* binding */ AbstractFDC3Logger)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* provided dependency */ var process = __webpack_require__(/*! process/browser.js */ "./node_modules/process/browser.js");
/* eslint-disable @typescript-eslint/no-explicit-any */

//check if color is supported in (node) console;
let noColor = true;
//else only occurs in a browser and can't be tested in node
/* istanbul ignore if */
if (typeof process !== 'undefined') {
    const argv = process.argv || /* istanbul ignore next */ [];
    const env = process.env || /* istanbul ignore next */ {};
    noColor =
        (!!env.NO_COLOR || argv.includes('--no-color')) &&
            !(!!env.FORCE_COLOR ||
                argv.includes('--color') ||
                process.platform === 'win32' /* istanbul ignore next */ ||
                ((process.stdout || {}).isTTY && env.TERM !== 'dumb') ||
                /* istanbul ignore next */ !!env.CI);
}
class AbstractFDC3Logger {
    /** This should be overridden by sub-classes to set the prefix applied
     * to log messages. */
    /* istanbul ignore next */ static get prefix() {
        return '';
    }
    //sub-classes should override this default log level
    static logLevel = _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel.DEBUG;
    static setLogLevel(level) {
        if (level in _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel) {
            this.logLevel = level;
        }
        else {
            /* istanbul ignore next */
            this.error(`Ignoring unrecognized LogLevel '${level}'! Current log level: '${this.logLevel} (${_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel[this.logLevel]})'`);
        }
    }
    static debugColor(value) {
        return noColor ? /* istanbul ignore next */ value : '\x1b[30m\x1b[2m' + value + '\x1b[22m\x1b[39m';
    }
    static logColor(value) {
        return noColor ? /* istanbul ignore next */ value : '\x1b[32m\x1b[2m' + value + '\x1b[22m\x1b[39m';
    }
    static warnColor(value) {
        return noColor ? /* istanbul ignore next */ value : '\x1b[33m' + value + '\x1b[39m';
    }
    static errorColor(value) {
        return noColor ? /* istanbul ignore next */ value : '\x1b[31m' + value + '\x1b[39m';
    }
    static debug(...params) {
        if (this.logLevel >= _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel.DEBUG) {
            console.debug(...this.prefixAndColorize(this.prefix, params, this.debugColor));
        }
    }
    static log(...params) {
        if (this.logLevel >= _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel.INFO) {
            console.log(...this.prefixAndColorize(this.prefix, params, this.logColor));
        }
    }
    static warn(...params) {
        if (this.logLevel >= _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel.WARN) {
            console.warn(...this.prefixAndColorize(this.prefix, params, this.warnColor));
        }
    }
    static error(...params) {
        if (this.logLevel >= _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel.ERROR) {
            console.error(...this.prefixAndColorize(this.prefix, params, this.errorColor));
        }
    }
    static prefixAndColorize = (prefix, params, colorFn) => {
        const prefixed = [prefix, ...params];
        return prefixed.map(value => {
            if (typeof value === 'string') {
                //just color strings
                return colorFn(value);
            }
            else if (value && value.stack && value.message) {
                //probably an error
                return colorFn(value.stack);
            }
            else {
                //something else... lets hope it stringifies
                return colorFn(JSON.stringify(value, null, 2));
            }
        });
    };
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js"
/*!**********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js ***!
  \**********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Logger: () => (/* binding */ Logger)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _AbstractFDC3Logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AbstractFDC3Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/AbstractFDC3Logger.js");


/**
 * Logging utility used by the DesktopAgentProxy, which defaults to
 * only printing WARN and ERROR level messages. The INFO level is used
 * to message exchanges with Desktop Agents. The DEBUG level is used
 * to log heartbeat messages from the DesktopAgent.
 */
class Logger extends _AbstractFDC3Logger_js__WEBPACK_IMPORTED_MODULE_1__.AbstractFDC3Logger {
    static get prefix() {
        return 'FDC3 DesktopAgentProxy: ';
    }
    //set default log level - will not be picked up in test scope so ignored
    /* istanbul ignore next */
    logLevel = _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.LogLevel.WARN;
}


/***/ },

/***/ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/throwIfUndefined.js"
/*!********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-agent-proxy/dist/src/util/throwIfUndefined.js ***!
  \********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   throwIfUndefined: () => (/* binding */ throwIfUndefined)
/* harmony export */ });
/* harmony import */ var _Logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Logger.js */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/util/Logger.js");

/** Utility function that logs and throws a specified error if a specified property does not exist.
 *  Used to lightly validate messages being processed primarily to catch errors in Desktop Agent
 *  implementations.
 */
const throwIfUndefined = (property, absentMessage, message, absentError) => {
    if (property === undefined) {
        _Logger_js__WEBPACK_IMPORTED_MODULE_0__.Logger.error(absentMessage, '\nDACP message that resulted in the undefined property: ', message);
        throw new Error(absentError);
    }
};


/***/ },

/***/ "./node_modules/@finos/fdc3-context/dist/generated/context/ContextTypes.js"
/*!*********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-context/dist/generated/context/ContextTypes.js ***!
  \*********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Convert: () => (/* binding */ Convert)
/* harmony export */ });
// To parse this data:
//
//   import { Convert, Action, Chart, ChatInitSettings, ChatMessage, ChatRoom, ChatSearchCriteria, Contact, ContactList, Context, Country, Currency, Email, FileAttachment, Instrument, InstrumentList, Interaction, Message, Nothing, Order, OrderList, Organization, Portfolio, Position, Product, TimeRange, Trade, TradeList, TransactionResult, Valuation } from "./file";
//
//   const action = Convert.toAction(json);
//   const chart = Convert.toChart(json);
//   const chatInitSettings = Convert.toChatInitSettings(json);
//   const chatMessage = Convert.toChatMessage(json);
//   const chatRoom = Convert.toChatRoom(json);
//   const chatSearchCriteria = Convert.toChatSearchCriteria(json);
//   const contact = Convert.toContact(json);
//   const contactList = Convert.toContactList(json);
//   const context = Convert.toContext(json);
//   const country = Convert.toCountry(json);
//   const currency = Convert.toCurrency(json);
//   const email = Convert.toEmail(json);
//   const fileAttachment = Convert.toFileAttachment(json);
//   const instrument = Convert.toInstrument(json);
//   const instrumentList = Convert.toInstrumentList(json);
//   const interaction = Convert.toInteraction(json);
//   const message = Convert.toMessage(json);
//   const nothing = Convert.toNothing(json);
//   const order = Convert.toOrder(json);
//   const orderList = Convert.toOrderList(json);
//   const organization = Convert.toOrganization(json);
//   const portfolio = Convert.toPortfolio(json);
//   const position = Convert.toPosition(json);
//   const product = Convert.toProduct(json);
//   const timeRange = Convert.toTimeRange(json);
//   const trade = Convert.toTrade(json);
//   const tradeList = Convert.toTradeList(json);
//   const transactionResult = Convert.toTransactionResult(json);
//   const valuation = Convert.toValuation(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.
/**
 * Free text to be used for a keyword search
 *
 * `interactionType` SHOULD be one of `'Instant Message'`, `'Email'`, `'Call'`, or
 * `'Meeting'` although other string values are permitted.
 */
// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
class Convert {
    static toAction(json) {
        return cast(JSON.parse(json), r('Action'));
    }
    static actionToJson(value) {
        return JSON.stringify(uncast(value, r('Action')), null, 2);
    }
    static toChart(json) {
        return cast(JSON.parse(json), r('Chart'));
    }
    static chartToJson(value) {
        return JSON.stringify(uncast(value, r('Chart')), null, 2);
    }
    static toChatInitSettings(json) {
        return cast(JSON.parse(json), r('ChatInitSettings'));
    }
    static chatInitSettingsToJson(value) {
        return JSON.stringify(uncast(value, r('ChatInitSettings')), null, 2);
    }
    static toChatMessage(json) {
        return cast(JSON.parse(json), r('ChatMessage'));
    }
    static chatMessageToJson(value) {
        return JSON.stringify(uncast(value, r('ChatMessage')), null, 2);
    }
    static toChatRoom(json) {
        return cast(JSON.parse(json), r('ChatRoom'));
    }
    static chatRoomToJson(value) {
        return JSON.stringify(uncast(value, r('ChatRoom')), null, 2);
    }
    static toChatSearchCriteria(json) {
        return cast(JSON.parse(json), r('ChatSearchCriteria'));
    }
    static chatSearchCriteriaToJson(value) {
        return JSON.stringify(uncast(value, r('ChatSearchCriteria')), null, 2);
    }
    static toContact(json) {
        return cast(JSON.parse(json), r('Contact'));
    }
    static contactToJson(value) {
        return JSON.stringify(uncast(value, r('Contact')), null, 2);
    }
    static toContactList(json) {
        return cast(JSON.parse(json), r('ContactList'));
    }
    static contactListToJson(value) {
        return JSON.stringify(uncast(value, r('ContactList')), null, 2);
    }
    static toContext(json) {
        return cast(JSON.parse(json), r('Context'));
    }
    static contextToJson(value) {
        return JSON.stringify(uncast(value, r('Context')), null, 2);
    }
    static toCountry(json) {
        return cast(JSON.parse(json), r('Country'));
    }
    static countryToJson(value) {
        return JSON.stringify(uncast(value, r('Country')), null, 2);
    }
    static toCurrency(json) {
        return cast(JSON.parse(json), r('Currency'));
    }
    static currencyToJson(value) {
        return JSON.stringify(uncast(value, r('Currency')), null, 2);
    }
    static toEmail(json) {
        return cast(JSON.parse(json), r('Email'));
    }
    static emailToJson(value) {
        return JSON.stringify(uncast(value, r('Email')), null, 2);
    }
    static toFileAttachment(json) {
        return cast(JSON.parse(json), r('FileAttachment'));
    }
    static fileAttachmentToJson(value) {
        return JSON.stringify(uncast(value, r('FileAttachment')), null, 2);
    }
    static toInstrument(json) {
        return cast(JSON.parse(json), r('Instrument'));
    }
    static instrumentToJson(value) {
        return JSON.stringify(uncast(value, r('Instrument')), null, 2);
    }
    static toInstrumentList(json) {
        return cast(JSON.parse(json), r('InstrumentList'));
    }
    static instrumentListToJson(value) {
        return JSON.stringify(uncast(value, r('InstrumentList')), null, 2);
    }
    static toInteraction(json) {
        return cast(JSON.parse(json), r('Interaction'));
    }
    static interactionToJson(value) {
        return JSON.stringify(uncast(value, r('Interaction')), null, 2);
    }
    static toMessage(json) {
        return cast(JSON.parse(json), r('Message'));
    }
    static messageToJson(value) {
        return JSON.stringify(uncast(value, r('Message')), null, 2);
    }
    static toNothing(json) {
        return cast(JSON.parse(json), r('Nothing'));
    }
    static nothingToJson(value) {
        return JSON.stringify(uncast(value, r('Nothing')), null, 2);
    }
    static toOrder(json) {
        return cast(JSON.parse(json), r('Order'));
    }
    static orderToJson(value) {
        return JSON.stringify(uncast(value, r('Order')), null, 2);
    }
    static toOrderList(json) {
        return cast(JSON.parse(json), r('OrderList'));
    }
    static orderListToJson(value) {
        return JSON.stringify(uncast(value, r('OrderList')), null, 2);
    }
    static toOrganization(json) {
        return cast(JSON.parse(json), r('Organization'));
    }
    static organizationToJson(value) {
        return JSON.stringify(uncast(value, r('Organization')), null, 2);
    }
    static toPortfolio(json) {
        return cast(JSON.parse(json), r('Portfolio'));
    }
    static portfolioToJson(value) {
        return JSON.stringify(uncast(value, r('Portfolio')), null, 2);
    }
    static toPosition(json) {
        return cast(JSON.parse(json), r('Position'));
    }
    static positionToJson(value) {
        return JSON.stringify(uncast(value, r('Position')), null, 2);
    }
    static toProduct(json) {
        return cast(JSON.parse(json), r('Product'));
    }
    static productToJson(value) {
        return JSON.stringify(uncast(value, r('Product')), null, 2);
    }
    static toTimeRange(json) {
        return cast(JSON.parse(json), r('TimeRange'));
    }
    static timeRangeToJson(value) {
        return JSON.stringify(uncast(value, r('TimeRange')), null, 2);
    }
    static toTrade(json) {
        return cast(JSON.parse(json), r('Trade'));
    }
    static tradeToJson(value) {
        return JSON.stringify(uncast(value, r('Trade')), null, 2);
    }
    static toTradeList(json) {
        return cast(JSON.parse(json), r('TradeList'));
    }
    static tradeListToJson(value) {
        return JSON.stringify(uncast(value, r('TradeList')), null, 2);
    }
    static toTransactionResult(json) {
        return cast(JSON.parse(json), r('TransactionResult'));
    }
    static transactionResultToJson(value) {
        return JSON.stringify(uncast(value, r('TransactionResult')), null, 2);
    }
    static toValuation(json) {
        return cast(JSON.parse(json), r('Valuation'));
    }
    static valuationToJson(value) {
        return JSON.stringify(uncast(value, r('Valuation')), null, 2);
    }
}
function invalidValue(typ, val, key, parent = '') {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}
function prettyTypeName(typ) {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        }
        else {
            return `one of [${typ
                .map(a => {
                return prettyTypeName(a);
            })
                .join(', ')}]`;
        }
    }
    else if (typeof typ === 'object' && typ.literal !== undefined) {
        return typ.literal;
    }
    else {
        return typeof typ;
    }
}
function jsonToJSProps(typ) {
    if (typ.jsonToJS === undefined) {
        const map = {};
        typ.props.forEach((p) => (map[p.json] = { key: p.js, typ: p.typ }));
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}
function jsToJSONProps(typ) {
    if (typ.jsToJSON === undefined) {
        const map = {};
        typ.props.forEach((p) => (map[p.js] = { key: p.json, typ: p.typ }));
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}
function transform(val, typ, getProps, key = '', parent = '') {
    function transformPrimitive(typ, val) {
        if (typeof typ === typeof val)
            return val;
        return invalidValue(typ, val, key, parent);
    }
    function transformUnion(typs, val) {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            }
            catch (_) { }
        }
        return invalidValue(typs, val, key, parent);
    }
    function transformEnum(cases, val) {
        if (cases.indexOf(val) !== -1)
            return val;
        return invalidValue(cases.map(a => {
            return l(a);
        }), val, key, parent);
    }
    function transformArray(typ, val) {
        // val must be an array with no invalid elements
        if (!Array.isArray(val))
            return invalidValue(l('array'), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }
    function transformDate(val) {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l('Date'), val, key, parent);
        }
        return d;
    }
    function transformObject(props, additional, val) {
        if (val === null || typeof val !== 'object' || Array.isArray(val)) {
            return invalidValue(l(ref || 'object'), val, key, parent);
        }
        const result = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }
    if (typ === 'any')
        return val;
    if (typ === null) {
        if (val === null)
            return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false)
        return invalidValue(typ, val, key, parent);
    let ref = undefined;
    while (typeof typ === 'object' && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ))
        return transformEnum(typ, val);
    if (typeof typ === 'object') {
        return typ.hasOwnProperty('unionMembers')
            ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty('arrayItems')
                ? transformArray(typ.arrayItems, val)
                : typ.hasOwnProperty('props')
                    ? transformObject(getProps(typ), typ.additional, val)
                    : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== 'number')
        return transformDate(val);
    return transformPrimitive(typ, val);
}
function cast(val, typ) {
    return transform(val, typ, jsonToJSProps);
}
function uncast(val, typ) {
    return transform(val, typ, jsToJSONProps);
}
function l(typ) {
    return { literal: typ };
}
function a(typ) {
    return { arrayItems: typ };
}
function u(...typs) {
    return { unionMembers: typs };
}
function o(props, additional) {
    return { props, additional };
}
function m(additional) {
    return { props: [], additional };
}
function r(name) {
    return { ref: name };
}
const typeMap = {
    Action: o([
        { json: 'action', js: 'action', typ: u(undefined, r('ActionType')) },
        { json: 'app', js: 'app', typ: u(undefined, r('AppIdentifier')) },
        { json: 'channelId', js: 'channelId', typ: u(undefined, '') },
        { json: 'context', js: 'context', typ: r('ContextElement') },
        { json: 'intent', js: 'intent', typ: u(undefined, '') },
        { json: 'title', js: 'title', typ: '' },
        { json: 'type', js: 'type', typ: r('ActionTypeEnum') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    AppIdentifier: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'desktopAgent', js: 'desktopAgent', typ: u(undefined, '') },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    ContextElement: o([
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: '' },
    ], 'any'),
    Chart: o([
        { json: 'instruments', js: 'instruments', typ: a(r('InstrumentElement')) },
        { json: 'otherConfig', js: 'otherConfig', typ: u(undefined, a(r('ContextElement'))) },
        { json: 'range', js: 'range', typ: u(undefined, r('TimeRangeObject')) },
        { json: 'style', js: 'style', typ: u(undefined, r('ChartStyle')) },
        { json: 'type', js: 'type', typ: r('ChartType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    InstrumentElement: o([
        { json: 'id', js: 'id', typ: r('PurpleInstrumentIdentifiers') },
        { json: 'market', js: 'market', typ: u(undefined, r('OrganizationMarket')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('PurpleInteractionType') },
    ], 'any'),
    PurpleInstrumentIdentifiers: o([
        { json: 'BBG', js: 'BBG', typ: u(undefined, '') },
        { json: 'CUSIP', js: 'CUSIP', typ: u(undefined, '') },
        { json: 'FDS_ID', js: 'FDS_ID', typ: u(undefined, '') },
        { json: 'FIGI', js: 'FIGI', typ: u(undefined, '') },
        { json: 'ISIN', js: 'ISIN', typ: u(undefined, '') },
        { json: 'PERMID', js: 'PERMID', typ: u(undefined, '') },
        { json: 'RIC', js: 'RIC', typ: u(undefined, '') },
        { json: 'SEDOL', js: 'SEDOL', typ: u(undefined, '') },
        { json: 'ticker', js: 'ticker', typ: u(undefined, '') },
    ], 'any'),
    OrganizationMarket: o([
        { json: 'BBG', js: 'BBG', typ: u(undefined, '') },
        { json: 'COUNTRY_ISOALPHA2', js: 'COUNTRY_ISOALPHA2', typ: u(undefined, '') },
        { json: 'MIC', js: 'MIC', typ: u(undefined, '') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    TimeRangeObject: o([
        { json: 'endTime', js: 'endTime', typ: u(undefined, Date) },
        { json: 'startTime', js: 'startTime', typ: u(undefined, Date) },
        { json: 'type', js: 'type', typ: r('TimeRangeType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    ChatInitSettings: o([
        { json: 'chatName', js: 'chatName', typ: u(undefined, '') },
        { json: 'members', js: 'members', typ: u(undefined, r('ContactListObject')) },
        { json: 'message', js: 'message', typ: u(undefined, u(r('MessageObject'), '')) },
        { json: 'options', js: 'options', typ: u(undefined, r('ChatOptions')) },
        { json: 'type', js: 'type', typ: r('ChatInitSettingsType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    ContactListObject: o([
        { json: 'contacts', js: 'contacts', typ: a(r('ContactElement')) },
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('ContactListType') },
    ], 'any'),
    ContactElement: o([
        { json: 'id', js: 'id', typ: r('PurpleContactIdentifiers') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('FluffyInteractionType') },
    ], 'any'),
    PurpleContactIdentifiers: o([
        { json: 'email', js: 'email', typ: u(undefined, '') },
        { json: 'FDS_ID', js: 'FDS_ID', typ: u(undefined, '') },
    ], 'any'),
    MessageObject: o([
        { json: 'entities', js: 'entities', typ: u(undefined, m(r('EntityValue'))) },
        { json: 'text', js: 'text', typ: u(undefined, r('PurpleMessageText')) },
        { json: 'type', js: 'type', typ: r('MessageType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    EntityValue: o([
        { json: 'action', js: 'action', typ: u(undefined, r('ActionType')) },
        { json: 'app', js: 'app', typ: u(undefined, r('AppIdentifier')) },
        { json: 'channelId', js: 'channelId', typ: u(undefined, '') },
        { json: 'context', js: 'context', typ: u(undefined, r('ContextElement')) },
        { json: 'intent', js: 'intent', typ: u(undefined, '') },
        { json: 'title', js: 'title', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('EntityType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'data', js: 'data', typ: u(undefined, r('EntityData')) },
    ], 'any'),
    EntityData: o([
        { json: 'dataUri', js: 'dataUri', typ: '' },
        { json: 'name', js: 'name', typ: '' },
    ], 'any'),
    PurpleMessageText: o([
        { json: 'text/markdown', js: 'text/markdown', typ: u(undefined, '') },
        { json: 'text/plain', js: 'text/plain', typ: u(undefined, '') },
    ], 'any'),
    ChatOptions: o([
        { json: 'allowAddUser', js: 'allowAddUser', typ: u(undefined, true) },
        { json: 'allowHistoryBrowsing', js: 'allowHistoryBrowsing', typ: u(undefined, true) },
        { json: 'allowMessageCopy', js: 'allowMessageCopy', typ: u(undefined, true) },
        { json: 'groupRecipients', js: 'groupRecipients', typ: u(undefined, true) },
        { json: 'isPublic', js: 'isPublic', typ: u(undefined, true) },
    ], 'any'),
    ChatMessage: o([
        { json: 'chatRoom', js: 'chatRoom', typ: r('ChatRoomObject') },
        { json: 'message', js: 'message', typ: r('MessageObject') },
        { json: 'type', js: 'type', typ: r('ChatMessageType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    ChatRoomObject: o([
        { json: 'id', js: 'id', typ: m('') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'providerName', js: 'providerName', typ: '' },
        { json: 'type', js: 'type', typ: r('ChatRoomType') },
        { json: 'url', js: 'url', typ: u(undefined, '') },
    ], 'any'),
    ChatRoom: o([
        { json: 'id', js: 'id', typ: m('') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'providerName', js: 'providerName', typ: '' },
        { json: 'type', js: 'type', typ: r('ChatRoomType') },
        { json: 'url', js: 'url', typ: u(undefined, '') },
    ], 'any'),
    ChatSearchCriteria: o([
        { json: 'criteria', js: 'criteria', typ: a(u(r('OrganizationObject'), '')) },
        { json: 'type', js: 'type', typ: r('ChatSearchCriteriaType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    OrganizationObject: o([
        { json: 'id', js: 'id', typ: r('Identifiers') },
        { json: 'market', js: 'market', typ: u(undefined, r('OrganizationMarket')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('TentacledInteractionType') },
    ], 'any'),
    Identifiers: o([
        { json: 'BBG', js: 'BBG', typ: u(undefined, '') },
        { json: 'CUSIP', js: 'CUSIP', typ: u(undefined, '') },
        { json: 'FDS_ID', js: 'FDS_ID', typ: u(undefined, '') },
        { json: 'FIGI', js: 'FIGI', typ: u(undefined, '') },
        { json: 'ISIN', js: 'ISIN', typ: u(undefined, '') },
        { json: 'PERMID', js: 'PERMID', typ: u(undefined, '') },
        { json: 'RIC', js: 'RIC', typ: u(undefined, '') },
        { json: 'SEDOL', js: 'SEDOL', typ: u(undefined, '') },
        { json: 'ticker', js: 'ticker', typ: u(undefined, '') },
        { json: 'LEI', js: 'LEI', typ: u(undefined, '') },
        { json: 'email', js: 'email', typ: u(undefined, '') },
    ], 'any'),
    Contact: o([
        { json: 'id', js: 'id', typ: r('FluffyContactIdentifiers') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('FluffyInteractionType') },
    ], 'any'),
    FluffyContactIdentifiers: o([
        { json: 'email', js: 'email', typ: u(undefined, '') },
        { json: 'FDS_ID', js: 'FDS_ID', typ: u(undefined, '') },
    ], 'any'),
    ContactList: o([
        { json: 'contacts', js: 'contacts', typ: a(r('ContactElement')) },
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('ContactListType') },
    ], 'any'),
    Context: o([
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: '' },
    ], 'any'),
    Country: o([
        { json: 'id', js: 'id', typ: r('CountryID') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('CountryType') },
    ], 'any'),
    CountryID: o([
        { json: 'COUNTRY_ISOALPHA2', js: 'COUNTRY_ISOALPHA2', typ: u(undefined, '') },
        { json: 'COUNTRY_ISOALPHA3', js: 'COUNTRY_ISOALPHA3', typ: u(undefined, '') },
        { json: 'ISOALPHA2', js: 'ISOALPHA2', typ: u(undefined, '') },
        { json: 'ISOALPHA3', js: 'ISOALPHA3', typ: u(undefined, '') },
    ], 'any'),
    Currency: o([
        { json: 'id', js: 'id', typ: r('CurrencyID') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('CurrencyType') },
    ], 'any'),
    CurrencyID: o([{ json: 'CURRENCY_ISOCODE', js: 'CURRENCY_ISOCODE', typ: u(undefined, '') }], 'any'),
    Email: o([
        { json: 'recipients', js: 'recipients', typ: r('EmailRecipients') },
        { json: 'subject', js: 'subject', typ: u(undefined, '') },
        { json: 'textBody', js: 'textBody', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('EmailType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    EmailRecipients: o([
        { json: 'id', js: 'id', typ: u(undefined, r('ContactTIdentifiers')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('EmailRecipientsType') },
        { json: 'contacts', js: 'contacts', typ: u(undefined, a(r('ContactElement'))) },
    ], 'any'),
    ContactTIdentifiers: o([
        { json: 'email', js: 'email', typ: u(undefined, '') },
        { json: 'FDS_ID', js: 'FDS_ID', typ: u(undefined, '') },
    ], 'any'),
    FileAttachment: o([
        { json: 'data', js: 'data', typ: r('FileAttachmentData') },
        { json: 'type', js: 'type', typ: r('FileAttachmentType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    FileAttachmentData: o([
        { json: 'dataUri', js: 'dataUri', typ: '' },
        { json: 'name', js: 'name', typ: '' },
    ], 'any'),
    Instrument: o([
        { json: 'id', js: 'id', typ: r('FluffyInstrumentIdentifiers') },
        { json: 'market', js: 'market', typ: u(undefined, r('PurpleMarket')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('PurpleInteractionType') },
    ], 'any'),
    FluffyInstrumentIdentifiers: o([
        { json: 'BBG', js: 'BBG', typ: u(undefined, '') },
        { json: 'CUSIP', js: 'CUSIP', typ: u(undefined, '') },
        { json: 'FDS_ID', js: 'FDS_ID', typ: u(undefined, '') },
        { json: 'FIGI', js: 'FIGI', typ: u(undefined, '') },
        { json: 'ISIN', js: 'ISIN', typ: u(undefined, '') },
        { json: 'PERMID', js: 'PERMID', typ: u(undefined, '') },
        { json: 'RIC', js: 'RIC', typ: u(undefined, '') },
        { json: 'SEDOL', js: 'SEDOL', typ: u(undefined, '') },
        { json: 'ticker', js: 'ticker', typ: u(undefined, '') },
    ], 'any'),
    PurpleMarket: o([
        { json: 'BBG', js: 'BBG', typ: u(undefined, '') },
        { json: 'COUNTRY_ISOALPHA2', js: 'COUNTRY_ISOALPHA2', typ: u(undefined, '') },
        { json: 'MIC', js: 'MIC', typ: u(undefined, '') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    InstrumentList: o([
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'instruments', js: 'instruments', typ: a(r('InstrumentElement')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('InstrumentListType') },
    ], 'any'),
    Interaction: o([
        { json: 'description', js: 'description', typ: '' },
        { json: 'id', js: 'id', typ: u(undefined, r('InteractionID')) },
        { json: 'initiator', js: 'initiator', typ: u(undefined, r('ContactElement')) },
        { json: 'interactionType', js: 'interactionType', typ: '' },
        { json: 'origin', js: 'origin', typ: u(undefined, '') },
        { json: 'participants', js: 'participants', typ: r('ContactListObject') },
        { json: 'timeRange', js: 'timeRange', typ: r('TimeRangeObject') },
        { json: 'type', js: 'type', typ: r('InteractionType') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    InteractionID: o([
        { json: 'SALESFORCE', js: 'SALESFORCE', typ: u(undefined, '') },
        { json: 'SINGLETRACK', js: 'SINGLETRACK', typ: u(undefined, '') },
        { json: 'URI', js: 'URI', typ: u(undefined, '') },
    ], 'any'),
    Message: o([
        { json: 'entities', js: 'entities', typ: u(undefined, m(r('EntityValue'))) },
        { json: 'text', js: 'text', typ: u(undefined, r('FluffyMessageText')) },
        { json: 'type', js: 'type', typ: r('MessageType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    FluffyMessageText: o([
        { json: 'text/markdown', js: 'text/markdown', typ: u(undefined, '') },
        { json: 'text/plain', js: 'text/plain', typ: u(undefined, '') },
    ], 'any'),
    Nothing: o([
        { json: 'type', js: 'type', typ: r('NothingType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    Order: o([
        { json: 'details', js: 'details', typ: u(undefined, r('PurpleOrderDetails')) },
        { json: 'id', js: 'id', typ: m('') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'notes', js: 'notes', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('OrderType') },
    ], 'any'),
    PurpleOrderDetails: o([{ json: 'product', js: 'product', typ: u(undefined, r('ProductObject')) }], 'any'),
    ProductObject: o([
        { json: 'id', js: 'id', typ: m('') },
        { json: 'instrument', js: 'instrument', typ: u(undefined, r('InstrumentElement')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'notes', js: 'notes', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('ProductType') },
    ], 'any'),
    OrderList: o([
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'orders', js: 'orders', typ: a(r('OrderElement')) },
        { json: 'type', js: 'type', typ: r('OrderListType') },
    ], 'any'),
    OrderElement: o([
        { json: 'details', js: 'details', typ: u(undefined, r('FluffyOrderDetails')) },
        { json: 'id', js: 'id', typ: m('') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'notes', js: 'notes', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('OrderType') },
    ], 'any'),
    FluffyOrderDetails: o([{ json: 'product', js: 'product', typ: u(undefined, r('ProductObject')) }], 'any'),
    Organization: o([
        { json: 'id', js: 'id', typ: r('OrganizationIdentifiers') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('StickyInteractionType') },
    ], 'any'),
    OrganizationIdentifiers: o([
        { json: 'FDS_ID', js: 'FDS_ID', typ: u(undefined, '') },
        { json: 'LEI', js: 'LEI', typ: u(undefined, '') },
        { json: 'PERMID', js: 'PERMID', typ: u(undefined, '') },
    ], 'any'),
    Portfolio: o([
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'positions', js: 'positions', typ: a(r('PositionElement')) },
        { json: 'type', js: 'type', typ: r('PortfolioType') },
    ], 'any'),
    PositionElement: o([
        { json: 'holding', js: 'holding', typ: 3.14 },
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'instrument', js: 'instrument', typ: r('InstrumentElement') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('PositionType') },
    ], 'any'),
    Position: o([
        { json: 'holding', js: 'holding', typ: 3.14 },
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'instrument', js: 'instrument', typ: r('InstrumentElement') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('PositionType') },
    ], 'any'),
    Product: o([
        { json: 'id', js: 'id', typ: m('') },
        { json: 'instrument', js: 'instrument', typ: u(undefined, r('InstrumentElement')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'notes', js: 'notes', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: r('ProductType') },
    ], 'any'),
    TimeRange: o([
        { json: 'endTime', js: 'endTime', typ: u(undefined, Date) },
        { json: 'startTime', js: 'startTime', typ: u(undefined, Date) },
        { json: 'type', js: 'type', typ: r('TimeRangeType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    Trade: o([
        { json: 'id', js: 'id', typ: m('') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'notes', js: 'notes', typ: u(undefined, '') },
        { json: 'product', js: 'product', typ: r('ProductObject') },
        { json: 'type', js: 'type', typ: r('TradeType') },
    ], 'any'),
    TradeList: o([
        { json: 'id', js: 'id', typ: u(undefined, m('')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'trades', js: 'trades', typ: a(r('TradeElement')) },
        { json: 'type', js: 'type', typ: r('TradeListType') },
    ], 'any'),
    TradeElement: o([
        { json: 'id', js: 'id', typ: m('') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'notes', js: 'notes', typ: u(undefined, '') },
        { json: 'product', js: 'product', typ: r('ProductObject') },
        { json: 'type', js: 'type', typ: r('TradeType') },
    ], 'any'),
    TransactionResult: o([
        { json: 'context', js: 'context', typ: u(undefined, r('ContextElement')) },
        { json: 'message', js: 'message', typ: u(undefined, '') },
        { json: 'status', js: 'status', typ: r('TransactionStatus') },
        { json: 'type', js: 'type', typ: r('TransactionResultType') },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    Valuation: o([
        { json: 'CURRENCY_ISOCODE', js: 'CURRENCY_ISOCODE', typ: '' },
        { json: 'expiryTime', js: 'expiryTime', typ: u(undefined, Date) },
        { json: 'price', js: 'price', typ: u(undefined, 3.14) },
        { json: 'type', js: 'type', typ: r('ValuationType') },
        { json: 'valuationTime', js: 'valuationTime', typ: u(undefined, Date) },
        { json: 'value', js: 'value', typ: 3.14 },
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], 'any'),
    ActionType: ['broadcast', 'raiseIntent'],
    ActionTypeEnum: ['fdc3.action'],
    PurpleInteractionType: ['fdc3.instrument'],
    TimeRangeType: ['fdc3.timeRange'],
    ChartStyle: ['bar', 'candle', 'custom', 'heatmap', 'histogram', 'line', 'mountain', 'pie', 'scatter', 'stacked-bar'],
    ChartType: ['fdc3.chart'],
    FluffyInteractionType: ['fdc3.contact'],
    ContactListType: ['fdc3.contactList'],
    EntityType: ['fdc3.action', 'fdc3.fileAttachment'],
    MessageType: ['fdc3.message'],
    ChatInitSettingsType: ['fdc3.chat.initSettings'],
    ChatRoomType: ['fdc3.chat.room'],
    ChatMessageType: ['fdc3.chat.message'],
    TentacledInteractionType: ['fdc3.contact', 'fdc3.instrument', 'fdc3.organization'],
    ChatSearchCriteriaType: ['fdc3.chat.searchCriteria'],
    CountryType: ['fdc3.country'],
    CurrencyType: ['fdc3.currency'],
    EmailRecipientsType: ['fdc3.contact', 'fdc3.contactList'],
    EmailType: ['fdc3.email'],
    FileAttachmentType: ['fdc3.fileAttachment'],
    InstrumentListType: ['fdc3.instrumentList'],
    InteractionType: ['fdc3.interaction'],
    NothingType: ['fdc3.nothing'],
    ProductType: ['fdc3.product'],
    OrderType: ['fdc3.order'],
    OrderListType: ['fdc3.orderList'],
    StickyInteractionType: ['fdc3.organization'],
    PositionType: ['fdc3.position'],
    PortfolioType: ['fdc3.portfolio'],
    TradeType: ['fdc3.trade'],
    TradeListType: ['fdc3.tradeList'],
    TransactionStatus: ['Created', 'Deleted', 'Failed', 'Updated'],
    TransactionResultType: ['fdc3.transactionResult'],
    ValuationType: ['fdc3.valuation'],
};


/***/ },

/***/ "./node_modules/@finos/fdc3-context/dist/src/index.js"
/*!************************************************************!*\
  !*** ./node_modules/@finos/fdc3-context/dist/src/index.js ***!
  \************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Convert: () => (/* reexport safe */ _generated_context_ContextTypes_js__WEBPACK_IMPORTED_MODULE_0__.Convert)
/* harmony export */ });
/* harmony import */ var _generated_context_ContextTypes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../generated/context/ContextTypes.js */ "./node_modules/@finos/fdc3-context/dist/generated/context/ContextTypes.js");



/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/index.js"
/*!**************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/index.js ***!
  \**************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractUIComponent: () => (/* reexport safe */ _ui_AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_1__.AbstractUIComponent),
/* harmony export */   DefaultDesktopAgentChannelSelector: () => (/* reexport safe */ _ui_DefaultDesktopAgentChannelSelector_js__WEBPACK_IMPORTED_MODULE_2__.DefaultDesktopAgentChannelSelector),
/* harmony export */   DefaultDesktopAgentIntentResolver: () => (/* reexport safe */ _ui_DefaultDesktopAgentIntentResolver_js__WEBPACK_IMPORTED_MODULE_3__.DefaultDesktopAgentIntentResolver),
/* harmony export */   NullChannelSelector: () => (/* reexport safe */ _ui_NullChannelSelector_js__WEBPACK_IMPORTED_MODULE_4__.NullChannelSelector),
/* harmony export */   NullIntentResolver: () => (/* reexport safe */ _ui_NullIntentResolver_js__WEBPACK_IMPORTED_MODULE_5__.NullIntentResolver),
/* harmony export */   fdc3Ready: () => (/* binding */ fdc3Ready),
/* harmony export */   getAgent: () => (/* reexport safe */ _strategies_getAgent_js__WEBPACK_IMPORTED_MODULE_0__.getAgent)
/* harmony export */ });
/* harmony import */ var _strategies_getAgent_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./strategies/getAgent.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/getAgent.js");
/* harmony import */ var _ui_AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ui/AbstractUIComponent.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/AbstractUIComponent.js");
/* harmony import */ var _ui_DefaultDesktopAgentChannelSelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ui/DefaultDesktopAgentChannelSelector.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentChannelSelector.js");
/* harmony import */ var _ui_DefaultDesktopAgentIntentResolver_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./ui/DefaultDesktopAgentIntentResolver.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentIntentResolver.js");
/* harmony import */ var _ui_NullChannelSelector_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ui/NullChannelSelector.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullChannelSelector.js");
/* harmony import */ var _ui_NullIntentResolver_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./ui/NullIntentResolver.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullIntentResolver.js");






const DEFAULT_WAIT_FOR_MS = 20000;

/**
 * Replaces the original fdc3Ready function from FDC3 2.0 with a new one that uses the new getAgent function.
 *
 * @param waitForMs Amount of time to wait before failing the promise (20 seconds is the default).
 * @returns A DesktopAgent promise.
 *
 * @deprecated This function is provided for backwards compatibility.  Use `const fdc3 = getAgent()` to retrieve (and
 * wait for) a reference to the FDC3 API instead.
 */
function fdc3Ready(waitForMs = DEFAULT_WAIT_FOR_MS) {
    return (0,_strategies_getAgent_js__WEBPACK_IMPORTED_MODULE_0__.getAgent)({
        timeoutMs: waitForMs,
        dontSetWindowFdc3: false,
        channelSelector: true,
        intentResolver: true,
    });
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/messaging/MessagePortMessaging.js"
/*!***************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/messaging/MessagePortMessaging.js ***!
  \***************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MessagePortMessaging: () => (/* binding */ MessagePortMessaging)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-agent-proxy */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/index.js");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/v4.js");


class MessagePortMessaging extends _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__.AbstractMessaging {
    cd;
    listeners = new Map();
    constructor(cd, appIdentifier) {
        super(appIdentifier);
        this.cd = cd;
        this.cd.messagePort.addEventListener('message', m => {
            this.listeners.forEach(v => {
                if (v.filter(m.data)) {
                    v.action(m.data);
                }
            });
        });
    }
    createUUID() {
        return (0,uuid__WEBPACK_IMPORTED_MODULE_1__["default"])();
    }
    async post(message) {
        this.cd.messagePort.postMessage(message);
        return Promise.resolve();
    }
    register(l) {
        this.listeners.set(l.id, l);
    }
    unregister(id) {
        this.listeners.delete(id);
    }
    createMeta() {
        return {
            requestUuid: this.createUUID(),
            timestamp: new Date(),
            source: super.getAppIdentifier(),
        };
    }
    async disconnect() {
        const bye = {
            type: 'WCP6Goodbye',
            meta: {
                timestamp: new Date(),
            },
        };
        await this.post(bye);
        this.cd.messagePort.close();
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/messaging/message-port.js"
/*!*******************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/messaging/message-port.js ***!
  \*******************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createDesktopAgentAPI: () => (/* binding */ createDesktopAgentAPI)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-agent-proxy */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/index.js");
/* harmony import */ var _MessagePortMessaging_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./MessagePortMessaging.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/messaging/MessagePortMessaging.js");
/* harmony import */ var _ui_DefaultDesktopAgentIntentResolver_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../ui/DefaultDesktopAgentIntentResolver.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentIntentResolver.js");
/* harmony import */ var _ui_DefaultDesktopAgentChannelSelector_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../ui/DefaultDesktopAgentChannelSelector.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentChannelSelector.js");
/* harmony import */ var _ui_NullIntentResolver_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../ui/NullIntentResolver.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullIntentResolver.js");
/* harmony import */ var _ui_NullChannelSelector_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../ui/NullChannelSelector.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullChannelSelector.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");







/**
 * Given a message port, constructs a desktop agent to communicate via that.
 */
async function createDesktopAgentAPI(cd, appIdentifier, logLevel) {
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('message-port: Creating Desktop Agent...');
    //Message port should have already been started for use in identity validation
    function string(o) {
        if (o == true || o == false) {
            return null;
        }
        else {
            return o;
        }
    }
    const messaging = new _MessagePortMessaging_js__WEBPACK_IMPORTED_MODULE_1__.MessagePortMessaging(cd, appIdentifier);
    const useResolver = cd.handshake.payload.intentResolverUrl && cd.options.intentResolver;
    const useSelector = cd.handshake.payload.channelSelectorUrl && cd.options.channelSelector;
    const intentResolver = useResolver
        ? new _ui_DefaultDesktopAgentIntentResolver_js__WEBPACK_IMPORTED_MODULE_2__.DefaultDesktopAgentIntentResolver(string(cd.handshake.payload.intentResolverUrl))
        : new _ui_NullIntentResolver_js__WEBPACK_IMPORTED_MODULE_4__.NullIntentResolver();
    const channelSelector = useSelector
        ? new _ui_DefaultDesktopAgentChannelSelector_js__WEBPACK_IMPORTED_MODULE_3__.DefaultDesktopAgentChannelSelector(string(cd.handshake.payload.channelSelectorUrl))
        : new _ui_NullChannelSelector_js__WEBPACK_IMPORTED_MODULE_5__.NullChannelSelector();
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('message-port: Setting up support components...');
    const hs = new _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__.DefaultHeartbeatSupport(messaging);
    const cs = new _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__.DefaultChannelSupport(messaging, channelSelector, cd.messageExchangeTimeout);
    const is = new _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__.DefaultIntentSupport(messaging, intentResolver, cd.messageExchangeTimeout, cd.appLaunchTimeout);
    const as = new _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__.DefaultAppSupport(messaging, cd.messageExchangeTimeout, cd.appLaunchTimeout);
    const da = new _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__.DesktopAgentProxy(hs, cs, is, as, [hs, cs, intentResolver, channelSelector], logLevel);
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('message-port: Connecting components ...');
    await da.connect();
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('message-port: Populating channel selector...');
    await populateChannelSelector(cs, channelSelector);
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('message-port: Setting up disconnect handling...');
    handleDisconnectOnPageHide(da, messaging);
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.debug('message-port: Returning...');
    return da;
}
async function populateChannelSelector(cs, channelSelector) {
    const channel = await cs.getUserChannel();
    const userChannels = await cs.getUserChannels();
    channelSelector.updateChannel(channel?.id ?? null, userChannels);
}
function handleDisconnectOnPageHide(da, messaging) {
    globalThis.window.addEventListener('pagehide', async (event) => {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_6__.Logger.log(`Received pagehide event with persisted ${event.persisted}`);
        //If persisted == true then the page is stored and might come back if the user hits back
        //  In that case don't disconnect and let heartbeat handle that instead
        //TODO: implement disconnect on any hide and reconnect if the page is shown again
        //  Will have to happen inside the DesktopAgentProxy as the reference to the DA needs to remain the same
        //  and any listeners need to be re-registered automatically etc.
        if (!event.persisted) {
            //the page is being destroyed, disconnect from the DA
            //Notify the Desktop Agent implementation to disconnect
            da.disconnect();
            //disconnect the MessagePort - which should send WCP6Goodbye first
            messaging.disconnect();
        }
    });
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/sessionStorage/DesktopAgentDetails.js"
/*!*******************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/sessionStorage/DesktopAgentDetails.js ***!
  \*******************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   retrieveAllDesktopAgentDetails: () => (/* binding */ retrieveAllDesktopAgentDetails),
/* harmony export */   retrieveDesktopAgentDetails: () => (/* binding */ retrieveDesktopAgentDetails),
/* harmony export */   sessionKey: () => (/* binding */ sessionKey),
/* harmony export */   storeDesktopAgentDetails: () => (/* binding */ storeDesktopAgentDetails)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _util_Uuid_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/Uuid.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Uuid.js");



/**
 * Note that we also key by the window name as well, in case multiple iframes are using the same session storage.
 */
function sessionKey() {
    //If the window or frame is not named, create and apply a unique name to it
    if (!globalThis.window.name) {
        globalThis.window.name = (0,_util_Uuid_js__WEBPACK_IMPORTED_MODULE_2__.createUUID)();
    }
    const windowName = globalThis.window.name;
    const keyName = _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX + '-' + windowName;
    return keyName;
}
/** Used to persist data on the connection, which can later be used to ensure
 *  reconnection to the same Desktop Agent and to request the same instanceId.
 */
function storeDesktopAgentDetails(details) {
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`DesktopAgentDetails: Storing Desktop Agent details:`, details);
    //check if there are existing details in storage to update
    let detailsToStore = retrieveAllDesktopAgentDetails();
    if (!detailsToStore) {
        detailsToStore = {};
    }
    detailsToStore[details.identityUrl] = details;
    globalThis.sessionStorage.setItem(sessionKey(), JSON.stringify(detailsToStore));
}
/** Retrieves persisted data about previous connections. Used to ensure reconnection
 *  to the same agent and to request the same instanceId.
 */
function retrieveAllDesktopAgentDetails() {
    const detailsStr = globalThis.sessionStorage.getItem(sessionKey());
    if (detailsStr) {
        try {
            const theData = JSON.parse(detailsStr);
            if (typeof theData !== 'object' || Array.isArray(theData)) {
                throw new Error('Stored DesktopAgentDetails is not in the expected format!');
            }
            return theData;
        }
        catch (e) {
            _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            `DesktopAgentDetails: FDC3 connection data couldn't be parsed\nstorage key: ${sessionKey()}\nvalue: ${detailsStr}\nmessage: ${e.message ?? e}`);
            return null;
        }
    }
    else {
        return null;
    }
}
/** Retrieves persisted data about previous connections for this specific app
 *  (identified by the identityUrl). Used to ensure reconnection to the same
 *  agent and to request the same instanceId.
 */
function retrieveDesktopAgentDetails(identityUrl) {
    const allDetails = retrieveAllDesktopAgentDetails();
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`DesktopAgentDetails: retrieveDesktopAgentDetails:`, allDetails);
    if (allDetails) {
        const theData = allDetails[identityUrl];
        if (theData) {
            //check we got the minimum properties
            if (typeof theData.agentType === 'string' &&
                theData.agentType && //TODO: check this is one of the enum values
                typeof theData.appId === 'string' &&
                theData.appId &&
                typeof theData.instanceId === 'string' &&
                theData.instanceId) {
                return theData;
            }
            else {
                //ignore it and post a warning
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`DesktopAgentDetails: Stored details do not meet minimum requirements and will be ignored:\n${JSON.stringify(theData, null, 2)}`);
                return null;
            }
        }
    }
    return null;
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/DesktopAgentPreloadLoader.js"
/*!*********************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/strategies/DesktopAgentPreloadLoader.js ***!
  \*********************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DesktopAgentPreloadLoader: () => (/* binding */ DesktopAgentPreloadLoader)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _Timeouts_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Timeouts.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/Timeouts.js");



/**
 * This approach will resolve the loader promise if the fdc3Ready event occurs.
 * This is done by Desktop Agent Preload implementations setting window.fdc3.
 */
class DesktopAgentPreloadLoader {
    name = 'DesktopAgentPreloadLoader';
    /** Reference to the handler for the fdc3Ready event (used to remove it) */
    readyEventHandler = null;
    /** Variable used to end polling */
    done = false;
    /** Overall timeout */
    timeout = null;
    /** Timeout used in polling */
    pollingTimeout = null;
    /** Reference to the get fn's Promise's reject call - used when cancelling. */
    rejectFn = null;
    async poll(resolve) {
        if (!this.done) {
            if (globalThis.window.fdc3) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`DesktopAgentPreloadLoader.get(): Discovered DA through polling...`);
                this.prepareSelection(globalThis.window.fdc3, resolve);
            }
            else {
                this.pollingTimeout = setTimeout(() => this.poll(resolve), 100);
            }
        }
    }
    async prepareSelection(fdc3, resolve) {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug('DesktopAgentPreloadLoader: Preparing selection');
        //note that we've found an agent and will be settling our get promise
        this.rejectFn = null;
        //stop polling and listening for fdc3Ready
        this.cancel();
        //retrieve appId from DA
        const implMetadata = await fdc3.getInfo();
        const selection = {
            agent: fdc3,
            details: {
                agentType: _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.Preload,
                identityUrl: globalThis.window.location.href,
                actualUrl: globalThis.window.location.href,
                appId: implMetadata?.appMetadata?.appId ?? 'unknown',
                instanceId: implMetadata?.appMetadata?.instanceId ?? 'unknown',
                instanceUuid: implMetadata?.appMetadata?.instanceId ?? 'unknown', // preload DAs don't issue these so repeat the instanceId
            },
        };
        resolve(selection);
    }
    get(options) {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`DesktopAgentPreloadLoader.get(): Initiating search for Desktop Agent Preload`);
        return new Promise((resolve, reject) => {
            //save reject fn in case we get cancelled
            this.rejectFn = reject;
            //do an initial check
            if (globalThis.window.fdc3) {
                this.prepareSelection(globalThis.window.fdc3, resolve);
            }
            else {
                //setup a timeout so that we can reject if don't find anything
                const timeoutMs = options.timeoutMs ?? _Timeouts_js__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_GETAGENT_TIMEOUT_MS;
                this.timeout = setTimeout(() => {
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`DesktopAgentPreloadLoader.get(): timeout (${timeoutMs} ms) at ${new Date().toISOString()}`);
                    reject(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.AgentNotFound);
                    this.cancel();
                }, timeoutMs);
                //listen for the fdc3Ready event
                this.readyEventHandler = () => {
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`DesktopAgentPreloadLoader.get(): discovered DA through fdc3Ready event`);
                    if (globalThis.window.fdc3) {
                        this.prepareSelection(globalThis.window.fdc3, resolve);
                    }
                };
                globalThis.window.addEventListener('fdc3Ready', this.readyEventHandler);
                //also do polling (just in case)
                this.poll(resolve);
            }
        });
    }
    async cancel() {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug('DesktopAgentPreloadLoader: Cleaning up');
        this.done = true;
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout);
        }
        if (this.readyEventHandler) {
            globalThis.window.removeEventListener('fdc3Ready', this.readyEventHandler);
        }
        if (this.rejectFn) {
            this.rejectFn(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.AgentNotFound);
            this.rejectFn = null;
        }
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/FailoverHandler.js"
/*!***********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/strategies/FailoverHandler.js ***!
  \***********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FailoverHandler: () => (/* binding */ FailoverHandler)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _messaging_message_port_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../messaging/message-port.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/messaging/message-port.js");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/v4.js");
/* harmony import */ var _HelloHandler_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./HelloHandler.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/HelloHandler.js");
/* harmony import */ var _IdentityValidationHandler_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./IdentityValidationHandler.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/IdentityValidationHandler.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");






/** TypeGuard for a Desktop Agent */
function isDesktopAgent(da) {
    return da.getInfo !== undefined;
}
/** TypeGuard for a Window */
function isWindow(da) {
    return da.postMessage !== undefined;
}
class FailoverHandler {
    constructor(options) {
        this.options = options;
        this.connectionAttemptUuid = (0,uuid__WEBPACK_IMPORTED_MODULE_2__["default"])(); // we use a different connectionAttemptUuid to differnetiate from any (failed) messaging to a parent window
        this.helloHandler = new _HelloHandler_js__WEBPACK_IMPORTED_MODULE_3__.HelloHandler(this.options, this.connectionAttemptUuid, _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.Failover);
    }
    /** Parameters passed to getAgent */
    options;
    /** UUID used to filter messages */
    connectionAttemptUuid;
    /** Handler class for hello/handshake messages */
    helloHandler;
    /** Handler class for identity validation steps used for Desktop Agent Proxies */
    identityValidationHandler;
    /**
     * This is a variation of the PostMessageLoader used for handling failover.
     * If the failover returns a WindowProxy this is used to create a Desktop
     * Agent Proxy. If a DesktopAgent is returned directly it is passed through.
     *
     */
    async handleFailover() {
        try {
            //set-up a event listeners in case the failover returns a Window that wants to message us
            const handshakePromise = this.helloHandler.listenForHelloResponses();
            if (typeof this.options.failover === 'function') {
                const failoverResult = await this.options.failover(this.options);
                if (isDesktopAgent(failoverResult)) {
                    return await this.failoverResultIsDesktopAgent(failoverResult);
                }
                else if (isWindow(failoverResult)) {
                    return await this.failoverResultIsProxyWindow(failoverResult, handshakePromise);
                }
                else {
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.error('Failover function returned an invalid result: ', failoverResult);
                    throw _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.InvalidFailover;
                }
            }
            else {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.error('Failover was not a function, actual type: ', typeof this.options.failover);
                throw _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.InvalidFailover;
            }
        }
        finally {
            //cleanup any remaining listeners
            this.cancel();
        }
    }
    async failoverResultIsProxyWindow(failoverResult, handshakePromise) {
        this.helloHandler.sendWCP1Hello(failoverResult, '*');
        //if we received a WindowProxy from failover, and it sent us a handshake, try to validate its identity
        const connectionDetails = await handshakePromise;
        try {
            this.identityValidationHandler = new _IdentityValidationHandler_js__WEBPACK_IMPORTED_MODULE_4__.IdentityValidationHandler(connectionDetails.messagePort, this.options, this.connectionAttemptUuid);
            const idValidationPromise = this.identityValidationHandler.listenForIDValidationResponses();
            //start the message port so that we can receive responses
            connectionDetails.messagePort.start();
            this.identityValidationHandler.sendIdValidationMessage();
            const idDetails = await idValidationPromise;
            const appIdentifier = {
                appId: idDetails.payload.appId,
                instanceId: idDetails.payload.instanceId,
            };
            //prep log settings to pass on to the proxy
            const logLevel = this.options?.logLevels?.proxy ?? null;
            const desktopAgentSelection = {
                agent: await (0,_messaging_message_port_js__WEBPACK_IMPORTED_MODULE_1__.createDesktopAgentAPI)(connectionDetails, appIdentifier, logLevel),
                details: {
                    agentType: connectionDetails.agentType,
                    agentUrl: connectionDetails.agentUrl ?? undefined,
                    identityUrl: connectionDetails.options.identityUrl ?? connectionDetails.actualUrl,
                    actualUrl: connectionDetails.actualUrl,
                    appId: idDetails.payload.appId,
                    instanceId: idDetails.payload.instanceId,
                    instanceUuid: idDetails.payload.instanceUuid,
                },
            };
            return desktopAgentSelection;
        }
        catch (e) {
            //identity validation may have failed
            _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.error('Error during identity validation of Failover', e);
            throw e;
        }
    }
    async failoverResultIsDesktopAgent(failoverResult) {
        this.cancel();
        //retrieve appId and instanceId from the DA
        const implMetadata = await failoverResult.getInfo();
        const desktopAgentSelection = {
            agent: failoverResult,
            details: {
                agentType: _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.Failover,
                identityUrl: globalThis.window.location.href,
                actualUrl: globalThis.window.location.href,
                appId: implMetadata.appMetadata.appId,
                instanceId: implMetadata.appMetadata.instanceId ?? 'unknown',
                instanceUuid: implMetadata.appMetadata.instanceId ?? 'unknown', // preload DAs don't issue these so repeat the instanceId
            },
        };
        return desktopAgentSelection;
    }
    /** Removes listeners so that events are no longer processed */
    cancel() {
        this.helloHandler.cancel();
        if (this.identityValidationHandler) {
            this.identityValidationHandler.cancel();
        }
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/HelloHandler.js"
/*!********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/strategies/HelloHandler.js ***!
  \********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HelloHandler: () => (/* binding */ HelloHandler)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @finos/fdc3-schema */ "./node_modules/@finos/fdc3-schema/dist/src/index.js");
/* harmony import */ var _Timeouts_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Timeouts.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/Timeouts.js");




const { isWebConnectionProtocol2LoadURL, isWebConnectionProtocol3Handshake } = _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_2__.BrowserTypes;
class HelloHandler {
    constructor(options, connectionAttemptUuid, agentType = _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.ProxyParent) {
        this.options = options;
        this.connectionAttemptUuid = connectionAttemptUuid;
        this.agentType = agentType;
        this.helloResponseListener = null;
    }
    /** Parameters passed to getAgent */
    options;
    /** UUID used to filter messages */
    connectionAttemptUuid;
    /** The agentType to set, which may change if we're asked to load a URL into an iframe */
    agentType;
    /** If we're asked to load a URL into an iframe, it is stored here to be saved in Session Storage */
    agentUrl = null;
    /** Reference to event listener used for responses from Desktop Agents -
     *  Used to remove them when no longer needed.
     *  Initialized when
     *  - listening for hello responses
     *  - listening for identity validation responses
     * */
    helloResponseListener;
    /**
     * Starts the connection process off by sending a hello message
     */
    sendWCP1Hello(w, origin) {
        const requestMessage = {
            type: 'WCP1Hello',
            meta: {
                connectionAttemptUuid: this.connectionAttemptUuid,
                timestamp: new Date(),
            },
            payload: {
                channelSelector: this.options.channelSelector,
                fdc3Version: _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.FDC3_VERSION,
                intentResolver: this.options.intentResolver,
                identityUrl: this.options.identityUrl,
                actualUrl: globalThis.window.location.href,
            },
        };
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`HelloHandler: Sending hello msg:\n${JSON.stringify(requestMessage, null, 2)}`);
        w.postMessage(requestMessage, { targetOrigin: origin });
    }
    /**
     * Handle a request from a desktop agent that the client loads an adaptor URL
     * into an iframe instead of working with the parent window.
     */
    openFrame(url) {
        const IFRAME_ID = 'fdc3-communications-embedded-iframe';
        // remove an old one if it's there
        document.getElementById(IFRAME_ID)?.remove();
        //note the iframe URL and desktop agent type have changed
        this.agentType = _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.ProxyUrl;
        this.agentUrl = url;
        // create a new one
        const iframe = document.createElement('iframe');
        //Wait for the iframe to load... then send it a hello message
        iframe.addEventListener('load', () => {
            if (iframe.contentWindow) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug('Sending hello message to communication iframe');
                this.sendWCP1Hello(iframe.contentWindow, '*');
            }
            else {
                throw new Error(`An iframe (url: ${url}) added to support communication with a Desktop Agent does not have a contentWindow, despite firing its load event!`);
            }
        });
        iframe.setAttribute('src', url);
        iframe.setAttribute('id', IFRAME_ID);
        iframe.setAttribute('name', 'FDC3 Communications');
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = '0';
        iframe.style.position = 'fixed';
        document.body.appendChild(iframe);
    }
    /** Listen for WCP responses from 'parent' windows and frames and handle them.
     * Resolves when a response is received.
     * @returns A Promise resolving to a set of ConnectionDetails
     */
    listenForHelloResponses() {
        return new Promise(resolve => {
            // setup listener for message and retrieve JS URL from it
            this.helloResponseListener = (event) => {
                const data = event.data;
                if (data?.meta?.connectionAttemptUuid == this.connectionAttemptUuid) {
                    if (isWebConnectionProtocol2LoadURL(data)) {
                        // in this case, we need to load the URL with the embedded Iframe
                        const url = data.payload.iframeUrl;
                        this.openFrame(url);
                        //n.b event listener remains in place to receive messages from the iframe
                    }
                    else if (isWebConnectionProtocol3Handshake(data)) {
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`HelloHandler: successful handshake:`, data);
                        const connectionDetails = {
                            connectionAttemptUuid: this.connectionAttemptUuid,
                            handshake: data,
                            messagePort: event.ports[0],
                            options: this.options,
                            actualUrl: globalThis.window.location.href,
                            agentType: this.agentType,
                            agentUrl: this.agentUrl ?? undefined,
                            messageExchangeTimeout: data.payload.messageExchangeTimeout ?? _Timeouts_js__WEBPACK_IMPORTED_MODULE_3__.DEFAULT_MESSAGE_EXCHANGE_TIMEOUT_MS,
                            appLaunchTimeout: data.payload.appLaunchTimeout ?? _Timeouts_js__WEBPACK_IMPORTED_MODULE_3__.DEFAULT_APP_LAUNCH_TIMEOUT_MS,
                        };
                        resolve(connectionDetails);
                        //remove the event listener as we've received a messagePort to use
                        this.cancel();
                    }
                    else {
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`Ignoring unexpected message in HelloHandler (because its not WCP2LoadUrl or WCP3Handshake).`, data);
                    }
                }
                else {
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`HelloHandler: Ignoring message with invalid connectionAttemptUuid. Expected ${this.connectionAttemptUuid}, received: ${data?.meta?.connectionAttemptUuid}`, data);
                }
            };
            globalThis.window.addEventListener('message', this.helloResponseListener);
        });
    }
    /** Removes listeners so that events are no longer processed */
    cancel() {
        if (this.helloResponseListener) {
            globalThis.window.removeEventListener('message', this.helloResponseListener);
            this.helloResponseListener = null;
        }
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/IdentityValidationHandler.js"
/*!*********************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/strategies/IdentityValidationHandler.js ***!
  \*********************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IdentityValidationHandler: () => (/* binding */ IdentityValidationHandler)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _sessionStorage_DesktopAgentDetails_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../sessionStorage/DesktopAgentDetails.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/sessionStorage/DesktopAgentDetails.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @finos/fdc3-schema */ "./node_modules/@finos/fdc3-schema/dist/src/index.js");




const { isWebConnectionProtocol5ValidateAppIdentitySuccessResponse, isWebConnectionProtocol5ValidateAppIdentityFailedResponse, } = _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_3__.BrowserTypes;
/** Timeout allowed for id validation to occur and for the DA to respond with details.
 * This is additional to the app's specified timeout for discovery - we have already
 * found an agent at that point we are just finishing setting up the connection. */
const ID_VALIDATION_TIMEOUT = 5000;
class IdentityValidationHandler {
    constructor(mp, options, connectionAttemptUuid) {
        this.messagePort = mp;
        this.options = options;
        this.connectionAttemptUuid = connectionAttemptUuid;
        this.idValidationResponseListener = null;
    }
    /** Reference to the MessagePort received. Used to remove listeners when cancelling. */
    messagePort;
    /** Parameters passed to getAgent */
    options;
    /** UUID used to filter messages */
    connectionAttemptUuid;
    /** Event listener for ID validation response from Desktop Agents over the MessagePort.
     *  Used to remove them when no longer needed.
     * Initialized during the id validation step.
     */
    idValidationResponseListener;
    /**
     * Starts the connection process off by sending a hello message
     */
    sendIdValidationMessage() {
        const actualUrl = globalThis.window.location.href;
        const identityUrl = this.options.identityUrl ?? actualUrl;
        const requestMessage = {
            type: 'WCP4ValidateAppIdentity',
            meta: {
                connectionAttemptUuid: this.connectionAttemptUuid,
                timestamp: new Date(),
            },
            payload: {
                identityUrl,
                actualUrl,
            },
        };
        const persistedDetails = (0,_sessionStorage_DesktopAgentDetails_js__WEBPACK_IMPORTED_MODULE_1__.retrieveDesktopAgentDetails)(identityUrl);
        if (persistedDetails) {
            requestMessage.payload.instanceId = persistedDetails.instanceId;
            requestMessage.payload.instanceUuid = persistedDetails.instanceUuid;
        }
        this.messagePort.postMessage(requestMessage);
    }
    /** Listen for WCP responses over the message port to identity validation messages. */
    listenForIDValidationResponses() {
        return new Promise((resolve, reject) => {
            // setup listener for message and retrieve JS URL from it
            this.idValidationResponseListener = (event) => {
                const data = event.data;
                if (data?.meta?.connectionAttemptUuid == this.connectionAttemptUuid) {
                    if (isWebConnectionProtocol5ValidateAppIdentitySuccessResponse(data)) {
                        //passed validation
                        clearTimeout(timeout);
                        if (this.idValidationResponseListener) {
                            //remove the event listener as we've received a messagePort to use
                            this.messagePort.removeEventListener('message', this.idValidationResponseListener);
                        }
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.debug(`IdentityValidationHandler: Validated app identity, appId: ${data.payload.appId}, instanceId: ${data.payload.instanceId}`);
                        resolve(data);
                    }
                    else if (isWebConnectionProtocol5ValidateAppIdentityFailedResponse(data)) {
                        //failed validation...
                        clearTimeout(timeout);
                        if (this.idValidationResponseListener) {
                            //remove the event listener as we've received a messagePort to use
                            this.messagePort.removeEventListener('message', this.idValidationResponseListener);
                        }
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.error(`IdentityValidationHandler: App identity validation failed: ${data.payload.message ?? 'No reason given'}`);
                        reject(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.AccessDenied);
                    }
                    else {
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.debug(`IdentityValidationHandler: Ignoring message unexpected message in PostMessageLoader (because its not a WCP5 message).`, data);
                    }
                }
                else {
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.warn(`IdentityValidationHandler: Ignoring message with invalid connectionAttemptUuid. Expected ${this.connectionAttemptUuid}, received: ${data?.meta?.connectionAttemptUuid}`, data);
                }
            };
            //listening on a message port
            this.messagePort.addEventListener('message', this.idValidationResponseListener);
            //timeout for id validation only
            const timeout = setTimeout(() => {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.warn(`IdentityValidationHandler: Identity validation timed out`);
                if (this.idValidationResponseListener) {
                    //remove the event listener as we won't proceed further
                    this.messagePort.removeEventListener('message', this.idValidationResponseListener);
                }
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.error(`The Desktop Agent didn't respond to ID validation within ${ID_VALIDATION_TIMEOUT / 1000} seconds`);
                reject(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.ErrorOnConnect);
            }, ID_VALIDATION_TIMEOUT);
        });
    }
    cancel() {
        if (this.idValidationResponseListener) {
            this.messagePort.removeEventListener('message', this.idValidationResponseListener);
        }
        //TODO: cancel any timeouts and reject any returned promises
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/PostMessageLoader.js"
/*!*************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/strategies/PostMessageLoader.js ***!
  \*************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PostMessageLoader: () => (/* binding */ PostMessageLoader)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _messaging_message_port_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../messaging/message-port.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/messaging/message-port.js");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/v4.js");
/* harmony import */ var _HelloHandler_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./HelloHandler.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/HelloHandler.js");
/* harmony import */ var _IdentityValidationHandler_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./IdentityValidationHandler.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/IdentityValidationHandler.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _Timeouts_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./Timeouts.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/Timeouts.js");







/**
 * Recursive search for all possible parent frames (windows) that we may
 * target with the WCP.
 * @param startWindow window object to search
 * @param found window objects found so far
 */
function collectPossibleTargets(startWindow, found) {
    _recursePossibleTargets(startWindow, startWindow, found);
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`Possible parent windows/frames found: ${found.length}`);
}
function _recursePossibleTargets(startWindow, w, found) {
    if (w) {
        if (found.indexOf(w) == -1 && w != startWindow) {
            found.push(w);
        }
        if (w.opener) {
            _recursePossibleTargets(startWindow, w.opener, found);
        }
        if (w.parent != w) {
            _recursePossibleTargets(startWindow, w.parent, found);
        }
    }
}
/** Loader for Desktop Agent Proxy implementations. Attempts to
 *  connect to parent windows or frames via teh Web Connection Protocol,
 *  which may include setting up an iframe to load an adaptor URL.
 *  A previously persisted adaptor URL may be passed to skip the
 *  discovery of parent windows and to move straight to loading that.
 */
class PostMessageLoader {
    name = 'PostMessageLoader';
    proxyLogLevel;
    constructor(options, previousUrl) {
        //prep log settings to pass on to the proxy
        this.proxyLogLevel = options.logLevels?.proxy ?? null;
        this.previousUrl = previousUrl ?? null;
    }
    previousUrl;
    connectionAttemptUuid = (0,uuid__WEBPACK_IMPORTED_MODULE_2__["default"])();
    helloHandler;
    identityValidationHandler;
    /** Initial timeout (released once a MessagePort is received - additional steps are outside timeout) */
    timeout = null;
    /** Reference to the get fn's Promise's reject call - used when cancelling. */
    rejectFn = null;
    get(options) {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`PostMessageLoader.get(): Initiating search for Desktop Agent Proxy`);
        return new Promise((resolve, reject) => {
            //save reject fn in case we get cancelled
            this.rejectFn = reject;
            //setup a timeout so we can reject if it runs out
            const timeoutMs = options.timeoutMs ?? _Timeouts_js__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_GETAGENT_TIMEOUT_MS;
            this.timeout = setTimeout(() => {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`PostMessageLoader.get(): timeout (${timeoutMs} ms) at ${new Date().toISOString()}`);
                this.cancel();
                reject(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.AgentNotFound);
            }, timeoutMs);
            this.helloHandler = new _HelloHandler_js__WEBPACK_IMPORTED_MODULE_3__.HelloHandler(options, this.connectionAttemptUuid);
            // ok, begin the process
            const handshakePromise = this.helloHandler.listenForHelloResponses();
            if (this.previousUrl) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`PostMessageLoader.get(): Loading previously used adaptor URL: ${this.previousUrl}`);
                //skip looking for target parent windows and open an iframe immediately
                this.helloHandler.openFrame(this.previousUrl);
            }
            else {
                //collect target parent window references
                const targets = [];
                collectPossibleTargets(globalThis.window, targets);
                // use of origin '*': See https://github.com/finos/FDC3/issues/1316
                for (let t = 0; t < targets.length; t++) {
                    this.helloHandler.sendWCP1Hello(targets[t], '*');
                }
            }
            // wait for one of the windows to respond
            //  This may involve a WCP2LoadUrl response being received
            //  and an adaptor iframe setup to load it, resolves on
            //  WCP3Handshake response.
            // If no WCP3Handshake is ever received this will not resolve
            handshakePromise.then(connectionDetails => {
                //prevent us being cancelled
                this.rejectFn = null;
                //cancel the initial timeout as we got a handshake response
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }
                //perform id validation
                this.identityValidationHandler = new _IdentityValidationHandler_js__WEBPACK_IMPORTED_MODULE_4__.IdentityValidationHandler(connectionDetails.messagePort, options, this.connectionAttemptUuid);
                const idValidationPromise = this.identityValidationHandler.listenForIDValidationResponses();
                //start the message port so that we can receive responses
                connectionDetails.messagePort.start();
                this.identityValidationHandler.sendIdValidationMessage();
                idValidationPromise
                    .then(idDetails => {
                    //resolve
                    const appIdentifier = {
                        appId: idDetails.payload.appId,
                        instanceId: idDetails.payload.instanceId,
                    };
                    (0,_messaging_message_port_js__WEBPACK_IMPORTED_MODULE_1__.createDesktopAgentAPI)(connectionDetails, appIdentifier, this.proxyLogLevel).then(da => {
                        const desktopAgentSelection = {
                            agent: da,
                            details: {
                                agentType: connectionDetails.agentType,
                                agentUrl: connectionDetails.agentUrl ?? undefined,
                                identityUrl: connectionDetails.options.identityUrl ?? connectionDetails.actualUrl,
                                actualUrl: connectionDetails.actualUrl,
                                appId: idDetails.payload.appId,
                                instanceId: idDetails.payload.instanceId,
                                instanceUuid: idDetails.payload.instanceUuid,
                            },
                        };
                        //clean up
                        this.cancel();
                        resolve(desktopAgentSelection);
                    });
                })
                    .catch(e => {
                    //id validation may have failed
                    reject(e);
                });
            });
        });
    }
    async cancel() {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug('PostMessageLoader: Cleaning up');
        //if we're being cancelled while still running, reject the promise
        if (this.rejectFn) {
            this.rejectFn(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.AgentNotFound);
            this.rejectFn = null;
        }
        //cancel the timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        //remove any event listeners to end processing
        if (this.helloHandler) {
            this.helloHandler.cancel();
        }
        if (this.identityValidationHandler) {
            this.identityValidationHandler.cancel();
        }
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/Timeouts.js"
/*!****************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/strategies/Timeouts.js ***!
  \****************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_APP_LAUNCH_TIMEOUT_MS: () => (/* binding */ DEFAULT_APP_LAUNCH_TIMEOUT_MS),
/* harmony export */   DEFAULT_GETAGENT_TIMEOUT_MS: () => (/* binding */ DEFAULT_GETAGENT_TIMEOUT_MS),
/* harmony export */   DEFAULT_MESSAGE_EXCHANGE_TIMEOUT_MS: () => (/* binding */ DEFAULT_MESSAGE_EXCHANGE_TIMEOUT_MS)
/* harmony export */ });
/**
 * The default timeout used by getAgent when discovering Desktop Agents.
 */
const DEFAULT_GETAGENT_TIMEOUT_MS = 1000;
/** Default timeout used by a DesktopAgentProxy for all message exchanges
 * with a DesktopAgent, except those that involve the launch of an application.
 * May be overridden by a DesktopAgent by passing a value in the
 * payload.messageExchangeTimeout of a WCP3Handshake message.
 */
const DEFAULT_MESSAGE_EXCHANGE_TIMEOUT_MS = 10000;
/** Default timeout used by a DesktopAgentProxy for message exchanges with a
 * DesktopAgent that involve launching applications. May be overridden by a
 * DesktopAgent by passing a value in the payload.appLaunchTimeout of a
 * WCP3Handshake message.
 * */
const DEFAULT_APP_LAUNCH_TIMEOUT_MS = 100000;


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/getAgent.js"
/*!****************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/strategies/getAgent.js ***!
  \****************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearAgentPromise: () => (/* binding */ clearAgentPromise),
/* harmony export */   getAgent: () => (/* binding */ getAgent)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _DesktopAgentPreloadLoader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./DesktopAgentPreloadLoader.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/DesktopAgentPreloadLoader.js");
/* harmony import */ var _PostMessageLoader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./PostMessageLoader.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/PostMessageLoader.js");
/* harmony import */ var _sessionStorage_DesktopAgentDetails_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../sessionStorage/DesktopAgentDetails.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/sessionStorage/DesktopAgentDetails.js");
/* harmony import */ var _FailoverHandler_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./FailoverHandler.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/FailoverHandler.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _Timeouts_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./Timeouts.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/strategies/Timeouts.js");







// TypeGuards used to examine results of Loaders
const isRejected = (input) => input.status === 'rejected';
const isFulfilled = (input) => input.status === 'fulfilled';
/**
 * For now, we only allow a single call to getAgent per application, so
 * we keep track of the promise we use here.
 */
let theAgentPromise = null;
const CLEAR_PROMISE_DELAY = 500;
function clearAgentPromise() {
    theAgentPromise = null;
}
function initAgentPromise(options) {
    if (options?.logLevels?.connection) {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.setLogLevel(options.logLevels.connection);
    }
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.log(`Initiating Desktop Agent discovery at ${new Date().toISOString()}`);
    let strategies;
    //if options doesn't contain an identityURL, use the actualUrl
    if (!options.identityUrl) {
        options.identityUrl = globalThis.window.location.href;
    }
    //Retrieve persisted connection data limit to a previous strategy if one exists
    const persistedData = (0,_sessionStorage_DesktopAgentDetails_js__WEBPACK_IMPORTED_MODULE_3__.retrieveDesktopAgentDetails)(options.identityUrl);
    if (persistedData) {
        switch (persistedData.agentType) {
            case _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.Preload:
                strategies = [new _DesktopAgentPreloadLoader_js__WEBPACK_IMPORTED_MODULE_1__.DesktopAgentPreloadLoader()];
                break;
            case _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.ProxyUrl:
                //agentUrl will only be used by PostMessageLoader if not falsey
                strategies = [new _PostMessageLoader_js__WEBPACK_IMPORTED_MODULE_2__.PostMessageLoader(options, persistedData.agentUrl)];
                break;
            case _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.ProxyParent:
                strategies = [new _PostMessageLoader_js__WEBPACK_IMPORTED_MODULE_2__.PostMessageLoader(options)];
                break;
            case _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.Failover:
                strategies = [];
                break;
            default:
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.warn('Unexpected agentType value in SessionStorage, ignoring. Stored data:', persistedData);
                strategies = [new _DesktopAgentPreloadLoader_js__WEBPACK_IMPORTED_MODULE_1__.DesktopAgentPreloadLoader(), new _PostMessageLoader_js__WEBPACK_IMPORTED_MODULE_2__.PostMessageLoader(options)];
        }
    }
    else {
        strategies = [new _DesktopAgentPreloadLoader_js__WEBPACK_IMPORTED_MODULE_1__.DesktopAgentPreloadLoader(), new _PostMessageLoader_js__WEBPACK_IMPORTED_MODULE_2__.PostMessageLoader(options)];
    }
    const promises = strategies.map(s => s.get(options).then(async (selection) => {
        //cancel other strategies if we selected a DA
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`Strategy ${s.name} resolved - cleaning up other strategies`);
        for (let s2 = 0; s2 < strategies.length; s2++) {
            if (strategies[s2] !== s) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`  cleaning up ${strategies[s2].name}`);
                await strategies[s2].cancel();
            }
        }
        strategies.forEach(async (s2) => {
            if (s2 !== s) {
                await s2.cancel();
            }
        });
        return selection;
    }));
    _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug('Waiting for discovery promises to settle...');
    return Promise.allSettled(promises).then(async (results) => {
        //review results
        const daResult = results.find(isFulfilled);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const replacer = (key, value) => {
            if (key == 'value') {
                return '<DesktopAgent>';
            }
            else {
                return value;
            }
        };
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`Discovery results:  ${JSON.stringify(results, replacer, 2)}`);
        if (daResult) {
            const selection = daResult.value;
            const desktopAgentDetails = {
                agentType: selection.details.agentType,
                identityUrl: selection.details.identityUrl,
                actualUrl: selection.details.actualUrl,
                agentUrl: selection.details.agentUrl ?? undefined,
                appId: selection.details.appId,
                instanceId: selection.details.instanceId,
                instanceUuid: selection.details.instanceUuid,
            };
            (0,_sessionStorage_DesktopAgentDetails_js__WEBPACK_IMPORTED_MODULE_3__.storeDesktopAgentDetails)(desktopAgentDetails);
            _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.log(`Desktop Agent located via discovery, appId: ${desktopAgentDetails.appId}, instanceId: ${desktopAgentDetails.instanceId}`);
            return selection.agent;
        }
        else {
            //if we received any error other than AgentError.AgentNotFound, throw it
            const errors = results.filter(isRejected);
            //n.b. the Loaders throw string error messages, rather than Error objects
            const error = errors.find(aRejection => aRejection.reason !== _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.AgentNotFound);
            if (error) {
                //Clear the promise so a fresh call could be made later
                setTimeout(() => clearAgentPromise(), CLEAR_PROMISE_DELAY);
                throw new Error(error.reason);
            }
            else if (options.failover != undefined) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.debug(`Calling failover fn...`);
                //Proceed with the failover
                try {
                    //TODO: consider adding a timeout for the failover, to avoid getting stuck here
                    //  However there is an argument to be made for hanging out in case the
                    //  function eventually returns, e.g. after an external DA started up
                    const failoverHandler = new _FailoverHandler_js__WEBPACK_IMPORTED_MODULE_4__.FailoverHandler(options);
                    const selection = await failoverHandler.handleFailover();
                    //store details of the connection in SessionStorage
                    const desktopAgentDetails = {
                        agentType: _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.WebDesktopAgentType.Failover,
                        identityUrl: selection.details.identityUrl,
                        actualUrl: selection.details.actualUrl,
                        agentUrl: selection.details.agentUrl ?? undefined,
                        appId: selection.details.appId,
                        instanceId: selection.details.instanceId,
                        instanceUuid: selection.details.instanceUuid,
                    };
                    (0,_sessionStorage_DesktopAgentDetails_js__WEBPACK_IMPORTED_MODULE_3__.storeDesktopAgentDetails)(desktopAgentDetails);
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.log(`Desktop Agent located via failover, appId: ${desktopAgentDetails.appId}, instanceId: ${desktopAgentDetails.instanceId}`);
                    return selection.agent;
                }
                catch (e) {
                    //n.b. FailoverHandler throws Error Objects so we can return this directly
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.error('Desktop agent not found. Error reported during failover: ', e);
                    throw new Error(e);
                }
            }
            else {
                //We didn't manage to find an agent.
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_5__.Logger.error('Desktop agent not found. No error reported during discovery.');
                //Clear the promise so a fresh call could be made later
                setTimeout(() => clearAgentPromise(), CLEAR_PROMISE_DELAY);
                throw new Error(_finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.AgentError.AgentNotFound);
            }
        }
    });
}
/**
 * Function used to retrieve an FDC3 Desktop Agent API instance, which
 * supports the discovery of a Desktop Agent Preload (a container-injected
 * API implementation) or a Desktop Agent Proxy (a Browser-based Desktop Agent
 * running in another window or frame). Finally, if no Desktop Agent is found,
 * a failover function may be supplied by an app allowing it to start or otherwise
 * connect to a Desktop Agent (e.g. by loading a proprietary adaptor that
 * returns a `DesktopAgent` implementation or by creating a window or iframe of
 * its own that will provide a Desktop Agent Proxy.
 *
 * @param {GetAgentParams} params Optional parameters object, which
 * may include a URL to use for the app's identity, other settings
 * that affect the behavior of the getAgent() function and a `failover`
 * function that should be run if a Desktop Agent is not detected.
 *
 * @returns A promise that resolves to a DesktopAgent implementation or
 * rejects with an error message from the `AgentError` enumeration if unable to
 * return a Desktop Agent implementation.
 *
 * @example
 * const fdc3 = await getAgent();
 *
 * // OR
 *
 * getAgent({
 *     identityUrl: "https://example.com/path?param=appName#example",
 *     channelSelector: false,
 *     intentResolver: false
 * }).then((fdc3) => {
 *     //do FDC3 stuff here
 * };
 */
const getAgent = (params) => {
    const DEFAULT_OPTIONS = {
        dontSetWindowFdc3: false,
        channelSelector: true,
        intentResolver: true,
        timeoutMs: _Timeouts_js__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_GETAGENT_TIMEOUT_MS,
        //default log levels are set in the relevant logging utils
    };
    const options = {
        ...DEFAULT_OPTIONS,
        ...params,
    };
    async function handleSetWindowFdc3(da) {
        if (!options.dontSetWindowFdc3 && !globalThis.window.fdc3) {
            globalThis.window.fdc3 = da;
            globalThis.window.dispatchEvent(new Event('fdc3Ready'));
        }
        return da;
    }
    if (!theAgentPromise) {
        theAgentPromise = initAgentPromise(options).then(handleSetWindowFdc3);
    }
    return theAgentPromise;
};


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/AbstractUIComponent.js"
/*!*******************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/ui/AbstractUIComponent.js ***!
  \*******************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ALLOWED_CSS_ELEMENTS: () => (/* binding */ ALLOWED_CSS_ELEMENTS),
/* harmony export */   AbstractUIComponent: () => (/* binding */ AbstractUIComponent),
/* harmony export */   DEFAULT_UI_ROOT_URL: () => (/* binding */ DEFAULT_UI_ROOT_URL),
/* harmony export */   INITIAL_CONTAINER_CSS: () => (/* binding */ INITIAL_CONTAINER_CSS)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @finos/fdc3-schema */ "./node_modules/@finos/fdc3-schema/dist/src/index.js");



const { isFdc3UserInterfaceHello, isFdc3UserInterfaceRestyle } = _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_2__.BrowserTypes;
const INITIAL_CONTAINER_CSS = {
    width: '0',
    height: '0',
    position: 'fixed',
};
const ALLOWED_CSS_ELEMENTS = [
    'width',
    'height',
    'position',
    'zIndex',
    'left',
    'right',
    'top',
    'bottom',
    'transition',
    'maxHeight',
    'maxWidth',
    'display',
];
const DEFAULT_UI_ROOT_URL = 'https://fdc3.finos.org/toolbox/fdc3-reference-ui/';
/** Abstract implementation of an injected UI, used as the base for communication
 * with injected Channel Selector and Intent Resolver UIs.
 */
class AbstractUIComponent {
    container = undefined;
    iframe = undefined;
    url;
    name;
    port = null;
    messagePortIsReady;
    markMessagePortReady = null;
    constructor(url, name) {
        this.url = url;
        this.name = name;
        this.messagePortIsReady = new Promise(resolve => (this.markMessagePortReady = resolve));
    }
    /**
     * Connect the UI component by creating the UI iframe, then wait on
     * a Fdc3UserInterfaceHello message.
     *
     * This function is NOT properly async as we don't want to block the
     * Desktop Agent connection on the UI frames as they may be blocked by
     * security policies. I.e. awaiting this will not block.
     */
    connect() {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`AbstractUIComponent (${this.name}): Awaiting hello from `, this.name, ', url: ', this.url);
        const portPromise = this.awaitHello();
        this.openFrame();
        portPromise.then(port => {
            this.port = port;
            this.setupMessagePort(port).then(() => {
                this.messagePortReady(port);
            });
        });
        return Promise.resolve();
    }
    async disconnect() {
        this.port?.close();
    }
    /**
     * Override and extend this method to provide functionality specific to the UI in question
     */
    async setupMessagePort(port) {
        port.addEventListener('message', e => {
            const data = e.data;
            if (isFdc3UserInterfaceRestyle(data)) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`AbstractUIComponent (${this.name}): Restyling: `, data.payload);
                const css = data.payload.updatedCSS;
                this.themeContainer(css);
            }
        });
        port.start();
    }
    async messagePortReady(port) {
        // tells the iframe it can start posting
        const message = {
            type: 'Fdc3UserInterfaceHandshake',
            payload: {
                fdc3Version: _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_0__.FDC3_VERSION,
            },
        };
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`AbstractUIComponent (${this.name}): Sending handshake: `, message);
        port.postMessage(message);
        this.markMessagePortReady();
    }
    awaitHello() {
        return new Promise(resolve => {
            const ml = (e) => {
                //only respond to messages from this UI's iframe
                if (e.source == this.iframe?.contentWindow) {
                    if (isFdc3UserInterfaceHello(e.data)) {
                        const helloData = e.data;
                        this.themeContainer(helloData.payload.initialCSS);
                        const port = e.ports[0];
                        globalThis.window.removeEventListener('message', ml);
                        resolve(port);
                    }
                    else {
                        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`AbstractUIComponent (${this.name}): ignored UI Message from UI iframe while awaiting hello: `, e.data);
                    }
                }
                else {
                    //as there are two UIs, we expect some cross-over between their messages
                    _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`AbstractUIComponent (${this.name}): ignored Message that didn't come from expected UI frame: `, e.data, 'my URL: ', this.url);
                }
            };
            globalThis.window.addEventListener('message', ml);
        });
    }
    openFrame() {
        this.container = globalThis.document.createElement('div');
        this.iframe = globalThis.document.createElement('iframe');
        this.themeContainer(INITIAL_CONTAINER_CSS);
        this.themeFrame(this.iframe);
        this.iframe.setAttribute('src', this.url);
        this.iframe.setAttribute('name', this.name);
        this.container.appendChild(this.iframe);
        document.body.appendChild(this.container);
    }
    toKebabCase(str) {
        return str.replace(/[A-Z]/g, match => '-' + match.toLowerCase());
    }
    themeContainer(css) {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`AbstractUIComponent (${this.name}): Applying styles to container`, css);
        for (let i = 0; i < ALLOWED_CSS_ELEMENTS.length; i++) {
            const k = ALLOWED_CSS_ELEMENTS[i];
            const value = css[k];
            if (value != null) {
                this.container.style.setProperty(this.toKebabCase(k), value);
            }
            else {
                this.container.style.removeProperty(this.toKebabCase(k));
            }
        }
    }
    themeFrame(ifrm) {
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`AbstractUIComponent (${this.name}): Applying 100% size style to iframe`);
        ifrm.style.width = '100%';
        ifrm.style.height = '100%';
        ifrm.style.border = '0';
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentChannelSelector.js"
/*!**********************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentChannelSelector.js ***!
  \**********************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultDesktopAgentChannelSelector: () => (/* binding */ DefaultDesktopAgentChannelSelector)
/* harmony export */ });
/* harmony import */ var _AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AbstractUIComponent.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/AbstractUIComponent.js");
/* harmony import */ var _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @finos/fdc3-schema */ "./node_modules/@finos/fdc3-schema/dist/src/index.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");



const { isFdc3UserInterfaceChannelSelected } = _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_1__.BrowserTypes;
/**
 * Handles communication between an injected Channel Selector UI and the getAgent implementation.
 */
class DefaultDesktopAgentChannelSelector extends _AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_0__.AbstractUIComponent {
    callback = null;
    constructor(url) {
        //TODO: check default UI URL is correct on release
        super(url ?? _AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_UI_ROOT_URL + 'channel_selector.html', 'FDC3 Channel Selector');
    }
    async setupMessagePort(port) {
        this.port = port;
        port.addEventListener('message', e => {
            if (isFdc3UserInterfaceChannelSelected(e.data)) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.debug(`DefaultDesktopAgentChannelSelector: Received channel selection message: `, e.data);
                const choice = e.data;
                if (this.callback) {
                    this.callback(choice.payload.selected);
                }
            }
        });
        //This starts the port so do it last
        await super.setupMessagePort(port);
    }
    async updateChannel(channelId, availableChannels) {
        const message = {
            type: 'Fdc3UserInterfaceChannels',
            payload: {
                selected: channelId,
                userChannels: availableChannels.map(ch => {
                    return {
                        id: ch.id,
                        type: 'user',
                        displayMetadata: ch.displayMetadata,
                    };
                }),
            },
        };
        //don't post until the messageport is ready
        await this.messagePortIsReady;
        this.port?.postMessage(message);
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_2__.Logger.debug(`DefaultDesktopAgentChannelSelector: Sent channels data to channel selector: `, message);
    }
    setChannelChangeCallback(callback) {
        this.callback = callback;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentIntentResolver.js"
/*!*********************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/ui/DefaultDesktopAgentIntentResolver.js ***!
  \*********************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultDesktopAgentIntentResolver: () => (/* binding */ DefaultDesktopAgentIntentResolver)
/* harmony export */ });
/* harmony import */ var _AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AbstractUIComponent.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/AbstractUIComponent.js");
/* harmony import */ var _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/Logger.js */ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js");
/* harmony import */ var _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @finos/fdc3-schema */ "./node_modules/@finos/fdc3-schema/dist/src/index.js");



const { isFdc3UserInterfaceResolveAction } = _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_2__.BrowserTypes;
/**
 * Handles communication between an injected Intent Resolver UI and the getAgent implementation.
 */
class DefaultDesktopAgentIntentResolver extends _AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_0__.AbstractUIComponent {
    pendingResolve = null;
    constructor(url) {
        //TODO: check default UI URL is correct on release
        super(url ?? _AbstractUIComponent_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_UI_ROOT_URL + 'intent_resolver.html', 'FDC3 Intent Resolver');
    }
    async setupMessagePort(port) {
        this.port = port;
        this.port.addEventListener('message', e => {
            if (isFdc3UserInterfaceResolveAction(e.data)) {
                _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug('DefaultDesktopAgentIntentResolver: Received resolveAction message: ', e.data);
                const choice = e.data;
                if (choice.payload.action == 'click' && this.pendingResolve) {
                    this.pendingResolve({
                        appId: choice.payload.appIdentifier,
                        intent: choice.payload.intent,
                    });
                }
                else if (choice.payload.action == 'cancel' && this.pendingResolve) {
                    this.pendingResolve();
                }
                this.pendingResolve = null;
            }
        });
        //This starts the port so do it last
        await super.setupMessagePort(port);
    }
    async chooseIntent(appIntents, context) {
        const out = new Promise(resolve => {
            this.pendingResolve = resolve;
        });
        const message = {
            type: 'Fdc3UserInterfaceResolve',
            payload: {
                appIntents,
                context,
            },
        };
        this.port?.postMessage(message);
        _util_Logger_js__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`DefaultDesktopAgentIntentResolver: Requested resolution: `, message);
        return out;
    }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullChannelSelector.js"
/*!*******************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullChannelSelector.js ***!
  \*******************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NullChannelSelector: () => (/* binding */ NullChannelSelector)
/* harmony export */ });
/** Implementation used when an injected Channel selector is not in use. */
class NullChannelSelector {
    async disconnect() { }
    async connect() { }
    async updateChannel() { }
    setChannelChangeCallback() { }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullIntentResolver.js"
/*!******************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/ui/NullIntentResolver.js ***!
  \******************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NullIntentResolver: () => (/* binding */ NullIntentResolver)
/* harmony export */ });
/** Implementation used when an injected IntentResolver is not in use. */
class NullIntentResolver {
    async disconnect() { }
    async connect() { }
    async chooseIntent() { }
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js"
/*!********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/util/Logger.js ***!
  \********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Logger: () => (/* binding */ Logger)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-agent-proxy */ "./node_modules/@finos/fdc3-agent-proxy/dist/src/index.js");
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");


/**
 * Logging utility used by getAgent when connecting to Desktop Agents,
 * which defaults to printing INFO, WARN and ERROR level messages.
 */
class Logger extends _finos_fdc3_agent_proxy__WEBPACK_IMPORTED_MODULE_0__.AbstractFDC3Logger {
    static get prefix() {
        return 'FDC3 getAgent: ';
    }
    //set default log level - will not be picked up in test scope so ignored
    /* istanbul ignore next */
    logLevel = _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_1__.LogLevel.INFO;
}


/***/ },

/***/ "./node_modules/@finos/fdc3-get-agent/dist/src/util/Uuid.js"
/*!******************************************************************!*\
  !*** ./node_modules/@finos/fdc3-get-agent/dist/src/util/Uuid.js ***!
  \******************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createUUID: () => (/* binding */ createUUID)
/* harmony export */ });
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/v4.js");

function createUUID() {
    return (0,uuid__WEBPACK_IMPORTED_MODULE_0__["default"])();
}


/***/ },

/***/ "./node_modules/@finos/fdc3-schema/dist/generated/api/BrowserTypes.js"
/*!****************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-schema/dist/generated/api/BrowserTypes.js ***!
  \****************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ADD_CONTEXT_LISTENER_REQUEST_TYPE: () => (/* binding */ ADD_CONTEXT_LISTENER_REQUEST_TYPE),
/* harmony export */   ADD_CONTEXT_LISTENER_RESPONSE_TYPE: () => (/* binding */ ADD_CONTEXT_LISTENER_RESPONSE_TYPE),
/* harmony export */   ADD_EVENT_LISTENER_REQUEST_TYPE: () => (/* binding */ ADD_EVENT_LISTENER_REQUEST_TYPE),
/* harmony export */   ADD_EVENT_LISTENER_RESPONSE_TYPE: () => (/* binding */ ADD_EVENT_LISTENER_RESPONSE_TYPE),
/* harmony export */   ADD_INTENT_LISTENER_REQUEST_TYPE: () => (/* binding */ ADD_INTENT_LISTENER_REQUEST_TYPE),
/* harmony export */   ADD_INTENT_LISTENER_RESPONSE_TYPE: () => (/* binding */ ADD_INTENT_LISTENER_RESPONSE_TYPE),
/* harmony export */   BROADCAST_EVENT_TYPE: () => (/* binding */ BROADCAST_EVENT_TYPE),
/* harmony export */   BROADCAST_REQUEST_TYPE: () => (/* binding */ BROADCAST_REQUEST_TYPE),
/* harmony export */   BROADCAST_RESPONSE_TYPE: () => (/* binding */ BROADCAST_RESPONSE_TYPE),
/* harmony export */   CHANNEL_CHANGED_EVENT_TYPE: () => (/* binding */ CHANNEL_CHANGED_EVENT_TYPE),
/* harmony export */   CONTEXT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE: () => (/* binding */ CONTEXT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE),
/* harmony export */   CONTEXT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE: () => (/* binding */ CONTEXT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE),
/* harmony export */   CREATE_PRIVATE_CHANNEL_REQUEST_TYPE: () => (/* binding */ CREATE_PRIVATE_CHANNEL_REQUEST_TYPE),
/* harmony export */   CREATE_PRIVATE_CHANNEL_RESPONSE_TYPE: () => (/* binding */ CREATE_PRIVATE_CHANNEL_RESPONSE_TYPE),
/* harmony export */   Convert: () => (/* binding */ Convert),
/* harmony export */   EVENT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE: () => (/* binding */ EVENT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE),
/* harmony export */   EVENT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE: () => (/* binding */ EVENT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_CHANNELS_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_CHANNELS_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_CHANNEL_SELECTED_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_CHANNEL_SELECTED_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_DRAG_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_DRAG_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_HANDSHAKE_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_HANDSHAKE_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_HELLO_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_HELLO_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_MESSAGE_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_MESSAGE_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_RESOLVE_ACTION_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_RESOLVE_ACTION_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_RESOLVE_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_RESOLVE_TYPE),
/* harmony export */   FDC3_USER_INTERFACE_RESTYLE_TYPE: () => (/* binding */ FDC3_USER_INTERFACE_RESTYLE_TYPE),
/* harmony export */   FIND_INSTANCES_REQUEST_TYPE: () => (/* binding */ FIND_INSTANCES_REQUEST_TYPE),
/* harmony export */   FIND_INSTANCES_RESPONSE_TYPE: () => (/* binding */ FIND_INSTANCES_RESPONSE_TYPE),
/* harmony export */   FIND_INTENTS_BY_CONTEXT_REQUEST_TYPE: () => (/* binding */ FIND_INTENTS_BY_CONTEXT_REQUEST_TYPE),
/* harmony export */   FIND_INTENTS_BY_CONTEXT_RESPONSE_TYPE: () => (/* binding */ FIND_INTENTS_BY_CONTEXT_RESPONSE_TYPE),
/* harmony export */   FIND_INTENT_REQUEST_TYPE: () => (/* binding */ FIND_INTENT_REQUEST_TYPE),
/* harmony export */   FIND_INTENT_RESPONSE_TYPE: () => (/* binding */ FIND_INTENT_RESPONSE_TYPE),
/* harmony export */   GET_APP_METADATA_REQUEST_TYPE: () => (/* binding */ GET_APP_METADATA_REQUEST_TYPE),
/* harmony export */   GET_APP_METADATA_RESPONSE_TYPE: () => (/* binding */ GET_APP_METADATA_RESPONSE_TYPE),
/* harmony export */   GET_CURRENT_CHANNEL_REQUEST_TYPE: () => (/* binding */ GET_CURRENT_CHANNEL_REQUEST_TYPE),
/* harmony export */   GET_CURRENT_CHANNEL_RESPONSE_TYPE: () => (/* binding */ GET_CURRENT_CHANNEL_RESPONSE_TYPE),
/* harmony export */   GET_CURRENT_CONTEXT_REQUEST_TYPE: () => (/* binding */ GET_CURRENT_CONTEXT_REQUEST_TYPE),
/* harmony export */   GET_CURRENT_CONTEXT_RESPONSE_TYPE: () => (/* binding */ GET_CURRENT_CONTEXT_RESPONSE_TYPE),
/* harmony export */   GET_INFO_REQUEST_TYPE: () => (/* binding */ GET_INFO_REQUEST_TYPE),
/* harmony export */   GET_INFO_RESPONSE_TYPE: () => (/* binding */ GET_INFO_RESPONSE_TYPE),
/* harmony export */   GET_OR_CREATE_CHANNEL_REQUEST_TYPE: () => (/* binding */ GET_OR_CREATE_CHANNEL_REQUEST_TYPE),
/* harmony export */   GET_OR_CREATE_CHANNEL_RESPONSE_TYPE: () => (/* binding */ GET_OR_CREATE_CHANNEL_RESPONSE_TYPE),
/* harmony export */   GET_USER_CHANNELS_REQUEST_TYPE: () => (/* binding */ GET_USER_CHANNELS_REQUEST_TYPE),
/* harmony export */   GET_USER_CHANNELS_RESPONSE_TYPE: () => (/* binding */ GET_USER_CHANNELS_RESPONSE_TYPE),
/* harmony export */   HEARTBEAT_ACKNOWLEDGEMENT_REQUEST_TYPE: () => (/* binding */ HEARTBEAT_ACKNOWLEDGEMENT_REQUEST_TYPE),
/* harmony export */   HEARTBEAT_EVENT_TYPE: () => (/* binding */ HEARTBEAT_EVENT_TYPE),
/* harmony export */   INTENT_EVENT_TYPE: () => (/* binding */ INTENT_EVENT_TYPE),
/* harmony export */   INTENT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE: () => (/* binding */ INTENT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE),
/* harmony export */   INTENT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE: () => (/* binding */ INTENT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE),
/* harmony export */   INTENT_RESULT_REQUEST_TYPE: () => (/* binding */ INTENT_RESULT_REQUEST_TYPE),
/* harmony export */   INTENT_RESULT_RESPONSE_TYPE: () => (/* binding */ INTENT_RESULT_RESPONSE_TYPE),
/* harmony export */   JOIN_USER_CHANNEL_REQUEST_TYPE: () => (/* binding */ JOIN_USER_CHANNEL_REQUEST_TYPE),
/* harmony export */   JOIN_USER_CHANNEL_RESPONSE_TYPE: () => (/* binding */ JOIN_USER_CHANNEL_RESPONSE_TYPE),
/* harmony export */   LEAVE_CURRENT_CHANNEL_REQUEST_TYPE: () => (/* binding */ LEAVE_CURRENT_CHANNEL_REQUEST_TYPE),
/* harmony export */   LEAVE_CURRENT_CHANNEL_RESPONSE_TYPE: () => (/* binding */ LEAVE_CURRENT_CHANNEL_RESPONSE_TYPE),
/* harmony export */   OPEN_REQUEST_TYPE: () => (/* binding */ OPEN_REQUEST_TYPE),
/* harmony export */   OPEN_RESPONSE_TYPE: () => (/* binding */ OPEN_RESPONSE_TYPE),
/* harmony export */   PRIVATE_CHANNEL_ADD_EVENT_LISTENER_REQUEST_TYPE: () => (/* binding */ PRIVATE_CHANNEL_ADD_EVENT_LISTENER_REQUEST_TYPE),
/* harmony export */   PRIVATE_CHANNEL_ADD_EVENT_LISTENER_RESPONSE_TYPE: () => (/* binding */ PRIVATE_CHANNEL_ADD_EVENT_LISTENER_RESPONSE_TYPE),
/* harmony export */   PRIVATE_CHANNEL_DISCONNECT_REQUEST_TYPE: () => (/* binding */ PRIVATE_CHANNEL_DISCONNECT_REQUEST_TYPE),
/* harmony export */   PRIVATE_CHANNEL_DISCONNECT_RESPONSE_TYPE: () => (/* binding */ PRIVATE_CHANNEL_DISCONNECT_RESPONSE_TYPE),
/* harmony export */   PRIVATE_CHANNEL_ON_ADD_CONTEXT_LISTENER_EVENT_TYPE: () => (/* binding */ PRIVATE_CHANNEL_ON_ADD_CONTEXT_LISTENER_EVENT_TYPE),
/* harmony export */   PRIVATE_CHANNEL_ON_DISCONNECT_EVENT_TYPE: () => (/* binding */ PRIVATE_CHANNEL_ON_DISCONNECT_EVENT_TYPE),
/* harmony export */   PRIVATE_CHANNEL_ON_UNSUBSCRIBE_EVENT_TYPE: () => (/* binding */ PRIVATE_CHANNEL_ON_UNSUBSCRIBE_EVENT_TYPE),
/* harmony export */   PRIVATE_CHANNEL_UNSUBSCRIBE_EVENT_LISTENER_REQUEST_TYPE: () => (/* binding */ PRIVATE_CHANNEL_UNSUBSCRIBE_EVENT_LISTENER_REQUEST_TYPE),
/* harmony export */   PRIVATE_CHANNEL_UNSUBSCRIBE_EVENT_LISTENER_RESPONSE_TYPE: () => (/* binding */ PRIVATE_CHANNEL_UNSUBSCRIBE_EVENT_LISTENER_RESPONSE_TYPE),
/* harmony export */   RAISE_INTENT_FOR_CONTEXT_REQUEST_TYPE: () => (/* binding */ RAISE_INTENT_FOR_CONTEXT_REQUEST_TYPE),
/* harmony export */   RAISE_INTENT_FOR_CONTEXT_RESPONSE_TYPE: () => (/* binding */ RAISE_INTENT_FOR_CONTEXT_RESPONSE_TYPE),
/* harmony export */   RAISE_INTENT_REQUEST_TYPE: () => (/* binding */ RAISE_INTENT_REQUEST_TYPE),
/* harmony export */   RAISE_INTENT_RESPONSE_TYPE: () => (/* binding */ RAISE_INTENT_RESPONSE_TYPE),
/* harmony export */   RAISE_INTENT_RESULT_RESPONSE_TYPE: () => (/* binding */ RAISE_INTENT_RESULT_RESPONSE_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL1_HELLO_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL1_HELLO_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL2_LOAD_U_R_L_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL2_LOAD_U_R_L_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL3_HANDSHAKE_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL3_HANDSHAKE_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL4_VALIDATE_APP_IDENTITY_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL4_VALIDATE_APP_IDENTITY_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL5_VALIDATE_APP_IDENTITY_FAILED_RESPONSE_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL5_VALIDATE_APP_IDENTITY_FAILED_RESPONSE_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL5_VALIDATE_APP_IDENTITY_SUCCESS_RESPONSE_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL5_VALIDATE_APP_IDENTITY_SUCCESS_RESPONSE_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL6_GOODBYE_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL6_GOODBYE_TYPE),
/* harmony export */   WEB_CONNECTION_PROTOCOL_MESSAGE_TYPE: () => (/* binding */ WEB_CONNECTION_PROTOCOL_MESSAGE_TYPE),
/* harmony export */   isAddContextListenerRequest: () => (/* binding */ isAddContextListenerRequest),
/* harmony export */   isAddContextListenerResponse: () => (/* binding */ isAddContextListenerResponse),
/* harmony export */   isAddEventListenerRequest: () => (/* binding */ isAddEventListenerRequest),
/* harmony export */   isAddEventListenerResponse: () => (/* binding */ isAddEventListenerResponse),
/* harmony export */   isAddIntentListenerRequest: () => (/* binding */ isAddIntentListenerRequest),
/* harmony export */   isAddIntentListenerResponse: () => (/* binding */ isAddIntentListenerResponse),
/* harmony export */   isBroadcastEvent: () => (/* binding */ isBroadcastEvent),
/* harmony export */   isBroadcastRequest: () => (/* binding */ isBroadcastRequest),
/* harmony export */   isBroadcastResponse: () => (/* binding */ isBroadcastResponse),
/* harmony export */   isChannelChangedEvent: () => (/* binding */ isChannelChangedEvent),
/* harmony export */   isContextListenerUnsubscribeRequest: () => (/* binding */ isContextListenerUnsubscribeRequest),
/* harmony export */   isContextListenerUnsubscribeResponse: () => (/* binding */ isContextListenerUnsubscribeResponse),
/* harmony export */   isCreatePrivateChannelRequest: () => (/* binding */ isCreatePrivateChannelRequest),
/* harmony export */   isCreatePrivateChannelResponse: () => (/* binding */ isCreatePrivateChannelResponse),
/* harmony export */   isEventListenerUnsubscribeRequest: () => (/* binding */ isEventListenerUnsubscribeRequest),
/* harmony export */   isEventListenerUnsubscribeResponse: () => (/* binding */ isEventListenerUnsubscribeResponse),
/* harmony export */   isFdc3UserInterfaceChannelSelected: () => (/* binding */ isFdc3UserInterfaceChannelSelected),
/* harmony export */   isFdc3UserInterfaceChannels: () => (/* binding */ isFdc3UserInterfaceChannels),
/* harmony export */   isFdc3UserInterfaceDrag: () => (/* binding */ isFdc3UserInterfaceDrag),
/* harmony export */   isFdc3UserInterfaceHandshake: () => (/* binding */ isFdc3UserInterfaceHandshake),
/* harmony export */   isFdc3UserInterfaceHello: () => (/* binding */ isFdc3UserInterfaceHello),
/* harmony export */   isFdc3UserInterfaceResolve: () => (/* binding */ isFdc3UserInterfaceResolve),
/* harmony export */   isFdc3UserInterfaceResolveAction: () => (/* binding */ isFdc3UserInterfaceResolveAction),
/* harmony export */   isFdc3UserInterfaceRestyle: () => (/* binding */ isFdc3UserInterfaceRestyle),
/* harmony export */   isFindInstancesRequest: () => (/* binding */ isFindInstancesRequest),
/* harmony export */   isFindInstancesResponse: () => (/* binding */ isFindInstancesResponse),
/* harmony export */   isFindIntentRequest: () => (/* binding */ isFindIntentRequest),
/* harmony export */   isFindIntentResponse: () => (/* binding */ isFindIntentResponse),
/* harmony export */   isFindIntentsByContextRequest: () => (/* binding */ isFindIntentsByContextRequest),
/* harmony export */   isFindIntentsByContextResponse: () => (/* binding */ isFindIntentsByContextResponse),
/* harmony export */   isGetAppMetadataRequest: () => (/* binding */ isGetAppMetadataRequest),
/* harmony export */   isGetAppMetadataResponse: () => (/* binding */ isGetAppMetadataResponse),
/* harmony export */   isGetCurrentChannelRequest: () => (/* binding */ isGetCurrentChannelRequest),
/* harmony export */   isGetCurrentChannelResponse: () => (/* binding */ isGetCurrentChannelResponse),
/* harmony export */   isGetCurrentContextRequest: () => (/* binding */ isGetCurrentContextRequest),
/* harmony export */   isGetCurrentContextResponse: () => (/* binding */ isGetCurrentContextResponse),
/* harmony export */   isGetInfoRequest: () => (/* binding */ isGetInfoRequest),
/* harmony export */   isGetInfoResponse: () => (/* binding */ isGetInfoResponse),
/* harmony export */   isGetOrCreateChannelRequest: () => (/* binding */ isGetOrCreateChannelRequest),
/* harmony export */   isGetOrCreateChannelResponse: () => (/* binding */ isGetOrCreateChannelResponse),
/* harmony export */   isGetUserChannelsRequest: () => (/* binding */ isGetUserChannelsRequest),
/* harmony export */   isGetUserChannelsResponse: () => (/* binding */ isGetUserChannelsResponse),
/* harmony export */   isHeartbeatAcknowledgementRequest: () => (/* binding */ isHeartbeatAcknowledgementRequest),
/* harmony export */   isHeartbeatEvent: () => (/* binding */ isHeartbeatEvent),
/* harmony export */   isIntentEvent: () => (/* binding */ isIntentEvent),
/* harmony export */   isIntentListenerUnsubscribeRequest: () => (/* binding */ isIntentListenerUnsubscribeRequest),
/* harmony export */   isIntentListenerUnsubscribeResponse: () => (/* binding */ isIntentListenerUnsubscribeResponse),
/* harmony export */   isIntentResultRequest: () => (/* binding */ isIntentResultRequest),
/* harmony export */   isIntentResultResponse: () => (/* binding */ isIntentResultResponse),
/* harmony export */   isJoinUserChannelRequest: () => (/* binding */ isJoinUserChannelRequest),
/* harmony export */   isJoinUserChannelResponse: () => (/* binding */ isJoinUserChannelResponse),
/* harmony export */   isLeaveCurrentChannelRequest: () => (/* binding */ isLeaveCurrentChannelRequest),
/* harmony export */   isLeaveCurrentChannelResponse: () => (/* binding */ isLeaveCurrentChannelResponse),
/* harmony export */   isOpenRequest: () => (/* binding */ isOpenRequest),
/* harmony export */   isOpenResponse: () => (/* binding */ isOpenResponse),
/* harmony export */   isPrivateChannelAddEventListenerRequest: () => (/* binding */ isPrivateChannelAddEventListenerRequest),
/* harmony export */   isPrivateChannelAddEventListenerResponse: () => (/* binding */ isPrivateChannelAddEventListenerResponse),
/* harmony export */   isPrivateChannelDisconnectRequest: () => (/* binding */ isPrivateChannelDisconnectRequest),
/* harmony export */   isPrivateChannelDisconnectResponse: () => (/* binding */ isPrivateChannelDisconnectResponse),
/* harmony export */   isPrivateChannelOnAddContextListenerEvent: () => (/* binding */ isPrivateChannelOnAddContextListenerEvent),
/* harmony export */   isPrivateChannelOnDisconnectEvent: () => (/* binding */ isPrivateChannelOnDisconnectEvent),
/* harmony export */   isPrivateChannelOnUnsubscribeEvent: () => (/* binding */ isPrivateChannelOnUnsubscribeEvent),
/* harmony export */   isPrivateChannelUnsubscribeEventListenerRequest: () => (/* binding */ isPrivateChannelUnsubscribeEventListenerRequest),
/* harmony export */   isPrivateChannelUnsubscribeEventListenerResponse: () => (/* binding */ isPrivateChannelUnsubscribeEventListenerResponse),
/* harmony export */   isRaiseIntentForContextRequest: () => (/* binding */ isRaiseIntentForContextRequest),
/* harmony export */   isRaiseIntentForContextResponse: () => (/* binding */ isRaiseIntentForContextResponse),
/* harmony export */   isRaiseIntentRequest: () => (/* binding */ isRaiseIntentRequest),
/* harmony export */   isRaiseIntentResponse: () => (/* binding */ isRaiseIntentResponse),
/* harmony export */   isRaiseIntentResultResponse: () => (/* binding */ isRaiseIntentResultResponse),
/* harmony export */   isValidAddContextListenerRequest: () => (/* binding */ isValidAddContextListenerRequest),
/* harmony export */   isValidAddContextListenerResponse: () => (/* binding */ isValidAddContextListenerResponse),
/* harmony export */   isValidAddEventListenerRequest: () => (/* binding */ isValidAddEventListenerRequest),
/* harmony export */   isValidAddEventListenerResponse: () => (/* binding */ isValidAddEventListenerResponse),
/* harmony export */   isValidAddIntentListenerRequest: () => (/* binding */ isValidAddIntentListenerRequest),
/* harmony export */   isValidAddIntentListenerResponse: () => (/* binding */ isValidAddIntentListenerResponse),
/* harmony export */   isValidBroadcastEvent: () => (/* binding */ isValidBroadcastEvent),
/* harmony export */   isValidBroadcastRequest: () => (/* binding */ isValidBroadcastRequest),
/* harmony export */   isValidBroadcastResponse: () => (/* binding */ isValidBroadcastResponse),
/* harmony export */   isValidChannelChangedEvent: () => (/* binding */ isValidChannelChangedEvent),
/* harmony export */   isValidContextListenerUnsubscribeRequest: () => (/* binding */ isValidContextListenerUnsubscribeRequest),
/* harmony export */   isValidContextListenerUnsubscribeResponse: () => (/* binding */ isValidContextListenerUnsubscribeResponse),
/* harmony export */   isValidCreatePrivateChannelRequest: () => (/* binding */ isValidCreatePrivateChannelRequest),
/* harmony export */   isValidCreatePrivateChannelResponse: () => (/* binding */ isValidCreatePrivateChannelResponse),
/* harmony export */   isValidEventListenerUnsubscribeRequest: () => (/* binding */ isValidEventListenerUnsubscribeRequest),
/* harmony export */   isValidEventListenerUnsubscribeResponse: () => (/* binding */ isValidEventListenerUnsubscribeResponse),
/* harmony export */   isValidFdc3UserInterfaceChannelSelected: () => (/* binding */ isValidFdc3UserInterfaceChannelSelected),
/* harmony export */   isValidFdc3UserInterfaceChannels: () => (/* binding */ isValidFdc3UserInterfaceChannels),
/* harmony export */   isValidFdc3UserInterfaceDrag: () => (/* binding */ isValidFdc3UserInterfaceDrag),
/* harmony export */   isValidFdc3UserInterfaceHandshake: () => (/* binding */ isValidFdc3UserInterfaceHandshake),
/* harmony export */   isValidFdc3UserInterfaceHello: () => (/* binding */ isValidFdc3UserInterfaceHello),
/* harmony export */   isValidFdc3UserInterfaceMessage: () => (/* binding */ isValidFdc3UserInterfaceMessage),
/* harmony export */   isValidFdc3UserInterfaceResolve: () => (/* binding */ isValidFdc3UserInterfaceResolve),
/* harmony export */   isValidFdc3UserInterfaceResolveAction: () => (/* binding */ isValidFdc3UserInterfaceResolveAction),
/* harmony export */   isValidFdc3UserInterfaceRestyle: () => (/* binding */ isValidFdc3UserInterfaceRestyle),
/* harmony export */   isValidFindInstancesRequest: () => (/* binding */ isValidFindInstancesRequest),
/* harmony export */   isValidFindInstancesResponse: () => (/* binding */ isValidFindInstancesResponse),
/* harmony export */   isValidFindIntentRequest: () => (/* binding */ isValidFindIntentRequest),
/* harmony export */   isValidFindIntentResponse: () => (/* binding */ isValidFindIntentResponse),
/* harmony export */   isValidFindIntentsByContextRequest: () => (/* binding */ isValidFindIntentsByContextRequest),
/* harmony export */   isValidFindIntentsByContextResponse: () => (/* binding */ isValidFindIntentsByContextResponse),
/* harmony export */   isValidGetAppMetadataRequest: () => (/* binding */ isValidGetAppMetadataRequest),
/* harmony export */   isValidGetAppMetadataResponse: () => (/* binding */ isValidGetAppMetadataResponse),
/* harmony export */   isValidGetCurrentChannelRequest: () => (/* binding */ isValidGetCurrentChannelRequest),
/* harmony export */   isValidGetCurrentChannelResponse: () => (/* binding */ isValidGetCurrentChannelResponse),
/* harmony export */   isValidGetCurrentContextRequest: () => (/* binding */ isValidGetCurrentContextRequest),
/* harmony export */   isValidGetCurrentContextResponse: () => (/* binding */ isValidGetCurrentContextResponse),
/* harmony export */   isValidGetInfoRequest: () => (/* binding */ isValidGetInfoRequest),
/* harmony export */   isValidGetInfoResponse: () => (/* binding */ isValidGetInfoResponse),
/* harmony export */   isValidGetOrCreateChannelRequest: () => (/* binding */ isValidGetOrCreateChannelRequest),
/* harmony export */   isValidGetOrCreateChannelResponse: () => (/* binding */ isValidGetOrCreateChannelResponse),
/* harmony export */   isValidGetUserChannelsRequest: () => (/* binding */ isValidGetUserChannelsRequest),
/* harmony export */   isValidGetUserChannelsResponse: () => (/* binding */ isValidGetUserChannelsResponse),
/* harmony export */   isValidHeartbeatAcknowledgementRequest: () => (/* binding */ isValidHeartbeatAcknowledgementRequest),
/* harmony export */   isValidHeartbeatEvent: () => (/* binding */ isValidHeartbeatEvent),
/* harmony export */   isValidIntentEvent: () => (/* binding */ isValidIntentEvent),
/* harmony export */   isValidIntentListenerUnsubscribeRequest: () => (/* binding */ isValidIntentListenerUnsubscribeRequest),
/* harmony export */   isValidIntentListenerUnsubscribeResponse: () => (/* binding */ isValidIntentListenerUnsubscribeResponse),
/* harmony export */   isValidIntentResultRequest: () => (/* binding */ isValidIntentResultRequest),
/* harmony export */   isValidIntentResultResponse: () => (/* binding */ isValidIntentResultResponse),
/* harmony export */   isValidJoinUserChannelRequest: () => (/* binding */ isValidJoinUserChannelRequest),
/* harmony export */   isValidJoinUserChannelResponse: () => (/* binding */ isValidJoinUserChannelResponse),
/* harmony export */   isValidLeaveCurrentChannelRequest: () => (/* binding */ isValidLeaveCurrentChannelRequest),
/* harmony export */   isValidLeaveCurrentChannelResponse: () => (/* binding */ isValidLeaveCurrentChannelResponse),
/* harmony export */   isValidOpenRequest: () => (/* binding */ isValidOpenRequest),
/* harmony export */   isValidOpenResponse: () => (/* binding */ isValidOpenResponse),
/* harmony export */   isValidPrivateChannelAddEventListenerRequest: () => (/* binding */ isValidPrivateChannelAddEventListenerRequest),
/* harmony export */   isValidPrivateChannelAddEventListenerResponse: () => (/* binding */ isValidPrivateChannelAddEventListenerResponse),
/* harmony export */   isValidPrivateChannelDisconnectRequest: () => (/* binding */ isValidPrivateChannelDisconnectRequest),
/* harmony export */   isValidPrivateChannelDisconnectResponse: () => (/* binding */ isValidPrivateChannelDisconnectResponse),
/* harmony export */   isValidPrivateChannelOnAddContextListenerEvent: () => (/* binding */ isValidPrivateChannelOnAddContextListenerEvent),
/* harmony export */   isValidPrivateChannelOnDisconnectEvent: () => (/* binding */ isValidPrivateChannelOnDisconnectEvent),
/* harmony export */   isValidPrivateChannelOnUnsubscribeEvent: () => (/* binding */ isValidPrivateChannelOnUnsubscribeEvent),
/* harmony export */   isValidPrivateChannelUnsubscribeEventListenerRequest: () => (/* binding */ isValidPrivateChannelUnsubscribeEventListenerRequest),
/* harmony export */   isValidPrivateChannelUnsubscribeEventListenerResponse: () => (/* binding */ isValidPrivateChannelUnsubscribeEventListenerResponse),
/* harmony export */   isValidRaiseIntentForContextRequest: () => (/* binding */ isValidRaiseIntentForContextRequest),
/* harmony export */   isValidRaiseIntentForContextResponse: () => (/* binding */ isValidRaiseIntentForContextResponse),
/* harmony export */   isValidRaiseIntentRequest: () => (/* binding */ isValidRaiseIntentRequest),
/* harmony export */   isValidRaiseIntentResponse: () => (/* binding */ isValidRaiseIntentResponse),
/* harmony export */   isValidRaiseIntentResultResponse: () => (/* binding */ isValidRaiseIntentResultResponse),
/* harmony export */   isValidWebConnectionProtocol1Hello: () => (/* binding */ isValidWebConnectionProtocol1Hello),
/* harmony export */   isValidWebConnectionProtocol2LoadURL: () => (/* binding */ isValidWebConnectionProtocol2LoadURL),
/* harmony export */   isValidWebConnectionProtocol3Handshake: () => (/* binding */ isValidWebConnectionProtocol3Handshake),
/* harmony export */   isValidWebConnectionProtocol4ValidateAppIdentity: () => (/* binding */ isValidWebConnectionProtocol4ValidateAppIdentity),
/* harmony export */   isValidWebConnectionProtocol5ValidateAppIdentityFailedResponse: () => (/* binding */ isValidWebConnectionProtocol5ValidateAppIdentityFailedResponse),
/* harmony export */   isValidWebConnectionProtocol5ValidateAppIdentitySuccessResponse: () => (/* binding */ isValidWebConnectionProtocol5ValidateAppIdentitySuccessResponse),
/* harmony export */   isValidWebConnectionProtocol6Goodbye: () => (/* binding */ isValidWebConnectionProtocol6Goodbye),
/* harmony export */   isValidWebConnectionProtocolMessage: () => (/* binding */ isValidWebConnectionProtocolMessage),
/* harmony export */   isWebConnectionProtocol1Hello: () => (/* binding */ isWebConnectionProtocol1Hello),
/* harmony export */   isWebConnectionProtocol2LoadURL: () => (/* binding */ isWebConnectionProtocol2LoadURL),
/* harmony export */   isWebConnectionProtocol3Handshake: () => (/* binding */ isWebConnectionProtocol3Handshake),
/* harmony export */   isWebConnectionProtocol4ValidateAppIdentity: () => (/* binding */ isWebConnectionProtocol4ValidateAppIdentity),
/* harmony export */   isWebConnectionProtocol5ValidateAppIdentityFailedResponse: () => (/* binding */ isWebConnectionProtocol5ValidateAppIdentityFailedResponse),
/* harmony export */   isWebConnectionProtocol5ValidateAppIdentitySuccessResponse: () => (/* binding */ isWebConnectionProtocol5ValidateAppIdentitySuccessResponse),
/* harmony export */   isWebConnectionProtocol6Goodbye: () => (/* binding */ isWebConnectionProtocol6Goodbye)
/* harmony export */ });
// To parse this data:
//
//   import { Convert, WebConnectionProtocol1Hello, WebConnectionProtocol2LoadURL, WebConnectionProtocol3Handshake, WebConnectionProtocol4ValidateAppIdentity, WebConnectionProtocol5ValidateAppIdentityFailedResponse, WebConnectionProtocol5ValidateAppIdentitySuccessResponse, WebConnectionProtocol6Goodbye, WebConnectionProtocolMessage, AddContextListenerRequest, AddContextListenerResponse, AddEventListenerRequest, AddEventListenerResponse, AddIntentListenerRequest, AddIntentListenerResponse, AgentEventMessage, AgentResponseMessage, AppRequestMessage, BroadcastEvent, BroadcastRequest, BroadcastResponse, ChannelChangedEvent, ContextListenerUnsubscribeRequest, ContextListenerUnsubscribeResponse, CreatePrivateChannelRequest, CreatePrivateChannelResponse, EventListenerUnsubscribeRequest, EventListenerUnsubscribeResponse, Fdc3UserInterfaceChannelSelected, Fdc3UserInterfaceChannels, Fdc3UserInterfaceDrag, Fdc3UserInterfaceHandshake, Fdc3UserInterfaceHello, Fdc3UserInterfaceMessage, Fdc3UserInterfaceResolve, Fdc3UserInterfaceResolveAction, Fdc3UserInterfaceRestyle, FindInstancesRequest, FindInstancesResponse, FindIntentRequest, FindIntentResponse, FindIntentsByContextRequest, FindIntentsByContextResponse, GetAppMetadataRequest, GetAppMetadataResponse, GetCurrentChannelRequest, GetCurrentChannelResponse, GetCurrentContextRequest, GetCurrentContextResponse, GetInfoRequest, GetInfoResponse, GetOrCreateChannelRequest, GetOrCreateChannelResponse, GetUserChannelsRequest, GetUserChannelsResponse, HeartbeatAcknowledgementRequest, HeartbeatEvent, IntentEvent, IntentListenerUnsubscribeRequest, IntentListenerUnsubscribeResponse, IntentResultRequest, IntentResultResponse, JoinUserChannelRequest, JoinUserChannelResponse, LeaveCurrentChannelRequest, LeaveCurrentChannelResponse, OpenRequest, OpenResponse, PrivateChannelAddEventListenerRequest, PrivateChannelAddEventListenerResponse, PrivateChannelDisconnectRequest, PrivateChannelDisconnectResponse, PrivateChannelOnAddContextListenerEvent, PrivateChannelOnDisconnectEvent, PrivateChannelOnUnsubscribeEvent, PrivateChannelUnsubscribeEventListenerRequest, PrivateChannelUnsubscribeEventListenerResponse, RaiseIntentForContextRequest, RaiseIntentForContextResponse, RaiseIntentRequest, RaiseIntentResponse, RaiseIntentResultResponse } from "./file";
//
//   const webConnectionProtocol1Hello = Convert.toWebConnectionProtocol1Hello(json);
//   const webConnectionProtocol2LoadURL = Convert.toWebConnectionProtocol2LoadURL(json);
//   const webConnectionProtocol3Handshake = Convert.toWebConnectionProtocol3Handshake(json);
//   const webConnectionProtocol4ValidateAppIdentity = Convert.toWebConnectionProtocol4ValidateAppIdentity(json);
//   const webConnectionProtocol5ValidateAppIdentityFailedResponse = Convert.toWebConnectionProtocol5ValidateAppIdentityFailedResponse(json);
//   const webConnectionProtocol5ValidateAppIdentitySuccessResponse = Convert.toWebConnectionProtocol5ValidateAppIdentitySuccessResponse(json);
//   const webConnectionProtocol6Goodbye = Convert.toWebConnectionProtocol6Goodbye(json);
//   const webConnectionProtocolMessage = Convert.toWebConnectionProtocolMessage(json);
//   const addContextListenerRequest = Convert.toAddContextListenerRequest(json);
//   const addContextListenerResponse = Convert.toAddContextListenerResponse(json);
//   const addEventListenerRequest = Convert.toAddEventListenerRequest(json);
//   const addEventListenerResponse = Convert.toAddEventListenerResponse(json);
//   const addIntentListenerRequest = Convert.toAddIntentListenerRequest(json);
//   const addIntentListenerResponse = Convert.toAddIntentListenerResponse(json);
//   const agentEventMessage = Convert.toAgentEventMessage(json);
//   const agentResponseMessage = Convert.toAgentResponseMessage(json);
//   const appRequestMessage = Convert.toAppRequestMessage(json);
//   const broadcastEvent = Convert.toBroadcastEvent(json);
//   const broadcastRequest = Convert.toBroadcastRequest(json);
//   const broadcastResponse = Convert.toBroadcastResponse(json);
//   const channelChangedEvent = Convert.toChannelChangedEvent(json);
//   const contextListenerUnsubscribeRequest = Convert.toContextListenerUnsubscribeRequest(json);
//   const contextListenerUnsubscribeResponse = Convert.toContextListenerUnsubscribeResponse(json);
//   const createPrivateChannelRequest = Convert.toCreatePrivateChannelRequest(json);
//   const createPrivateChannelResponse = Convert.toCreatePrivateChannelResponse(json);
//   const eventListenerUnsubscribeRequest = Convert.toEventListenerUnsubscribeRequest(json);
//   const eventListenerUnsubscribeResponse = Convert.toEventListenerUnsubscribeResponse(json);
//   const fdc3UserInterfaceChannelSelected = Convert.toFdc3UserInterfaceChannelSelected(json);
//   const fdc3UserInterfaceChannels = Convert.toFdc3UserInterfaceChannels(json);
//   const fdc3UserInterfaceDrag = Convert.toFdc3UserInterfaceDrag(json);
//   const fdc3UserInterfaceHandshake = Convert.toFdc3UserInterfaceHandshake(json);
//   const fdc3UserInterfaceHello = Convert.toFdc3UserInterfaceHello(json);
//   const fdc3UserInterfaceMessage = Convert.toFdc3UserInterfaceMessage(json);
//   const fdc3UserInterfaceResolve = Convert.toFdc3UserInterfaceResolve(json);
//   const fdc3UserInterfaceResolveAction = Convert.toFdc3UserInterfaceResolveAction(json);
//   const fdc3UserInterfaceRestyle = Convert.toFdc3UserInterfaceRestyle(json);
//   const findInstancesRequest = Convert.toFindInstancesRequest(json);
//   const findInstancesResponse = Convert.toFindInstancesResponse(json);
//   const findIntentRequest = Convert.toFindIntentRequest(json);
//   const findIntentResponse = Convert.toFindIntentResponse(json);
//   const findIntentsByContextRequest = Convert.toFindIntentsByContextRequest(json);
//   const findIntentsByContextResponse = Convert.toFindIntentsByContextResponse(json);
//   const getAppMetadataRequest = Convert.toGetAppMetadataRequest(json);
//   const getAppMetadataResponse = Convert.toGetAppMetadataResponse(json);
//   const getCurrentChannelRequest = Convert.toGetCurrentChannelRequest(json);
//   const getCurrentChannelResponse = Convert.toGetCurrentChannelResponse(json);
//   const getCurrentContextRequest = Convert.toGetCurrentContextRequest(json);
//   const getCurrentContextResponse = Convert.toGetCurrentContextResponse(json);
//   const getInfoRequest = Convert.toGetInfoRequest(json);
//   const getInfoResponse = Convert.toGetInfoResponse(json);
//   const getOrCreateChannelRequest = Convert.toGetOrCreateChannelRequest(json);
//   const getOrCreateChannelResponse = Convert.toGetOrCreateChannelResponse(json);
//   const getUserChannelsRequest = Convert.toGetUserChannelsRequest(json);
//   const getUserChannelsResponse = Convert.toGetUserChannelsResponse(json);
//   const heartbeatAcknowledgementRequest = Convert.toHeartbeatAcknowledgementRequest(json);
//   const heartbeatEvent = Convert.toHeartbeatEvent(json);
//   const intentEvent = Convert.toIntentEvent(json);
//   const intentListenerUnsubscribeRequest = Convert.toIntentListenerUnsubscribeRequest(json);
//   const intentListenerUnsubscribeResponse = Convert.toIntentListenerUnsubscribeResponse(json);
//   const intentResultRequest = Convert.toIntentResultRequest(json);
//   const intentResultResponse = Convert.toIntentResultResponse(json);
//   const joinUserChannelRequest = Convert.toJoinUserChannelRequest(json);
//   const joinUserChannelResponse = Convert.toJoinUserChannelResponse(json);
//   const leaveCurrentChannelRequest = Convert.toLeaveCurrentChannelRequest(json);
//   const leaveCurrentChannelResponse = Convert.toLeaveCurrentChannelResponse(json);
//   const openRequest = Convert.toOpenRequest(json);
//   const openResponse = Convert.toOpenResponse(json);
//   const privateChannelAddEventListenerRequest = Convert.toPrivateChannelAddEventListenerRequest(json);
//   const privateChannelAddEventListenerResponse = Convert.toPrivateChannelAddEventListenerResponse(json);
//   const privateChannelDisconnectRequest = Convert.toPrivateChannelDisconnectRequest(json);
//   const privateChannelDisconnectResponse = Convert.toPrivateChannelDisconnectResponse(json);
//   const privateChannelOnAddContextListenerEvent = Convert.toPrivateChannelOnAddContextListenerEvent(json);
//   const privateChannelOnDisconnectEvent = Convert.toPrivateChannelOnDisconnectEvent(json);
//   const privateChannelOnUnsubscribeEvent = Convert.toPrivateChannelOnUnsubscribeEvent(json);
//   const privateChannelUnsubscribeEventListenerRequest = Convert.toPrivateChannelUnsubscribeEventListenerRequest(json);
//   const privateChannelUnsubscribeEventListenerResponse = Convert.toPrivateChannelUnsubscribeEventListenerResponse(json);
//   const raiseIntentForContextRequest = Convert.toRaiseIntentForContextRequest(json);
//   const raiseIntentForContextResponse = Convert.toRaiseIntentForContextResponse(json);
//   const raiseIntentRequest = Convert.toRaiseIntentRequest(json);
//   const raiseIntentResponse = Convert.toRaiseIntentResponse(json);
//   const raiseIntentResultResponse = Convert.toRaiseIntentResultResponse(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.
/**
 * Identifies the type of the message and it is typically set to the FDC3 function name that
 * the message relates to, e.g. 'findIntent', with 'Response' appended.
 */
// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
class Convert {
    static toWebConnectionProtocol1Hello(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocol1Hello'));
    }
    static webConnectionProtocol1HelloToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocol1Hello')), null, 2);
    }
    static toWebConnectionProtocol2LoadURL(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocol2LoadURL'));
    }
    static webConnectionProtocol2LoadURLToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocol2LoadURL')), null, 2);
    }
    static toWebConnectionProtocol3Handshake(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocol3Handshake'));
    }
    static webConnectionProtocol3HandshakeToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocol3Handshake')), null, 2);
    }
    static toWebConnectionProtocol4ValidateAppIdentity(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocol4ValidateAppIdentity'));
    }
    static webConnectionProtocol4ValidateAppIdentityToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocol4ValidateAppIdentity')), null, 2);
    }
    static toWebConnectionProtocol5ValidateAppIdentityFailedResponse(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocol5ValidateAppIdentityFailedResponse'));
    }
    static webConnectionProtocol5ValidateAppIdentityFailedResponseToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocol5ValidateAppIdentityFailedResponse')), null, 2);
    }
    static toWebConnectionProtocol5ValidateAppIdentitySuccessResponse(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocol5ValidateAppIdentitySuccessResponse'));
    }
    static webConnectionProtocol5ValidateAppIdentitySuccessResponseToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocol5ValidateAppIdentitySuccessResponse')), null, 2);
    }
    static toWebConnectionProtocol6Goodbye(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocol6Goodbye'));
    }
    static webConnectionProtocol6GoodbyeToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocol6Goodbye')), null, 2);
    }
    static toWebConnectionProtocolMessage(json) {
        return cast(JSON.parse(json), r('WebConnectionProtocolMessage'));
    }
    static webConnectionProtocolMessageToJson(value) {
        return JSON.stringify(uncast(value, r('WebConnectionProtocolMessage')), null, 2);
    }
    static toAddContextListenerRequest(json) {
        return cast(JSON.parse(json), r('AddContextListenerRequest'));
    }
    static addContextListenerRequestToJson(value) {
        return JSON.stringify(uncast(value, r('AddContextListenerRequest')), null, 2);
    }
    static toAddContextListenerResponse(json) {
        return cast(JSON.parse(json), r('AddContextListenerResponse'));
    }
    static addContextListenerResponseToJson(value) {
        return JSON.stringify(uncast(value, r('AddContextListenerResponse')), null, 2);
    }
    static toAddEventListenerRequest(json) {
        return cast(JSON.parse(json), r('AddEventListenerRequest'));
    }
    static addEventListenerRequestToJson(value) {
        return JSON.stringify(uncast(value, r('AddEventListenerRequest')), null, 2);
    }
    static toAddEventListenerResponse(json) {
        return cast(JSON.parse(json), r('AddEventListenerResponse'));
    }
    static addEventListenerResponseToJson(value) {
        return JSON.stringify(uncast(value, r('AddEventListenerResponse')), null, 2);
    }
    static toAddIntentListenerRequest(json) {
        return cast(JSON.parse(json), r('AddIntentListenerRequest'));
    }
    static addIntentListenerRequestToJson(value) {
        return JSON.stringify(uncast(value, r('AddIntentListenerRequest')), null, 2);
    }
    static toAddIntentListenerResponse(json) {
        return cast(JSON.parse(json), r('AddIntentListenerResponse'));
    }
    static addIntentListenerResponseToJson(value) {
        return JSON.stringify(uncast(value, r('AddIntentListenerResponse')), null, 2);
    }
    static toAgentEventMessage(json) {
        return cast(JSON.parse(json), r('AgentEventMessage'));
    }
    static agentEventMessageToJson(value) {
        return JSON.stringify(uncast(value, r('AgentEventMessage')), null, 2);
    }
    static toAgentResponseMessage(json) {
        return cast(JSON.parse(json), r('AgentResponseMessage'));
    }
    static agentResponseMessageToJson(value) {
        return JSON.stringify(uncast(value, r('AgentResponseMessage')), null, 2);
    }
    static toAppRequestMessage(json) {
        return cast(JSON.parse(json), r('AppRequestMessage'));
    }
    static appRequestMessageToJson(value) {
        return JSON.stringify(uncast(value, r('AppRequestMessage')), null, 2);
    }
    static toBroadcastEvent(json) {
        return cast(JSON.parse(json), r('BroadcastEvent'));
    }
    static broadcastEventToJson(value) {
        return JSON.stringify(uncast(value, r('BroadcastEvent')), null, 2);
    }
    static toBroadcastRequest(json) {
        return cast(JSON.parse(json), r('BroadcastRequest'));
    }
    static broadcastRequestToJson(value) {
        return JSON.stringify(uncast(value, r('BroadcastRequest')), null, 2);
    }
    static toBroadcastResponse(json) {
        return cast(JSON.parse(json), r('BroadcastResponse'));
    }
    static broadcastResponseToJson(value) {
        return JSON.stringify(uncast(value, r('BroadcastResponse')), null, 2);
    }
    static toChannelChangedEvent(json) {
        return cast(JSON.parse(json), r('ChannelChangedEvent'));
    }
    static channelChangedEventToJson(value) {
        return JSON.stringify(uncast(value, r('ChannelChangedEvent')), null, 2);
    }
    static toContextListenerUnsubscribeRequest(json) {
        return cast(JSON.parse(json), r('ContextListenerUnsubscribeRequest'));
    }
    static contextListenerUnsubscribeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('ContextListenerUnsubscribeRequest')), null, 2);
    }
    static toContextListenerUnsubscribeResponse(json) {
        return cast(JSON.parse(json), r('ContextListenerUnsubscribeResponse'));
    }
    static contextListenerUnsubscribeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('ContextListenerUnsubscribeResponse')), null, 2);
    }
    static toCreatePrivateChannelRequest(json) {
        return cast(JSON.parse(json), r('CreatePrivateChannelRequest'));
    }
    static createPrivateChannelRequestToJson(value) {
        return JSON.stringify(uncast(value, r('CreatePrivateChannelRequest')), null, 2);
    }
    static toCreatePrivateChannelResponse(json) {
        return cast(JSON.parse(json), r('CreatePrivateChannelResponse'));
    }
    static createPrivateChannelResponseToJson(value) {
        return JSON.stringify(uncast(value, r('CreatePrivateChannelResponse')), null, 2);
    }
    static toEventListenerUnsubscribeRequest(json) {
        return cast(JSON.parse(json), r('EventListenerUnsubscribeRequest'));
    }
    static eventListenerUnsubscribeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('EventListenerUnsubscribeRequest')), null, 2);
    }
    static toEventListenerUnsubscribeResponse(json) {
        return cast(JSON.parse(json), r('EventListenerUnsubscribeResponse'));
    }
    static eventListenerUnsubscribeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('EventListenerUnsubscribeResponse')), null, 2);
    }
    static toFdc3UserInterfaceChannelSelected(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceChannelSelected'));
    }
    static fdc3UserInterfaceChannelSelectedToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceChannelSelected')), null, 2);
    }
    static toFdc3UserInterfaceChannels(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceChannels'));
    }
    static fdc3UserInterfaceChannelsToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceChannels')), null, 2);
    }
    static toFdc3UserInterfaceDrag(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceDrag'));
    }
    static fdc3UserInterfaceDragToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceDrag')), null, 2);
    }
    static toFdc3UserInterfaceHandshake(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceHandshake'));
    }
    static fdc3UserInterfaceHandshakeToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceHandshake')), null, 2);
    }
    static toFdc3UserInterfaceHello(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceHello'));
    }
    static fdc3UserInterfaceHelloToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceHello')), null, 2);
    }
    static toFdc3UserInterfaceMessage(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceMessage'));
    }
    static fdc3UserInterfaceMessageToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceMessage')), null, 2);
    }
    static toFdc3UserInterfaceResolve(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceResolve'));
    }
    static fdc3UserInterfaceResolveToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceResolve')), null, 2);
    }
    static toFdc3UserInterfaceResolveAction(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceResolveAction'));
    }
    static fdc3UserInterfaceResolveActionToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceResolveAction')), null, 2);
    }
    static toFdc3UserInterfaceRestyle(json) {
        return cast(JSON.parse(json), r('Fdc3UserInterfaceRestyle'));
    }
    static fdc3UserInterfaceRestyleToJson(value) {
        return JSON.stringify(uncast(value, r('Fdc3UserInterfaceRestyle')), null, 2);
    }
    static toFindInstancesRequest(json) {
        return cast(JSON.parse(json), r('FindInstancesRequest'));
    }
    static findInstancesRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesRequest')), null, 2);
    }
    static toFindInstancesResponse(json) {
        return cast(JSON.parse(json), r('FindInstancesResponse'));
    }
    static findInstancesResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesResponse')), null, 2);
    }
    static toFindIntentRequest(json) {
        return cast(JSON.parse(json), r('FindIntentRequest'));
    }
    static findIntentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentRequest')), null, 2);
    }
    static toFindIntentResponse(json) {
        return cast(JSON.parse(json), r('FindIntentResponse'));
    }
    static findIntentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentResponse')), null, 2);
    }
    static toFindIntentsByContextRequest(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextRequest'));
    }
    static findIntentsByContextRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextRequest')), null, 2);
    }
    static toFindIntentsByContextResponse(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextResponse'));
    }
    static findIntentsByContextResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextResponse')), null, 2);
    }
    static toGetAppMetadataRequest(json) {
        return cast(JSON.parse(json), r('GetAppMetadataRequest'));
    }
    static getAppMetadataRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataRequest')), null, 2);
    }
    static toGetAppMetadataResponse(json) {
        return cast(JSON.parse(json), r('GetAppMetadataResponse'));
    }
    static getAppMetadataResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataResponse')), null, 2);
    }
    static toGetCurrentChannelRequest(json) {
        return cast(JSON.parse(json), r('GetCurrentChannelRequest'));
    }
    static getCurrentChannelRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetCurrentChannelRequest')), null, 2);
    }
    static toGetCurrentChannelResponse(json) {
        return cast(JSON.parse(json), r('GetCurrentChannelResponse'));
    }
    static getCurrentChannelResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetCurrentChannelResponse')), null, 2);
    }
    static toGetCurrentContextRequest(json) {
        return cast(JSON.parse(json), r('GetCurrentContextRequest'));
    }
    static getCurrentContextRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetCurrentContextRequest')), null, 2);
    }
    static toGetCurrentContextResponse(json) {
        return cast(JSON.parse(json), r('GetCurrentContextResponse'));
    }
    static getCurrentContextResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetCurrentContextResponse')), null, 2);
    }
    static toGetInfoRequest(json) {
        return cast(JSON.parse(json), r('GetInfoRequest'));
    }
    static getInfoRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetInfoRequest')), null, 2);
    }
    static toGetInfoResponse(json) {
        return cast(JSON.parse(json), r('GetInfoResponse'));
    }
    static getInfoResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetInfoResponse')), null, 2);
    }
    static toGetOrCreateChannelRequest(json) {
        return cast(JSON.parse(json), r('GetOrCreateChannelRequest'));
    }
    static getOrCreateChannelRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetOrCreateChannelRequest')), null, 2);
    }
    static toGetOrCreateChannelResponse(json) {
        return cast(JSON.parse(json), r('GetOrCreateChannelResponse'));
    }
    static getOrCreateChannelResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetOrCreateChannelResponse')), null, 2);
    }
    static toGetUserChannelsRequest(json) {
        return cast(JSON.parse(json), r('GetUserChannelsRequest'));
    }
    static getUserChannelsRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetUserChannelsRequest')), null, 2);
    }
    static toGetUserChannelsResponse(json) {
        return cast(JSON.parse(json), r('GetUserChannelsResponse'));
    }
    static getUserChannelsResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetUserChannelsResponse')), null, 2);
    }
    static toHeartbeatAcknowledgementRequest(json) {
        return cast(JSON.parse(json), r('HeartbeatAcknowledgementRequest'));
    }
    static heartbeatAcknowledgementRequestToJson(value) {
        return JSON.stringify(uncast(value, r('HeartbeatAcknowledgementRequest')), null, 2);
    }
    static toHeartbeatEvent(json) {
        return cast(JSON.parse(json), r('HeartbeatEvent'));
    }
    static heartbeatEventToJson(value) {
        return JSON.stringify(uncast(value, r('HeartbeatEvent')), null, 2);
    }
    static toIntentEvent(json) {
        return cast(JSON.parse(json), r('IntentEvent'));
    }
    static intentEventToJson(value) {
        return JSON.stringify(uncast(value, r('IntentEvent')), null, 2);
    }
    static toIntentListenerUnsubscribeRequest(json) {
        return cast(JSON.parse(json), r('IntentListenerUnsubscribeRequest'));
    }
    static intentListenerUnsubscribeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('IntentListenerUnsubscribeRequest')), null, 2);
    }
    static toIntentListenerUnsubscribeResponse(json) {
        return cast(JSON.parse(json), r('IntentListenerUnsubscribeResponse'));
    }
    static intentListenerUnsubscribeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('IntentListenerUnsubscribeResponse')), null, 2);
    }
    static toIntentResultRequest(json) {
        return cast(JSON.parse(json), r('IntentResultRequest'));
    }
    static intentResultRequestToJson(value) {
        return JSON.stringify(uncast(value, r('IntentResultRequest')), null, 2);
    }
    static toIntentResultResponse(json) {
        return cast(JSON.parse(json), r('IntentResultResponse'));
    }
    static intentResultResponseToJson(value) {
        return JSON.stringify(uncast(value, r('IntentResultResponse')), null, 2);
    }
    static toJoinUserChannelRequest(json) {
        return cast(JSON.parse(json), r('JoinUserChannelRequest'));
    }
    static joinUserChannelRequestToJson(value) {
        return JSON.stringify(uncast(value, r('JoinUserChannelRequest')), null, 2);
    }
    static toJoinUserChannelResponse(json) {
        return cast(JSON.parse(json), r('JoinUserChannelResponse'));
    }
    static joinUserChannelResponseToJson(value) {
        return JSON.stringify(uncast(value, r('JoinUserChannelResponse')), null, 2);
    }
    static toLeaveCurrentChannelRequest(json) {
        return cast(JSON.parse(json), r('LeaveCurrentChannelRequest'));
    }
    static leaveCurrentChannelRequestToJson(value) {
        return JSON.stringify(uncast(value, r('LeaveCurrentChannelRequest')), null, 2);
    }
    static toLeaveCurrentChannelResponse(json) {
        return cast(JSON.parse(json), r('LeaveCurrentChannelResponse'));
    }
    static leaveCurrentChannelResponseToJson(value) {
        return JSON.stringify(uncast(value, r('LeaveCurrentChannelResponse')), null, 2);
    }
    static toOpenRequest(json) {
        return cast(JSON.parse(json), r('OpenRequest'));
    }
    static openRequestToJson(value) {
        return JSON.stringify(uncast(value, r('OpenRequest')), null, 2);
    }
    static toOpenResponse(json) {
        return cast(JSON.parse(json), r('OpenResponse'));
    }
    static openResponseToJson(value) {
        return JSON.stringify(uncast(value, r('OpenResponse')), null, 2);
    }
    static toPrivateChannelAddEventListenerRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelAddEventListenerRequest'));
    }
    static privateChannelAddEventListenerRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelAddEventListenerRequest')), null, 2);
    }
    static toPrivateChannelAddEventListenerResponse(json) {
        return cast(JSON.parse(json), r('PrivateChannelAddEventListenerResponse'));
    }
    static privateChannelAddEventListenerResponseToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelAddEventListenerResponse')), null, 2);
    }
    static toPrivateChannelDisconnectRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelDisconnectRequest'));
    }
    static privateChannelDisconnectRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelDisconnectRequest')), null, 2);
    }
    static toPrivateChannelDisconnectResponse(json) {
        return cast(JSON.parse(json), r('PrivateChannelDisconnectResponse'));
    }
    static privateChannelDisconnectResponseToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelDisconnectResponse')), null, 2);
    }
    static toPrivateChannelOnAddContextListenerEvent(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnAddContextListenerEvent'));
    }
    static privateChannelOnAddContextListenerEventToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnAddContextListenerEvent')), null, 2);
    }
    static toPrivateChannelOnDisconnectEvent(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnDisconnectEvent'));
    }
    static privateChannelOnDisconnectEventToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnDisconnectEvent')), null, 2);
    }
    static toPrivateChannelOnUnsubscribeEvent(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnUnsubscribeEvent'));
    }
    static privateChannelOnUnsubscribeEventToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnUnsubscribeEvent')), null, 2);
    }
    static toPrivateChannelUnsubscribeEventListenerRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelUnsubscribeEventListenerRequest'));
    }
    static privateChannelUnsubscribeEventListenerRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelUnsubscribeEventListenerRequest')), null, 2);
    }
    static toPrivateChannelUnsubscribeEventListenerResponse(json) {
        return cast(JSON.parse(json), r('PrivateChannelUnsubscribeEventListenerResponse'));
    }
    static privateChannelUnsubscribeEventListenerResponseToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelUnsubscribeEventListenerResponse')), null, 2);
    }
    static toRaiseIntentForContextRequest(json) {
        return cast(JSON.parse(json), r('RaiseIntentForContextRequest'));
    }
    static raiseIntentForContextRequestToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentForContextRequest')), null, 2);
    }
    static toRaiseIntentForContextResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentForContextResponse'));
    }
    static raiseIntentForContextResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentForContextResponse')), null, 2);
    }
    static toRaiseIntentRequest(json) {
        return cast(JSON.parse(json), r('RaiseIntentRequest'));
    }
    static raiseIntentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentRequest')), null, 2);
    }
    static toRaiseIntentResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentResponse'));
    }
    static raiseIntentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentResponse')), null, 2);
    }
    static toRaiseIntentResultResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentResultResponse'));
    }
    static raiseIntentResultResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentResultResponse')), null, 2);
    }
}
function invalidValue(typ, val, key, parent = '') {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}
function prettyTypeName(typ) {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        }
        else {
            return `one of [${typ
                .map(a => {
                return prettyTypeName(a);
            })
                .join(', ')}]`;
        }
    }
    else if (typeof typ === 'object' && typ.literal !== undefined) {
        return typ.literal;
    }
    else {
        return typeof typ;
    }
}
function jsonToJSProps(typ) {
    if (typ.jsonToJS === undefined) {
        const map = {};
        typ.props.forEach((p) => (map[p.json] = { key: p.js, typ: p.typ }));
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}
function jsToJSONProps(typ) {
    if (typ.jsToJSON === undefined) {
        const map = {};
        typ.props.forEach((p) => (map[p.js] = { key: p.json, typ: p.typ }));
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}
function transform(val, typ, getProps, key = '', parent = '') {
    function transformPrimitive(typ, val) {
        if (typeof typ === typeof val)
            return val;
        return invalidValue(typ, val, key, parent);
    }
    function transformUnion(typs, val) {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            }
            catch (_) { }
        }
        return invalidValue(typs, val, key, parent);
    }
    function transformEnum(cases, val) {
        if (cases.indexOf(val) !== -1)
            return val;
        return invalidValue(cases.map(a => {
            return l(a);
        }), val, key, parent);
    }
    function transformArray(typ, val) {
        // val must be an array with no invalid elements
        if (!Array.isArray(val))
            return invalidValue(l('array'), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }
    function transformDate(val) {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l('Date'), val, key, parent);
        }
        return d;
    }
    function transformObject(props, additional, val) {
        if (val === null || typeof val !== 'object' || Array.isArray(val)) {
            return invalidValue(l(ref || 'object'), val, key, parent);
        }
        const result = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }
    if (typ === 'any')
        return val;
    if (typ === null) {
        if (val === null)
            return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false)
        return invalidValue(typ, val, key, parent);
    let ref = undefined;
    while (typeof typ === 'object' && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ))
        return transformEnum(typ, val);
    if (typeof typ === 'object') {
        return typ.hasOwnProperty('unionMembers')
            ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty('arrayItems')
                ? transformArray(typ.arrayItems, val)
                : typ.hasOwnProperty('props')
                    ? transformObject(getProps(typ), typ.additional, val)
                    : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== 'number')
        return transformDate(val);
    return transformPrimitive(typ, val);
}
function cast(val, typ) {
    return transform(val, typ, jsonToJSProps);
}
function uncast(val, typ) {
    return transform(val, typ, jsToJSONProps);
}
function l(typ) {
    return { literal: typ };
}
function a(typ) {
    return { arrayItems: typ };
}
function u(...typs) {
    return { unionMembers: typs };
}
function o(props, additional) {
    return { props, additional };
}
function m(additional) {
    return { props: [], additional };
}
function r(name) {
    return { ref: name };
}
const typeMap = {
    WebConnectionProtocol1Hello: o([
        { json: 'meta', js: 'meta', typ: r('WebConnectionProtocol1HelloMeta') },
        { json: 'payload', js: 'payload', typ: r('WebConnectionProtocol1HelloPayload') },
        { json: 'type', js: 'type', typ: r('WebConnectionProtocol1HelloType') },
    ], false),
    WebConnectionProtocol1HelloMeta: o([
        { json: 'connectionAttemptUuid', js: 'connectionAttemptUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    WebConnectionProtocol1HelloPayload: o([
        { json: 'actualUrl', js: 'actualUrl', typ: '' },
        { json: 'channelSelector', js: 'channelSelector', typ: u(undefined, true) },
        { json: 'fdc3Version', js: 'fdc3Version', typ: '' },
        { json: 'identityUrl', js: 'identityUrl', typ: '' },
        { json: 'intentResolver', js: 'intentResolver', typ: u(undefined, true) },
    ], false),
    WebConnectionProtocol2LoadURL: o([
        { json: 'meta', js: 'meta', typ: r('WebConnectionProtocol1HelloMeta') },
        { json: 'payload', js: 'payload', typ: r('WebConnectionProtocol2LoadURLPayload') },
        { json: 'type', js: 'type', typ: r('WebConnectionProtocol2LoadURLType') },
    ], false),
    WebConnectionProtocol2LoadURLPayload: o([{ json: 'iframeUrl', js: 'iframeUrl', typ: '' }], false),
    WebConnectionProtocol3Handshake: o([
        { json: 'meta', js: 'meta', typ: r('WebConnectionProtocol1HelloMeta') },
        { json: 'payload', js: 'payload', typ: r('WebConnectionProtocol3HandshakePayload') },
        { json: 'type', js: 'type', typ: r('WebConnectionProtocol3HandshakeType') },
    ], false),
    WebConnectionProtocol3HandshakePayload: o([
        { json: 'appLaunchTimeout', js: 'appLaunchTimeout', typ: u(undefined, 3.14) },
        { json: 'channelSelectorUrl', js: 'channelSelectorUrl', typ: u(true, '') },
        { json: 'fdc3Version', js: 'fdc3Version', typ: '' },
        { json: 'intentResolverUrl', js: 'intentResolverUrl', typ: u(true, '') },
        { json: 'messageExchangeTimeout', js: 'messageExchangeTimeout', typ: u(undefined, 3.14) },
    ], false),
    WebConnectionProtocol4ValidateAppIdentity: o([
        { json: 'meta', js: 'meta', typ: r('WebConnectionProtocol1HelloMeta') },
        { json: 'payload', js: 'payload', typ: r('WebConnectionProtocol4ValidateAppIdentityPayload') },
        { json: 'type', js: 'type', typ: r('WebConnectionProtocol4ValidateAppIdentityType') },
    ], false),
    WebConnectionProtocol4ValidateAppIdentityPayload: o([
        { json: 'actualUrl', js: 'actualUrl', typ: '' },
        { json: 'identityUrl', js: 'identityUrl', typ: '' },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
        { json: 'instanceUuid', js: 'instanceUuid', typ: u(undefined, '') },
    ], false),
    WebConnectionProtocol5ValidateAppIdentityFailedResponse: o([
        { json: 'meta', js: 'meta', typ: r('WebConnectionProtocol1HelloMeta') },
        { json: 'payload', js: 'payload', typ: r('WebConnectionProtocol5ValidateAppIdentityFailedResponsePayload') },
        { json: 'type', js: 'type', typ: r('WebConnectionProtocol5ValidateAppIdentityFailedResponseType') },
    ], false),
    WebConnectionProtocol5ValidateAppIdentityFailedResponsePayload: o([{ json: 'message', js: 'message', typ: u(undefined, '') }], false),
    WebConnectionProtocol5ValidateAppIdentitySuccessResponse: o([
        { json: 'meta', js: 'meta', typ: r('WebConnectionProtocol1HelloMeta') },
        { json: 'payload', js: 'payload', typ: r('WebConnectionProtocol5ValidateAppIdentitySuccessResponsePayload') },
        { json: 'type', js: 'type', typ: r('WebConnectionProtocol5ValidateAppIdentitySuccessResponseType') },
    ], false),
    WebConnectionProtocol5ValidateAppIdentitySuccessResponsePayload: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'implementationMetadata', js: 'implementationMetadata', typ: r('ImplementationMetadata') },
        { json: 'instanceId', js: 'instanceId', typ: '' },
        { json: 'instanceUuid', js: 'instanceUuid', typ: '' },
    ], false),
    ImplementationMetadata: o([
        { json: 'appMetadata', js: 'appMetadata', typ: r('AppMetadata') },
        { json: 'fdc3Version', js: 'fdc3Version', typ: '' },
        { json: 'optionalFeatures', js: 'optionalFeatures', typ: r('OptionalFeatures') },
        { json: 'provider', js: 'provider', typ: '' },
        { json: 'providerVersion', js: 'providerVersion', typ: u(undefined, '') },
    ], false),
    AppMetadata: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'description', js: 'description', typ: u(undefined, '') },
        { json: 'desktopAgent', js: 'desktopAgent', typ: u(undefined, '') },
        { json: 'icons', js: 'icons', typ: u(undefined, a(r('Icon'))) },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
        { json: 'instanceMetadata', js: 'instanceMetadata', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'resultType', js: 'resultType', typ: u(undefined, u(null, '')) },
        { json: 'screenshots', js: 'screenshots', typ: u(undefined, a(r('Image'))) },
        { json: 'title', js: 'title', typ: u(undefined, '') },
        { json: 'tooltip', js: 'tooltip', typ: u(undefined, '') },
        { json: 'version', js: 'version', typ: u(undefined, '') },
    ], false),
    Icon: o([
        { json: 'size', js: 'size', typ: u(undefined, '') },
        { json: 'src', js: 'src', typ: '' },
        { json: 'type', js: 'type', typ: u(undefined, '') },
    ], false),
    Image: o([
        { json: 'label', js: 'label', typ: u(undefined, '') },
        { json: 'size', js: 'size', typ: u(undefined, '') },
        { json: 'src', js: 'src', typ: '' },
        { json: 'type', js: 'type', typ: u(undefined, '') },
    ], false),
    OptionalFeatures: o([
        { json: 'DesktopAgentBridging', js: 'DesktopAgentBridging', typ: true },
        { json: 'OriginatingAppMetadata', js: 'OriginatingAppMetadata', typ: true },
        { json: 'UserChannelMembershipAPIs', js: 'UserChannelMembershipAPIs', typ: true },
    ], false),
    WebConnectionProtocol6Goodbye: o([
        { json: 'meta', js: 'meta', typ: r('WebConnectionProtocol6GoodbyeMeta') },
        { json: 'type', js: 'type', typ: r('WebConnectionProtocol6GoodbyeType') },
    ], false),
    WebConnectionProtocol6GoodbyeMeta: o([{ json: 'timestamp', js: 'timestamp', typ: Date }], false),
    WebConnectionProtocolMessage: o([
        { json: 'meta', js: 'meta', typ: r('ConnectionStepMetadata') },
        { json: 'payload', js: 'payload', typ: u(undefined, m('any')) },
        { json: 'type', js: 'type', typ: r('ConnectionStepMessageType') },
    ], false),
    ConnectionStepMetadata: o([
        { json: 'timestamp', js: 'timestamp', typ: Date },
        { json: 'connectionAttemptUuid', js: 'connectionAttemptUuid', typ: u(undefined, '') },
    ], false),
    AddContextListenerRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('AddContextListenerRequestPayload') },
        { json: 'type', js: 'type', typ: r('AddContextListenerRequestType') },
    ], false),
    AddContextListenerRequestMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('AppIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    AppIdentifier: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'desktopAgent', js: 'desktopAgent', typ: u(undefined, '') },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    AddContextListenerRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: u(null, '') },
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
    ], false),
    AddContextListenerResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('AddContextListenerResponsePayload') },
        { json: 'type', js: 'type', typ: r('AddContextListenerResponseType') },
    ], false),
    AddContextListenerResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('AppIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    AddContextListenerResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) },
        { json: 'listenerUUID', js: 'listenerUUID', typ: u(undefined, '') },
    ], false),
    AddEventListenerRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('AddEventListenerRequestPayload') },
        { json: 'type', js: 'type', typ: r('AddEventListenerRequestType') },
    ], false),
    AddEventListenerRequestPayload: o([{ json: 'type', js: 'type', typ: u(r('FDC3EventType'), null) }], false),
    AddEventListenerResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('AddEventListenerResponsePayload') },
        { json: 'type', js: 'type', typ: r('AddEventListenerResponseType') },
    ], false),
    AddEventListenerResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('ResponsePayloadError')) },
        { json: 'listenerUUID', js: 'listenerUUID', typ: u(undefined, '') },
    ], false),
    AddIntentListenerRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('AddIntentListenerRequestPayload') },
        { json: 'type', js: 'type', typ: r('AddIntentListenerRequestType') },
    ], false),
    AddIntentListenerRequestPayload: o([{ json: 'intent', js: 'intent', typ: '' }], false),
    AddIntentListenerResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('PayloadObject') },
        { json: 'type', js: 'type', typ: r('AddIntentListenerResponseType') },
    ], false),
    PayloadObject: o([
        { json: 'error', js: 'error', typ: u(undefined, r('FluffyError')) },
        { json: 'listenerUUID', js: 'listenerUUID', typ: u(undefined, '') },
    ], 'any'),
    AgentEventMessage: o([
        { json: 'meta', js: 'meta', typ: r('AgentEventMessageMeta') },
        { json: 'payload', js: 'payload', typ: m('any') },
        { json: 'type', js: 'type', typ: r('EventMessageType') },
    ], false),
    AgentEventMessageMeta: o([
        { json: 'eventUuid', js: 'eventUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    AgentResponseMessage: o([
        { json: 'meta', js: 'meta', typ: r('AgentResponseMessageMeta') },
        { json: 'payload', js: 'payload', typ: r('AgentResponseMessageResponsePayload') },
        { json: 'type', js: 'type', typ: r('ResponseMessageType') },
    ], false),
    AgentResponseMessageMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('AppIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    AgentResponseMessageResponsePayload: o([{ json: 'error', js: 'error', typ: u(undefined, r('ResponsePayloadError')) }], 'any'),
    AppRequestMessage: o([
        { json: 'meta', js: 'meta', typ: r('AppRequestMessageMeta') },
        { json: 'payload', js: 'payload', typ: m('any') },
        { json: 'type', js: 'type', typ: r('RequestMessageType') },
    ], false),
    AppRequestMessageMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('AppIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    BroadcastEvent: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastEventMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastEventPayload') },
        { json: 'type', js: 'type', typ: r('BroadcastEventType') },
    ], false),
    BroadcastEventMeta: o([
        { json: 'eventUuid', js: 'eventUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    BroadcastEventPayload: o([
        { json: 'channelId', js: 'channelId', typ: u(null, '') },
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'originatingApp', js: 'originatingApp', typ: u(undefined, r('AppIdentifier')) },
    ], false),
    Context: o([
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: '' },
    ], 'any'),
    BroadcastRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastRequestPayload') },
        { json: 'type', js: 'type', typ: r('BroadcastRequestType') },
    ], false),
    BroadcastRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'context', js: 'context', typ: r('Context') },
    ], false),
    BroadcastResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastResponseResponsePayload') },
        { json: 'type', js: 'type', typ: r('BroadcastResponseType') },
    ], false),
    BroadcastResponseResponsePayload: o([{ json: 'error', js: 'error', typ: u(undefined, r('ResponsePayloadError')) }], 'any'),
    ChannelChangedEvent: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastEventMeta') },
        { json: 'payload', js: 'payload', typ: r('ChannelChangedEventPayload') },
        { json: 'type', js: 'type', typ: r('ChannelChangedEventType') },
    ], false),
    ChannelChangedEventPayload: o([
        { json: 'newChannelId', js: 'newChannelId', typ: u(undefined, u(null, '')) },
        { json: 'currentChannelId', js: 'currentChannelId', typ: u(undefined, u(null, '')) },
    ], false),
    ContextListenerUnsubscribeRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('ContextListenerUnsubscribeRequestPayload') },
        { json: 'type', js: 'type', typ: r('ContextListenerUnsubscribeRequestType') },
    ], false),
    ContextListenerUnsubscribeRequestPayload: o([{ json: 'listenerUUID', js: 'listenerUUID', typ: '' }], false),
    ContextListenerUnsubscribeResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastResponseResponsePayload') },
        { json: 'type', js: 'type', typ: r('ContextListenerUnsubscribeResponseType') },
    ], false),
    CreatePrivateChannelRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('CreatePrivateChannelRequestPayload') },
        { json: 'type', js: 'type', typ: r('CreatePrivateChannelRequestType') },
    ], false),
    CreatePrivateChannelRequestPayload: o([], false),
    CreatePrivateChannelResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('CreatePrivateChannelResponsePayload') },
        { json: 'type', js: 'type', typ: r('CreatePrivateChannelResponseType') },
    ], false),
    CreatePrivateChannelResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) },
        { json: 'privateChannel', js: 'privateChannel', typ: u(undefined, r('Channel')) },
    ], false),
    Channel: o([
        { json: 'displayMetadata', js: 'displayMetadata', typ: u(undefined, r('DisplayMetadata')) },
        { json: 'id', js: 'id', typ: '' },
        { json: 'type', js: 'type', typ: r('Type') },
    ], false),
    DisplayMetadata: o([
        { json: 'color', js: 'color', typ: u(undefined, '') },
        { json: 'glyph', js: 'glyph', typ: u(undefined, '') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], false),
    EventListenerUnsubscribeRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('EventListenerUnsubscribeRequestPayload') },
        { json: 'type', js: 'type', typ: r('EventListenerUnsubscribeRequestType') },
    ], false),
    EventListenerUnsubscribeRequestPayload: o([{ json: 'listenerUUID', js: 'listenerUUID', typ: '' }], false),
    EventListenerUnsubscribeResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastResponseResponsePayload') },
        { json: 'type', js: 'type', typ: r('EventListenerUnsubscribeResponseType') },
    ], false),
    Fdc3UserInterfaceChannelSelected: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceChannelSelectedPayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceChannelSelectedType') },
    ], false),
    Fdc3UserInterfaceChannelSelectedPayload: o([{ json: 'selected', js: 'selected', typ: u(null, '') }], false),
    Fdc3UserInterfaceChannels: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceChannelsPayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceChannelsType') },
    ], false),
    Fdc3UserInterfaceChannelsPayload: o([
        { json: 'selected', js: 'selected', typ: u(null, '') },
        { json: 'userChannels', js: 'userChannels', typ: a(r('Channel')) },
    ], false),
    Fdc3UserInterfaceDrag: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceDragPayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceDragType') },
    ], false),
    Fdc3UserInterfaceDragPayload: o([{ json: 'mouseOffsets', js: 'mouseOffsets', typ: r('MouseOffsets') }], false),
    MouseOffsets: o([
        { json: 'x', js: 'x', typ: 0 },
        { json: 'y', js: 'y', typ: 0 },
    ], false),
    Fdc3UserInterfaceHandshake: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceHandshakePayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceHandshakeType') },
    ], false),
    Fdc3UserInterfaceHandshakePayload: o([{ json: 'fdc3Version', js: 'fdc3Version', typ: '' }], false),
    Fdc3UserInterfaceHello: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceHelloPayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceHelloType') },
    ], false),
    Fdc3UserInterfaceHelloPayload: o([
        { json: 'implementationDetails', js: 'implementationDetails', typ: '' },
        { json: 'initialCSS', js: 'initialCSS', typ: r('InitialCSS') },
    ], false),
    InitialCSS: o([
        { json: 'bottom', js: 'bottom', typ: u(undefined, '') },
        { json: 'height', js: 'height', typ: u(undefined, '') },
        { json: 'left', js: 'left', typ: u(undefined, '') },
        { json: 'maxHeight', js: 'maxHeight', typ: u(undefined, '') },
        { json: 'maxWidth', js: 'maxWidth', typ: u(undefined, '') },
        { json: 'right', js: 'right', typ: u(undefined, '') },
        { json: 'top', js: 'top', typ: u(undefined, '') },
        { json: 'transition', js: 'transition', typ: u(undefined, '') },
        { json: 'width', js: 'width', typ: u(undefined, '') },
        { json: 'zIndex', js: 'zIndex', typ: u(undefined, '') },
    ], 'any'),
    Fdc3UserInterfaceMessage: o([
        { json: 'payload', js: 'payload', typ: u(undefined, m('any')) },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceMessageType') },
    ], false),
    Fdc3UserInterfaceResolve: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceResolvePayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceResolveType') },
    ], false),
    Fdc3UserInterfaceResolvePayload: o([
        { json: 'appIntents', js: 'appIntents', typ: a(r('AppIntent')) },
        { json: 'context', js: 'context', typ: r('Context') },
    ], false),
    AppIntent: o([
        { json: 'apps', js: 'apps', typ: a(r('AppMetadata')) },
        { json: 'intent', js: 'intent', typ: r('IntentMetadata') },
    ], false),
    IntentMetadata: o([
        { json: 'displayName', js: 'displayName', typ: u(undefined, '') },
        { json: 'name', js: 'name', typ: '' },
    ], false),
    Fdc3UserInterfaceResolveAction: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceResolveActionPayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceResolveActionType') },
    ], false),
    Fdc3UserInterfaceResolveActionPayload: o([
        { json: 'action', js: 'action', typ: r('Action') },
        { json: 'appIdentifier', js: 'appIdentifier', typ: u(undefined, r('AppIdentifier')) },
        { json: 'intent', js: 'intent', typ: u(undefined, '') },
    ], false),
    Fdc3UserInterfaceRestyle: o([
        { json: 'payload', js: 'payload', typ: r('Fdc3UserInterfaceRestylePayload') },
        { json: 'type', js: 'type', typ: r('Fdc3UserInterfaceRestyleType') },
    ], false),
    Fdc3UserInterfaceRestylePayload: o([{ json: 'updatedCSS', js: 'updatedCSS', typ: r('UpdatedCSS') }], false),
    UpdatedCSS: o([
        { json: 'bottom', js: 'bottom', typ: u(undefined, '') },
        { json: 'height', js: 'height', typ: u(undefined, '') },
        { json: 'left', js: 'left', typ: u(undefined, '') },
        { json: 'maxHeight', js: 'maxHeight', typ: u(undefined, '') },
        { json: 'maxWidth', js: 'maxWidth', typ: u(undefined, '') },
        { json: 'right', js: 'right', typ: u(undefined, '') },
        { json: 'top', js: 'top', typ: u(undefined, '') },
        { json: 'transition', js: 'transition', typ: u(undefined, '') },
        { json: 'width', js: 'width', typ: u(undefined, '') },
        { json: 'zIndex', js: 'zIndex', typ: u(undefined, '') },
    ], 'any'),
    FindInstancesRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindInstancesRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindInstancesRequestType') },
    ], false),
    FindInstancesRequestPayload: o([{ json: 'app', js: 'app', typ: r('AppIdentifier') }], false),
    FindInstancesResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindInstancesResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindInstancesResponseType') },
    ], false),
    FindInstancesResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('FindInstancesErrors')) },
        { json: 'appIdentifiers', js: 'appIdentifiers', typ: u(undefined, a(r('AppMetadata'))) },
    ], false),
    FindIntentRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindIntentRequestType') },
    ], false),
    FindIntentRequestPayload: o([
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
        { json: 'intent', js: 'intent', typ: '' },
        { json: 'resultType', js: 'resultType', typ: u(undefined, '') },
    ], false),
    FindIntentResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentResponseType') },
    ], false),
    FindIntentResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('FindInstancesErrors')) },
        { json: 'appIntent', js: 'appIntent', typ: u(undefined, r('AppIntent')) },
    ], false),
    FindIntentsByContextRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextRequestType') },
    ], false),
    FindIntentsByContextRequestPayload: o([
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'resultType', js: 'resultType', typ: u(undefined, '') },
    ], false),
    FindIntentsByContextResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextResponseType') },
    ], false),
    FindIntentsByContextResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('FindInstancesErrors')) },
        { json: 'appIntents', js: 'appIntents', typ: u(undefined, a(r('AppIntent'))) },
    ], false),
    GetAppMetadataRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataRequestType') },
    ], false),
    GetAppMetadataRequestPayload: o([{ json: 'app', js: 'app', typ: r('AppIdentifier') }], false),
    GetAppMetadataResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataResponseType') },
    ], false),
    GetAppMetadataResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('FindInstancesErrors')) },
        { json: 'appMetadata', js: 'appMetadata', typ: u(undefined, r('AppMetadata')) },
    ], false),
    GetCurrentChannelRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetCurrentChannelRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetCurrentChannelRequestType') },
    ], false),
    GetCurrentChannelRequestPayload: o([], false),
    GetCurrentChannelResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetCurrentChannelResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetCurrentChannelResponseType') },
    ], false),
    GetCurrentChannelResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('ResponsePayloadError')) },
        { json: 'channel', js: 'channel', typ: u(undefined, u(r('Channel'), null)) },
    ], false),
    GetCurrentContextRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetCurrentContextRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetCurrentContextRequestType') },
    ], false),
    GetCurrentContextRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
    ], false),
    GetCurrentContextResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetCurrentContextResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetCurrentContextResponseType') },
    ], false),
    GetCurrentContextResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) },
        { json: 'context', js: 'context', typ: u(undefined, u(null, r('Context'))) },
    ], false),
    GetInfoRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetInfoRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetInfoRequestType') },
    ], false),
    GetInfoRequestPayload: o([], false),
    GetInfoResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetInfoResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetInfoResponseType') },
    ], false),
    GetInfoResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('ResponsePayloadError')) },
        { json: 'implementationMetadata', js: 'implementationMetadata', typ: u(undefined, r('ImplementationMetadata')) },
    ], false),
    GetOrCreateChannelRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetOrCreateChannelRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetOrCreateChannelRequestType') },
    ], false),
    GetOrCreateChannelRequestPayload: o([{ json: 'channelId', js: 'channelId', typ: '' }], false),
    GetOrCreateChannelResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetOrCreateChannelResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetOrCreateChannelResponseType') },
    ], false),
    GetOrCreateChannelResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) },
        { json: 'channel', js: 'channel', typ: u(undefined, r('Channel')) },
    ], false),
    GetUserChannelsRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetUserChannelsRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetUserChannelsRequestType') },
    ], false),
    GetUserChannelsRequestPayload: o([], false),
    GetUserChannelsResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetUserChannelsResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetUserChannelsResponseType') },
    ], false),
    GetUserChannelsResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) },
        { json: 'userChannels', js: 'userChannels', typ: u(undefined, a(r('Channel'))) },
    ], false),
    HeartbeatAcknowledgementRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('HeartbeatAcknowledgementRequestPayload') },
        { json: 'type', js: 'type', typ: r('HeartbeatAcknowledgementRequestType') },
    ], false),
    HeartbeatAcknowledgementRequestPayload: o([{ json: 'heartbeatEventUuid', js: 'heartbeatEventUuid', typ: '' }], false),
    HeartbeatEvent: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastEventMeta') },
        { json: 'payload', js: 'payload', typ: r('HeartbeatEventPayload') },
        { json: 'type', js: 'type', typ: r('HeartbeatEventType') },
    ], false),
    HeartbeatEventPayload: o([], false),
    IntentEvent: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastEventMeta') },
        { json: 'payload', js: 'payload', typ: r('IntentEventPayload') },
        { json: 'type', js: 'type', typ: r('IntentEventType') },
    ], false),
    IntentEventPayload: o([
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'intent', js: 'intent', typ: '' },
        { json: 'originatingApp', js: 'originatingApp', typ: u(undefined, r('AppIdentifier')) },
        { json: 'raiseIntentRequestUuid', js: 'raiseIntentRequestUuid', typ: '' },
    ], false),
    IntentListenerUnsubscribeRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('IntentListenerUnsubscribeRequestPayload') },
        { json: 'type', js: 'type', typ: r('IntentListenerUnsubscribeRequestType') },
    ], false),
    IntentListenerUnsubscribeRequestPayload: o([{ json: 'listenerUUID', js: 'listenerUUID', typ: '' }], false),
    IntentListenerUnsubscribeResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastResponseResponsePayload') },
        { json: 'type', js: 'type', typ: r('IntentListenerUnsubscribeResponseType') },
    ], false),
    IntentResultRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('IntentResultRequestPayload') },
        { json: 'type', js: 'type', typ: r('IntentResultRequestType') },
    ], false),
    IntentResultRequestPayload: o([
        { json: 'intentEventUuid', js: 'intentEventUuid', typ: '' },
        { json: 'intentResult', js: 'intentResult', typ: r('IntentResult') },
        { json: 'raiseIntentRequestUuid', js: 'raiseIntentRequestUuid', typ: '' },
    ], false),
    IntentResult: o([
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
        { json: 'channel', js: 'channel', typ: u(undefined, r('Channel')) },
    ], false),
    IntentResultResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastResponseResponsePayload') },
        { json: 'type', js: 'type', typ: r('IntentResultResponseType') },
    ], false),
    JoinUserChannelRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('JoinUserChannelRequestPayload') },
        { json: 'type', js: 'type', typ: r('JoinUserChannelRequestType') },
    ], false),
    JoinUserChannelRequestPayload: o([{ json: 'channelId', js: 'channelId', typ: '' }], false),
    JoinUserChannelResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('JoinUserChannelResponsePayload') },
        { json: 'type', js: 'type', typ: r('JoinUserChannelResponseType') },
    ], false),
    JoinUserChannelResponsePayload: o([{ json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) }], false),
    LeaveCurrentChannelRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('LeaveCurrentChannelRequestPayload') },
        { json: 'type', js: 'type', typ: r('LeaveCurrentChannelRequestType') },
    ], false),
    LeaveCurrentChannelRequestPayload: o([], false),
    LeaveCurrentChannelResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('LeaveCurrentChannelResponsePayload') },
        { json: 'type', js: 'type', typ: r('LeaveCurrentChannelResponseType') },
    ], false),
    LeaveCurrentChannelResponsePayload: o([{ json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) }], false),
    OpenRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenRequestPayload') },
        { json: 'type', js: 'type', typ: r('OpenRequestType') },
    ], false),
    OpenRequestPayload: o([
        { json: 'app', js: 'app', typ: r('AppIdentifier') },
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
    ], false),
    OpenResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenResponsePayload') },
        { json: 'type', js: 'type', typ: r('OpenResponseType') },
    ], false),
    OpenResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('OpenErrorResponsePayload')) },
        { json: 'appIdentifier', js: 'appIdentifier', typ: u(undefined, r('AppIdentifier')) },
    ], false),
    PrivateChannelAddEventListenerRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelAddEventListenerRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelAddEventListenerRequestType') },
    ], false),
    PrivateChannelAddEventListenerRequestPayload: o([
        { json: 'listenerType', js: 'listenerType', typ: u(r('PrivateChannelEventType'), null) },
        { json: 'privateChannelId', js: 'privateChannelId', typ: '' },
    ], false),
    PrivateChannelAddEventListenerResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelAddEventListenerResponsePayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelAddEventListenerResponseType') },
    ], false),
    PrivateChannelAddEventListenerResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) },
        { json: 'listenerUUID', js: 'listenerUUID', typ: u(undefined, '') },
    ], false),
    PrivateChannelDisconnectRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelDisconnectRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelDisconnectRequestType') },
    ], false),
    PrivateChannelDisconnectRequestPayload: o([{ json: 'channelId', js: 'channelId', typ: '' }], false),
    PrivateChannelDisconnectResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelDisconnectResponsePayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelDisconnectResponseType') },
    ], false),
    PrivateChannelDisconnectResponsePayload: o([{ json: 'error', js: 'error', typ: u(undefined, r('PurpleError')) }], false),
    PrivateChannelOnAddContextListenerEvent: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastEventMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnAddContextListenerEventPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnAddContextListenerEventType') },
    ], false),
    PrivateChannelOnAddContextListenerEventPayload: o([
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
        { json: 'privateChannelId', js: 'privateChannelId', typ: '' },
    ], false),
    PrivateChannelOnDisconnectEvent: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastEventMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnDisconnectEventPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnDisconnectEventType') },
    ], false),
    PrivateChannelOnDisconnectEventPayload: o([{ json: 'privateChannelId', js: 'privateChannelId', typ: '' }], false),
    PrivateChannelOnUnsubscribeEvent: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastEventMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnUnsubscribeEventPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnUnsubscribeEventType') },
    ], false),
    PrivateChannelOnUnsubscribeEventPayload: o([
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
        { json: 'privateChannelId', js: 'privateChannelId', typ: '' },
    ], false),
    PrivateChannelUnsubscribeEventListenerRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelUnsubscribeEventListenerRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelUnsubscribeEventListenerRequestType') },
    ], false),
    PrivateChannelUnsubscribeEventListenerRequestPayload: o([{ json: 'listenerUUID', js: 'listenerUUID', typ: '' }], false),
    PrivateChannelUnsubscribeEventListenerResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastResponseResponsePayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelUnsubscribeEventListenerResponseType') },
    ], false),
    RaiseIntentForContextRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentForContextRequestPayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentForContextRequestType') },
    ], false),
    RaiseIntentForContextRequestPayload: o([
        { json: 'app', js: 'app', typ: u(undefined, r('AppIdentifier')) },
        { json: 'context', js: 'context', typ: r('Context') },
    ], false),
    RaiseIntentForContextResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentForContextResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentForContextResponseType') },
    ], false),
    RaiseIntentForContextResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('FindInstancesErrors')) },
        { json: 'intentResolution', js: 'intentResolution', typ: u(undefined, r('IntentResolution')) },
        { json: 'appIntents', js: 'appIntents', typ: u(undefined, a(r('AppIntent'))) },
    ], false),
    IntentResolution: o([
        { json: 'intent', js: 'intent', typ: '' },
        { json: 'source', js: 'source', typ: r('AppIdentifier') },
    ], false),
    RaiseIntentRequest: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentRequestPayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentRequestType') },
    ], false),
    RaiseIntentRequestPayload: o([
        { json: 'app', js: 'app', typ: u(undefined, r('AppIdentifier')) },
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'intent', js: 'intent', typ: '' },
    ], false),
    RaiseIntentResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentResponseType') },
    ], false),
    RaiseIntentResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('FindInstancesErrors')) },
        { json: 'intentResolution', js: 'intentResolution', typ: u(undefined, r('IntentResolution')) },
        { json: 'appIntent', js: 'appIntent', typ: u(undefined, r('AppIntent')) },
    ], false),
    RaiseIntentResultResponse: o([
        { json: 'meta', js: 'meta', typ: r('AddContextListenerResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentResultResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentResultResponseType') },
    ], false),
    RaiseIntentResultResponsePayload: o([
        { json: 'error', js: 'error', typ: u(undefined, r('ResponsePayloadError')) },
        { json: 'intentResult', js: 'intentResult', typ: u(undefined, r('IntentResult')) },
    ], false),
    WebConnectionProtocol1HelloType: ['WCP1Hello'],
    WebConnectionProtocol2LoadURLType: ['WCP2LoadUrl'],
    WebConnectionProtocol3HandshakeType: ['WCP3Handshake'],
    WebConnectionProtocol4ValidateAppIdentityType: ['WCP4ValidateAppIdentity'],
    WebConnectionProtocol5ValidateAppIdentityFailedResponseType: ['WCP5ValidateAppIdentityFailedResponse'],
    WebConnectionProtocol5ValidateAppIdentitySuccessResponseType: ['WCP5ValidateAppIdentityResponse'],
    WebConnectionProtocol6GoodbyeType: ['WCP6Goodbye'],
    ConnectionStepMessageType: [
        'WCP1Hello',
        'WCP2LoadUrl',
        'WCP3Handshake',
        'WCP4ValidateAppIdentity',
        'WCP5ValidateAppIdentityFailedResponse',
        'WCP5ValidateAppIdentityResponse',
        'WCP6Goodbye',
    ],
    AddContextListenerRequestType: ['addContextListenerRequest'],
    PurpleError: [
        'ApiTimeout',
        'AccessDenied',
        'CreationFailed',
        'InvalidArguments',
        'MalformedContext',
        'NoChannelFound',
    ],
    AddContextListenerResponseType: ['addContextListenerResponse'],
    FDC3EventType: ['USER_CHANNEL_CHANGED'],
    AddEventListenerRequestType: ['addEventListenerRequest'],
    ResponsePayloadError: [
        'ApiTimeout',
        'AccessDenied',
        'AgentDisconnected',
        'AppNotFound',
        'AppTimeout',
        'CreationFailed',
        'DesktopAgentNotFound',
        'ErrorOnLaunch',
        'IntentDeliveryFailed',
        'IntentHandlerRejected',
        'IntentListenerConflict',
        'InvalidArguments',
        'MalformedContext',
        'MalformedMessage',
        'NoAppsFound',
        'NoChannelFound',
        'NoResultReturned',
        'NotConnectedToBridge',
        'ResolverTimeout',
        'ResolverUnavailable',
        'ResponseToBridgeTimedOut',
        'TargetAppUnavailable',
        'TargetInstanceUnavailable',
        'UserCancelledResolution',
    ],
    AddEventListenerResponseType: ['addEventListenerResponse'],
    AddIntentListenerRequestType: ['addIntentListenerRequest'],
    FluffyError: [
        'ApiTimeout',
        'DesktopAgentNotFound',
        'IntentDeliveryFailed',
        'IntentListenerConflict',
        'InvalidArguments',
        'MalformedContext',
        'NoAppsFound',
        'ResolverTimeout',
        'ResolverUnavailable',
        'TargetAppUnavailable',
        'TargetInstanceUnavailable',
        'UserCancelledResolution',
    ],
    AddIntentListenerResponseType: ['addIntentListenerResponse'],
    EventMessageType: [
        'addEventListenerEvent',
        'broadcastEvent',
        'channelChangedEvent',
        'heartbeatEvent',
        'intentEvent',
        'privateChannelOnAddContextListenerEvent',
        'privateChannelOnDisconnectEvent',
        'privateChannelOnUnsubscribeEvent',
    ],
    ResponseMessageType: [
        'addContextListenerResponse',
        'addEventListenerResponse',
        'addIntentListenerResponse',
        'broadcastResponse',
        'contextListenerUnsubscribeResponse',
        'createPrivateChannelResponse',
        'eventListenerUnsubscribeResponse',
        'findInstancesResponse',
        'findIntentResponse',
        'findIntentsByContextResponse',
        'getAppMetadataResponse',
        'getCurrentChannelResponse',
        'getCurrentContextResponse',
        'getInfoResponse',
        'getOrCreateChannelResponse',
        'getUserChannelsResponse',
        'intentListenerUnsubscribeResponse',
        'intentResultResponse',
        'joinUserChannelResponse',
        'leaveCurrentChannelResponse',
        'openResponse',
        'privateChannelAddEventListenerResponse',
        'privateChannelDisconnectResponse',
        'privateChannelUnsubscribeEventListenerResponse',
        'raiseIntentForContextResponse',
        'raiseIntentResponse',
        'raiseIntentResultResponse',
    ],
    RequestMessageType: [
        'addContextListenerRequest',
        'addEventListenerRequest',
        'addIntentListenerRequest',
        'broadcastRequest',
        'contextListenerUnsubscribeRequest',
        'createPrivateChannelRequest',
        'eventListenerUnsubscribeRequest',
        'findInstancesRequest',
        'findIntentRequest',
        'findIntentsByContextRequest',
        'getAppMetadataRequest',
        'getCurrentChannelRequest',
        'getCurrentContextRequest',
        'getInfoRequest',
        'getOrCreateChannelRequest',
        'getUserChannelsRequest',
        'heartbeatAcknowledgementRequest',
        'intentListenerUnsubscribeRequest',
        'intentResultRequest',
        'joinUserChannelRequest',
        'leaveCurrentChannelRequest',
        'openRequest',
        'privateChannelAddEventListenerRequest',
        'privateChannelDisconnectRequest',
        'privateChannelUnsubscribeEventListenerRequest',
        'raiseIntentForContextRequest',
        'raiseIntentRequest',
    ],
    BroadcastEventType: ['broadcastEvent'],
    BroadcastRequestType: ['broadcastRequest'],
    BroadcastResponseType: ['broadcastResponse'],
    ChannelChangedEventType: ['channelChangedEvent'],
    ContextListenerUnsubscribeRequestType: ['contextListenerUnsubscribeRequest'],
    ContextListenerUnsubscribeResponseType: ['contextListenerUnsubscribeResponse'],
    CreatePrivateChannelRequestType: ['createPrivateChannelRequest'],
    Type: ['app', 'private', 'user'],
    CreatePrivateChannelResponseType: ['createPrivateChannelResponse'],
    EventListenerUnsubscribeRequestType: ['eventListenerUnsubscribeRequest'],
    EventListenerUnsubscribeResponseType: ['eventListenerUnsubscribeResponse'],
    Fdc3UserInterfaceChannelSelectedType: ['Fdc3UserInterfaceChannelSelected'],
    Fdc3UserInterfaceChannelsType: ['Fdc3UserInterfaceChannels'],
    Fdc3UserInterfaceDragType: ['Fdc3UserInterfaceDrag'],
    Fdc3UserInterfaceHandshakeType: ['Fdc3UserInterfaceHandshake'],
    Fdc3UserInterfaceHelloType: ['Fdc3UserInterfaceHello'],
    Fdc3UserInterfaceMessageType: [
        'Fdc3UserInterfaceChannelSelected',
        'Fdc3UserInterfaceChannels',
        'Fdc3UserInterfaceDrag',
        'Fdc3UserInterfaceHandshake',
        'Fdc3UserInterfaceHello',
        'Fdc3UserInterfaceResolve',
        'Fdc3UserInterfaceResolveAction',
        'Fdc3UserInterfaceRestyle',
    ],
    Fdc3UserInterfaceResolveType: ['Fdc3UserInterfaceResolve'],
    Action: ['cancel', 'click', 'hover'],
    Fdc3UserInterfaceResolveActionType: ['Fdc3UserInterfaceResolveAction'],
    Fdc3UserInterfaceRestyleType: ['Fdc3UserInterfaceRestyle'],
    FindInstancesRequestType: ['findInstancesRequest'],
    FindInstancesErrors: [
        'ApiTimeout',
        'AgentDisconnected',
        'DesktopAgentNotFound',
        'IntentDeliveryFailed',
        'IntentListenerConflict',
        'InvalidArguments',
        'MalformedContext',
        'MalformedMessage',
        'NoAppsFound',
        'NotConnectedToBridge',
        'ResolverTimeout',
        'ResolverUnavailable',
        'ResponseToBridgeTimedOut',
        'TargetAppUnavailable',
        'TargetInstanceUnavailable',
        'UserCancelledResolution',
    ],
    FindInstancesResponseType: ['findInstancesResponse'],
    FindIntentRequestType: ['findIntentRequest'],
    FindIntentResponseType: ['findIntentResponse'],
    FindIntentsByContextRequestType: ['findIntentsByContextRequest'],
    FindIntentsByContextResponseType: ['findIntentsByContextResponse'],
    GetAppMetadataRequestType: ['getAppMetadataRequest'],
    GetAppMetadataResponseType: ['getAppMetadataResponse'],
    GetCurrentChannelRequestType: ['getCurrentChannelRequest'],
    GetCurrentChannelResponseType: ['getCurrentChannelResponse'],
    GetCurrentContextRequestType: ['getCurrentContextRequest'],
    GetCurrentContextResponseType: ['getCurrentContextResponse'],
    GetInfoRequestType: ['getInfoRequest'],
    GetInfoResponseType: ['getInfoResponse'],
    GetOrCreateChannelRequestType: ['getOrCreateChannelRequest'],
    GetOrCreateChannelResponseType: ['getOrCreateChannelResponse'],
    GetUserChannelsRequestType: ['getUserChannelsRequest'],
    GetUserChannelsResponseType: ['getUserChannelsResponse'],
    HeartbeatAcknowledgementRequestType: ['heartbeatAcknowledgementRequest'],
    HeartbeatEventType: ['heartbeatEvent'],
    IntentEventType: ['intentEvent'],
    IntentListenerUnsubscribeRequestType: ['intentListenerUnsubscribeRequest'],
    IntentListenerUnsubscribeResponseType: ['intentListenerUnsubscribeResponse'],
    IntentResultRequestType: ['intentResultRequest'],
    IntentResultResponseType: ['intentResultResponse'],
    JoinUserChannelRequestType: ['joinUserChannelRequest'],
    JoinUserChannelResponseType: ['joinUserChannelResponse'],
    LeaveCurrentChannelRequestType: ['leaveCurrentChannelRequest'],
    LeaveCurrentChannelResponseType: ['leaveCurrentChannelResponse'],
    OpenRequestType: ['openRequest'],
    OpenErrorResponsePayload: [
        'ApiTimeout',
        'AgentDisconnected',
        'AppNotFound',
        'AppTimeout',
        'DesktopAgentNotFound',
        'ErrorOnLaunch',
        'InvalidArguments',
        'MalformedContext',
        'MalformedMessage',
        'NotConnectedToBridge',
        'ResolverUnavailable',
        'ResponseToBridgeTimedOut',
    ],
    OpenResponseType: ['openResponse'],
    PrivateChannelEventType: ['addContextListener', 'disconnect', 'unsubscribe'],
    PrivateChannelAddEventListenerRequestType: ['privateChannelAddEventListenerRequest'],
    PrivateChannelAddEventListenerResponseType: ['privateChannelAddEventListenerResponse'],
    PrivateChannelDisconnectRequestType: ['privateChannelDisconnectRequest'],
    PrivateChannelDisconnectResponseType: ['privateChannelDisconnectResponse'],
    PrivateChannelOnAddContextListenerEventType: ['privateChannelOnAddContextListenerEvent'],
    PrivateChannelOnDisconnectEventType: ['privateChannelOnDisconnectEvent'],
    PrivateChannelOnUnsubscribeEventType: ['privateChannelOnUnsubscribeEvent'],
    PrivateChannelUnsubscribeEventListenerRequestType: ['privateChannelUnsubscribeEventListenerRequest'],
    PrivateChannelUnsubscribeEventListenerResponseType: ['privateChannelUnsubscribeEventListenerResponse'],
    RaiseIntentForContextRequestType: ['raiseIntentForContextRequest'],
    RaiseIntentForContextResponseType: ['raiseIntentForContextResponse'],
    RaiseIntentRequestType: ['raiseIntentRequest'],
    RaiseIntentResponseType: ['raiseIntentResponse'],
    RaiseIntentResultResponseType: ['raiseIntentResultResponse'],
};
/**
 * Returns true if the value has a type property with value 'WCP1Hello'. This is a fast check that does not check the format of the message
 */
function isWebConnectionProtocol1Hello(value) {
    return value != null && value.type === 'WCP1Hello';
}
/**
 * Returns true if value is a valid WebConnectionProtocol1Hello. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocol1Hello(value) {
    try {
        Convert.webConnectionProtocol1HelloToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL1_HELLO_TYPE = 'WebConnectionProtocol1Hello';
/**
 * Returns true if the value has a type property with value 'WCP2LoadUrl'. This is a fast check that does not check the format of the message
 */
function isWebConnectionProtocol2LoadURL(value) {
    return value != null && value.type === 'WCP2LoadUrl';
}
/**
 * Returns true if value is a valid WebConnectionProtocol2LoadURL. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocol2LoadURL(value) {
    try {
        Convert.webConnectionProtocol2LoadURLToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL2_LOAD_U_R_L_TYPE = 'WebConnectionProtocol2LoadURL';
/**
 * Returns true if the value has a type property with value 'WCP3Handshake'. This is a fast check that does not check the format of the message
 */
function isWebConnectionProtocol3Handshake(value) {
    return value != null && value.type === 'WCP3Handshake';
}
/**
 * Returns true if value is a valid WebConnectionProtocol3Handshake. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocol3Handshake(value) {
    try {
        Convert.webConnectionProtocol3HandshakeToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL3_HANDSHAKE_TYPE = 'WebConnectionProtocol3Handshake';
/**
 * Returns true if the value has a type property with value 'WCP4ValidateAppIdentity'. This is a fast check that does not check the format of the message
 */
function isWebConnectionProtocol4ValidateAppIdentity(value) {
    return value != null && value.type === 'WCP4ValidateAppIdentity';
}
/**
 * Returns true if value is a valid WebConnectionProtocol4ValidateAppIdentity. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocol4ValidateAppIdentity(value) {
    try {
        Convert.webConnectionProtocol4ValidateAppIdentityToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL4_VALIDATE_APP_IDENTITY_TYPE = 'WebConnectionProtocol4ValidateAppIdentity';
/**
 * Returns true if the value has a type property with value 'WCP5ValidateAppIdentityFailedResponse'. This is a fast check that does not check the format of the message
 */
function isWebConnectionProtocol5ValidateAppIdentityFailedResponse(value) {
    return value != null && value.type === 'WCP5ValidateAppIdentityFailedResponse';
}
/**
 * Returns true if value is a valid WebConnectionProtocol5ValidateAppIdentityFailedResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocol5ValidateAppIdentityFailedResponse(value) {
    try {
        Convert.webConnectionProtocol5ValidateAppIdentityFailedResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL5_VALIDATE_APP_IDENTITY_FAILED_RESPONSE_TYPE = 'WebConnectionProtocol5ValidateAppIdentityFailedResponse';
/**
 * Returns true if the value has a type property with value 'WCP5ValidateAppIdentityResponse'. This is a fast check that does not check the format of the message
 */
function isWebConnectionProtocol5ValidateAppIdentitySuccessResponse(value) {
    return value != null && value.type === 'WCP5ValidateAppIdentityResponse';
}
/**
 * Returns true if value is a valid WebConnectionProtocol5ValidateAppIdentitySuccessResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocol5ValidateAppIdentitySuccessResponse(value) {
    try {
        Convert.webConnectionProtocol5ValidateAppIdentitySuccessResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL5_VALIDATE_APP_IDENTITY_SUCCESS_RESPONSE_TYPE = 'WebConnectionProtocol5ValidateAppIdentitySuccessResponse';
/**
 * Returns true if the value has a type property with value 'WCP6Goodbye'. This is a fast check that does not check the format of the message
 */
function isWebConnectionProtocol6Goodbye(value) {
    return value != null && value.type === 'WCP6Goodbye';
}
/**
 * Returns true if value is a valid WebConnectionProtocol6Goodbye. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocol6Goodbye(value) {
    try {
        Convert.webConnectionProtocol6GoodbyeToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL6_GOODBYE_TYPE = 'WebConnectionProtocol6Goodbye';
/**
 * Returns true if value is a valid WebConnectionProtocolMessage. This checks the type against the json schema for the message and will be slower
 */
function isValidWebConnectionProtocolMessage(value) {
    try {
        Convert.webConnectionProtocolMessageToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const WEB_CONNECTION_PROTOCOL_MESSAGE_TYPE = 'WebConnectionProtocolMessage';
/**
 * Returns true if the value has a type property with value 'addContextListenerRequest'. This is a fast check that does not check the format of the message
 */
function isAddContextListenerRequest(value) {
    return value != null && value.type === 'addContextListenerRequest';
}
/**
 * Returns true if value is a valid AddContextListenerRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidAddContextListenerRequest(value) {
    try {
        Convert.addContextListenerRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const ADD_CONTEXT_LISTENER_REQUEST_TYPE = 'AddContextListenerRequest';
/**
 * Returns true if the value has a type property with value 'addContextListenerResponse'. This is a fast check that does not check the format of the message
 */
function isAddContextListenerResponse(value) {
    return value != null && value.type === 'addContextListenerResponse';
}
/**
 * Returns true if value is a valid AddContextListenerResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidAddContextListenerResponse(value) {
    try {
        Convert.addContextListenerResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const ADD_CONTEXT_LISTENER_RESPONSE_TYPE = 'AddContextListenerResponse';
/**
 * Returns true if the value has a type property with value 'addEventListenerRequest'. This is a fast check that does not check the format of the message
 */
function isAddEventListenerRequest(value) {
    return value != null && value.type === 'addEventListenerRequest';
}
/**
 * Returns true if value is a valid AddEventListenerRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidAddEventListenerRequest(value) {
    try {
        Convert.addEventListenerRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const ADD_EVENT_LISTENER_REQUEST_TYPE = 'AddEventListenerRequest';
/**
 * Returns true if the value has a type property with value 'addEventListenerResponse'. This is a fast check that does not check the format of the message
 */
function isAddEventListenerResponse(value) {
    return value != null && value.type === 'addEventListenerResponse';
}
/**
 * Returns true if value is a valid AddEventListenerResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidAddEventListenerResponse(value) {
    try {
        Convert.addEventListenerResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const ADD_EVENT_LISTENER_RESPONSE_TYPE = 'AddEventListenerResponse';
/**
 * Returns true if the value has a type property with value 'addIntentListenerRequest'. This is a fast check that does not check the format of the message
 */
function isAddIntentListenerRequest(value) {
    return value != null && value.type === 'addIntentListenerRequest';
}
/**
 * Returns true if value is a valid AddIntentListenerRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidAddIntentListenerRequest(value) {
    try {
        Convert.addIntentListenerRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const ADD_INTENT_LISTENER_REQUEST_TYPE = 'AddIntentListenerRequest';
/**
 * Returns true if the value has a type property with value 'addIntentListenerResponse'. This is a fast check that does not check the format of the message
 */
function isAddIntentListenerResponse(value) {
    return value != null && value.type === 'addIntentListenerResponse';
}
/**
 * Returns true if value is a valid AddIntentListenerResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidAddIntentListenerResponse(value) {
    try {
        Convert.addIntentListenerResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const ADD_INTENT_LISTENER_RESPONSE_TYPE = 'AddIntentListenerResponse';
/**
 * Returns true if the value has a type property with value 'broadcastEvent'. This is a fast check that does not check the format of the message
 */
function isBroadcastEvent(value) {
    return value != null && value.type === 'broadcastEvent';
}
/**
 * Returns true if value is a valid BroadcastEvent. This checks the type against the json schema for the message and will be slower
 */
function isValidBroadcastEvent(value) {
    try {
        Convert.broadcastEventToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const BROADCAST_EVENT_TYPE = 'BroadcastEvent';
/**
 * Returns true if the value has a type property with value 'broadcastRequest'. This is a fast check that does not check the format of the message
 */
function isBroadcastRequest(value) {
    return value != null && value.type === 'broadcastRequest';
}
/**
 * Returns true if value is a valid BroadcastRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidBroadcastRequest(value) {
    try {
        Convert.broadcastRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const BROADCAST_REQUEST_TYPE = 'BroadcastRequest';
/**
 * Returns true if the value has a type property with value 'broadcastResponse'. This is a fast check that does not check the format of the message
 */
function isBroadcastResponse(value) {
    return value != null && value.type === 'broadcastResponse';
}
/**
 * Returns true if value is a valid BroadcastResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidBroadcastResponse(value) {
    try {
        Convert.broadcastResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const BROADCAST_RESPONSE_TYPE = 'BroadcastResponse';
/**
 * Returns true if the value has a type property with value 'channelChangedEvent'. This is a fast check that does not check the format of the message
 */
function isChannelChangedEvent(value) {
    return value != null && value.type === 'channelChangedEvent';
}
/**
 * Returns true if value is a valid ChannelChangedEvent. This checks the type against the json schema for the message and will be slower
 */
function isValidChannelChangedEvent(value) {
    try {
        Convert.channelChangedEventToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const CHANNEL_CHANGED_EVENT_TYPE = 'ChannelChangedEvent';
/**
 * Returns true if the value has a type property with value 'contextListenerUnsubscribeRequest'. This is a fast check that does not check the format of the message
 */
function isContextListenerUnsubscribeRequest(value) {
    return value != null && value.type === 'contextListenerUnsubscribeRequest';
}
/**
 * Returns true if value is a valid ContextListenerUnsubscribeRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidContextListenerUnsubscribeRequest(value) {
    try {
        Convert.contextListenerUnsubscribeRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const CONTEXT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE = 'ContextListenerUnsubscribeRequest';
/**
 * Returns true if the value has a type property with value 'contextListenerUnsubscribeResponse'. This is a fast check that does not check the format of the message
 */
function isContextListenerUnsubscribeResponse(value) {
    return value != null && value.type === 'contextListenerUnsubscribeResponse';
}
/**
 * Returns true if value is a valid ContextListenerUnsubscribeResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidContextListenerUnsubscribeResponse(value) {
    try {
        Convert.contextListenerUnsubscribeResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const CONTEXT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE = 'ContextListenerUnsubscribeResponse';
/**
 * Returns true if the value has a type property with value 'createPrivateChannelRequest'. This is a fast check that does not check the format of the message
 */
function isCreatePrivateChannelRequest(value) {
    return value != null && value.type === 'createPrivateChannelRequest';
}
/**
 * Returns true if value is a valid CreatePrivateChannelRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidCreatePrivateChannelRequest(value) {
    try {
        Convert.createPrivateChannelRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const CREATE_PRIVATE_CHANNEL_REQUEST_TYPE = 'CreatePrivateChannelRequest';
/**
 * Returns true if the value has a type property with value 'createPrivateChannelResponse'. This is a fast check that does not check the format of the message
 */
function isCreatePrivateChannelResponse(value) {
    return value != null && value.type === 'createPrivateChannelResponse';
}
/**
 * Returns true if value is a valid CreatePrivateChannelResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidCreatePrivateChannelResponse(value) {
    try {
        Convert.createPrivateChannelResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const CREATE_PRIVATE_CHANNEL_RESPONSE_TYPE = 'CreatePrivateChannelResponse';
/**
 * Returns true if the value has a type property with value 'eventListenerUnsubscribeRequest'. This is a fast check that does not check the format of the message
 */
function isEventListenerUnsubscribeRequest(value) {
    return value != null && value.type === 'eventListenerUnsubscribeRequest';
}
/**
 * Returns true if value is a valid EventListenerUnsubscribeRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidEventListenerUnsubscribeRequest(value) {
    try {
        Convert.eventListenerUnsubscribeRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const EVENT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE = 'EventListenerUnsubscribeRequest';
/**
 * Returns true if the value has a type property with value 'eventListenerUnsubscribeResponse'. This is a fast check that does not check the format of the message
 */
function isEventListenerUnsubscribeResponse(value) {
    return value != null && value.type === 'eventListenerUnsubscribeResponse';
}
/**
 * Returns true if value is a valid EventListenerUnsubscribeResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidEventListenerUnsubscribeResponse(value) {
    try {
        Convert.eventListenerUnsubscribeResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const EVENT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE = 'EventListenerUnsubscribeResponse';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceChannelSelected'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceChannelSelected(value) {
    return value != null && value.type === 'Fdc3UserInterfaceChannelSelected';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceChannelSelected. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceChannelSelected(value) {
    try {
        Convert.fdc3UserInterfaceChannelSelectedToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_CHANNEL_SELECTED_TYPE = 'Fdc3UserInterfaceChannelSelected';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceChannels'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceChannels(value) {
    return value != null && value.type === 'Fdc3UserInterfaceChannels';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceChannels. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceChannels(value) {
    try {
        Convert.fdc3UserInterfaceChannelsToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_CHANNELS_TYPE = 'Fdc3UserInterfaceChannels';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceDrag'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceDrag(value) {
    return value != null && value.type === 'Fdc3UserInterfaceDrag';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceDrag. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceDrag(value) {
    try {
        Convert.fdc3UserInterfaceDragToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_DRAG_TYPE = 'Fdc3UserInterfaceDrag';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceHandshake'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceHandshake(value) {
    return value != null && value.type === 'Fdc3UserInterfaceHandshake';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceHandshake. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceHandshake(value) {
    try {
        Convert.fdc3UserInterfaceHandshakeToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_HANDSHAKE_TYPE = 'Fdc3UserInterfaceHandshake';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceHello'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceHello(value) {
    return value != null && value.type === 'Fdc3UserInterfaceHello';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceHello. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceHello(value) {
    try {
        Convert.fdc3UserInterfaceHelloToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_HELLO_TYPE = 'Fdc3UserInterfaceHello';
/**
 * Returns true if value is a valid Fdc3UserInterfaceMessage. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceMessage(value) {
    try {
        Convert.fdc3UserInterfaceMessageToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_MESSAGE_TYPE = 'Fdc3UserInterfaceMessage';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceResolve'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceResolve(value) {
    return value != null && value.type === 'Fdc3UserInterfaceResolve';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceResolve. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceResolve(value) {
    try {
        Convert.fdc3UserInterfaceResolveToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_RESOLVE_TYPE = 'Fdc3UserInterfaceResolve';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceResolveAction'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceResolveAction(value) {
    return value != null && value.type === 'Fdc3UserInterfaceResolveAction';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceResolveAction. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceResolveAction(value) {
    try {
        Convert.fdc3UserInterfaceResolveActionToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_RESOLVE_ACTION_TYPE = 'Fdc3UserInterfaceResolveAction';
/**
 * Returns true if the value has a type property with value 'Fdc3UserInterfaceRestyle'. This is a fast check that does not check the format of the message
 */
function isFdc3UserInterfaceRestyle(value) {
    return value != null && value.type === 'Fdc3UserInterfaceRestyle';
}
/**
 * Returns true if value is a valid Fdc3UserInterfaceRestyle. This checks the type against the json schema for the message and will be slower
 */
function isValidFdc3UserInterfaceRestyle(value) {
    try {
        Convert.fdc3UserInterfaceRestyleToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FDC3_USER_INTERFACE_RESTYLE_TYPE = 'Fdc3UserInterfaceRestyle';
/**
 * Returns true if the value has a type property with value 'findInstancesRequest'. This is a fast check that does not check the format of the message
 */
function isFindInstancesRequest(value) {
    return value != null && value.type === 'findInstancesRequest';
}
/**
 * Returns true if value is a valid FindInstancesRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidFindInstancesRequest(value) {
    try {
        Convert.findInstancesRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FIND_INSTANCES_REQUEST_TYPE = 'FindInstancesRequest';
/**
 * Returns true if the value has a type property with value 'findInstancesResponse'. This is a fast check that does not check the format of the message
 */
function isFindInstancesResponse(value) {
    return value != null && value.type === 'findInstancesResponse';
}
/**
 * Returns true if value is a valid FindInstancesResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidFindInstancesResponse(value) {
    try {
        Convert.findInstancesResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FIND_INSTANCES_RESPONSE_TYPE = 'FindInstancesResponse';
/**
 * Returns true if the value has a type property with value 'findIntentRequest'. This is a fast check that does not check the format of the message
 */
function isFindIntentRequest(value) {
    return value != null && value.type === 'findIntentRequest';
}
/**
 * Returns true if value is a valid FindIntentRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidFindIntentRequest(value) {
    try {
        Convert.findIntentRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FIND_INTENT_REQUEST_TYPE = 'FindIntentRequest';
/**
 * Returns true if the value has a type property with value 'findIntentResponse'. This is a fast check that does not check the format of the message
 */
function isFindIntentResponse(value) {
    return value != null && value.type === 'findIntentResponse';
}
/**
 * Returns true if value is a valid FindIntentResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidFindIntentResponse(value) {
    try {
        Convert.findIntentResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FIND_INTENT_RESPONSE_TYPE = 'FindIntentResponse';
/**
 * Returns true if the value has a type property with value 'findIntentsByContextRequest'. This is a fast check that does not check the format of the message
 */
function isFindIntentsByContextRequest(value) {
    return value != null && value.type === 'findIntentsByContextRequest';
}
/**
 * Returns true if value is a valid FindIntentsByContextRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidFindIntentsByContextRequest(value) {
    try {
        Convert.findIntentsByContextRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FIND_INTENTS_BY_CONTEXT_REQUEST_TYPE = 'FindIntentsByContextRequest';
/**
 * Returns true if the value has a type property with value 'findIntentsByContextResponse'. This is a fast check that does not check the format of the message
 */
function isFindIntentsByContextResponse(value) {
    return value != null && value.type === 'findIntentsByContextResponse';
}
/**
 * Returns true if value is a valid FindIntentsByContextResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidFindIntentsByContextResponse(value) {
    try {
        Convert.findIntentsByContextResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const FIND_INTENTS_BY_CONTEXT_RESPONSE_TYPE = 'FindIntentsByContextResponse';
/**
 * Returns true if the value has a type property with value 'getAppMetadataRequest'. This is a fast check that does not check the format of the message
 */
function isGetAppMetadataRequest(value) {
    return value != null && value.type === 'getAppMetadataRequest';
}
/**
 * Returns true if value is a valid GetAppMetadataRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidGetAppMetadataRequest(value) {
    try {
        Convert.getAppMetadataRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_APP_METADATA_REQUEST_TYPE = 'GetAppMetadataRequest';
/**
 * Returns true if the value has a type property with value 'getAppMetadataResponse'. This is a fast check that does not check the format of the message
 */
function isGetAppMetadataResponse(value) {
    return value != null && value.type === 'getAppMetadataResponse';
}
/**
 * Returns true if value is a valid GetAppMetadataResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidGetAppMetadataResponse(value) {
    try {
        Convert.getAppMetadataResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_APP_METADATA_RESPONSE_TYPE = 'GetAppMetadataResponse';
/**
 * Returns true if the value has a type property with value 'getCurrentChannelRequest'. This is a fast check that does not check the format of the message
 */
function isGetCurrentChannelRequest(value) {
    return value != null && value.type === 'getCurrentChannelRequest';
}
/**
 * Returns true if value is a valid GetCurrentChannelRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidGetCurrentChannelRequest(value) {
    try {
        Convert.getCurrentChannelRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_CURRENT_CHANNEL_REQUEST_TYPE = 'GetCurrentChannelRequest';
/**
 * Returns true if the value has a type property with value 'getCurrentChannelResponse'. This is a fast check that does not check the format of the message
 */
function isGetCurrentChannelResponse(value) {
    return value != null && value.type === 'getCurrentChannelResponse';
}
/**
 * Returns true if value is a valid GetCurrentChannelResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidGetCurrentChannelResponse(value) {
    try {
        Convert.getCurrentChannelResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_CURRENT_CHANNEL_RESPONSE_TYPE = 'GetCurrentChannelResponse';
/**
 * Returns true if the value has a type property with value 'getCurrentContextRequest'. This is a fast check that does not check the format of the message
 */
function isGetCurrentContextRequest(value) {
    return value != null && value.type === 'getCurrentContextRequest';
}
/**
 * Returns true if value is a valid GetCurrentContextRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidGetCurrentContextRequest(value) {
    try {
        Convert.getCurrentContextRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_CURRENT_CONTEXT_REQUEST_TYPE = 'GetCurrentContextRequest';
/**
 * Returns true if the value has a type property with value 'getCurrentContextResponse'. This is a fast check that does not check the format of the message
 */
function isGetCurrentContextResponse(value) {
    return value != null && value.type === 'getCurrentContextResponse';
}
/**
 * Returns true if value is a valid GetCurrentContextResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidGetCurrentContextResponse(value) {
    try {
        Convert.getCurrentContextResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_CURRENT_CONTEXT_RESPONSE_TYPE = 'GetCurrentContextResponse';
/**
 * Returns true if the value has a type property with value 'getInfoRequest'. This is a fast check that does not check the format of the message
 */
function isGetInfoRequest(value) {
    return value != null && value.type === 'getInfoRequest';
}
/**
 * Returns true if value is a valid GetInfoRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidGetInfoRequest(value) {
    try {
        Convert.getInfoRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_INFO_REQUEST_TYPE = 'GetInfoRequest';
/**
 * Returns true if the value has a type property with value 'getInfoResponse'. This is a fast check that does not check the format of the message
 */
function isGetInfoResponse(value) {
    return value != null && value.type === 'getInfoResponse';
}
/**
 * Returns true if value is a valid GetInfoResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidGetInfoResponse(value) {
    try {
        Convert.getInfoResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_INFO_RESPONSE_TYPE = 'GetInfoResponse';
/**
 * Returns true if the value has a type property with value 'getOrCreateChannelRequest'. This is a fast check that does not check the format of the message
 */
function isGetOrCreateChannelRequest(value) {
    return value != null && value.type === 'getOrCreateChannelRequest';
}
/**
 * Returns true if value is a valid GetOrCreateChannelRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidGetOrCreateChannelRequest(value) {
    try {
        Convert.getOrCreateChannelRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_OR_CREATE_CHANNEL_REQUEST_TYPE = 'GetOrCreateChannelRequest';
/**
 * Returns true if the value has a type property with value 'getOrCreateChannelResponse'. This is a fast check that does not check the format of the message
 */
function isGetOrCreateChannelResponse(value) {
    return value != null && value.type === 'getOrCreateChannelResponse';
}
/**
 * Returns true if value is a valid GetOrCreateChannelResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidGetOrCreateChannelResponse(value) {
    try {
        Convert.getOrCreateChannelResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_OR_CREATE_CHANNEL_RESPONSE_TYPE = 'GetOrCreateChannelResponse';
/**
 * Returns true if the value has a type property with value 'getUserChannelsRequest'. This is a fast check that does not check the format of the message
 */
function isGetUserChannelsRequest(value) {
    return value != null && value.type === 'getUserChannelsRequest';
}
/**
 * Returns true if value is a valid GetUserChannelsRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidGetUserChannelsRequest(value) {
    try {
        Convert.getUserChannelsRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_USER_CHANNELS_REQUEST_TYPE = 'GetUserChannelsRequest';
/**
 * Returns true if the value has a type property with value 'getUserChannelsResponse'. This is a fast check that does not check the format of the message
 */
function isGetUserChannelsResponse(value) {
    return value != null && value.type === 'getUserChannelsResponse';
}
/**
 * Returns true if value is a valid GetUserChannelsResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidGetUserChannelsResponse(value) {
    try {
        Convert.getUserChannelsResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const GET_USER_CHANNELS_RESPONSE_TYPE = 'GetUserChannelsResponse';
/**
 * Returns true if the value has a type property with value 'heartbeatAcknowledgementRequest'. This is a fast check that does not check the format of the message
 */
function isHeartbeatAcknowledgementRequest(value) {
    return value != null && value.type === 'heartbeatAcknowledgementRequest';
}
/**
 * Returns true if value is a valid HeartbeatAcknowledgementRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidHeartbeatAcknowledgementRequest(value) {
    try {
        Convert.heartbeatAcknowledgementRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const HEARTBEAT_ACKNOWLEDGEMENT_REQUEST_TYPE = 'HeartbeatAcknowledgementRequest';
/**
 * Returns true if the value has a type property with value 'heartbeatEvent'. This is a fast check that does not check the format of the message
 */
function isHeartbeatEvent(value) {
    return value != null && value.type === 'heartbeatEvent';
}
/**
 * Returns true if value is a valid HeartbeatEvent. This checks the type against the json schema for the message and will be slower
 */
function isValidHeartbeatEvent(value) {
    try {
        Convert.heartbeatEventToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const HEARTBEAT_EVENT_TYPE = 'HeartbeatEvent';
/**
 * Returns true if the value has a type property with value 'intentEvent'. This is a fast check that does not check the format of the message
 */
function isIntentEvent(value) {
    return value != null && value.type === 'intentEvent';
}
/**
 * Returns true if value is a valid IntentEvent. This checks the type against the json schema for the message and will be slower
 */
function isValidIntentEvent(value) {
    try {
        Convert.intentEventToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const INTENT_EVENT_TYPE = 'IntentEvent';
/**
 * Returns true if the value has a type property with value 'intentListenerUnsubscribeRequest'. This is a fast check that does not check the format of the message
 */
function isIntentListenerUnsubscribeRequest(value) {
    return value != null && value.type === 'intentListenerUnsubscribeRequest';
}
/**
 * Returns true if value is a valid IntentListenerUnsubscribeRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidIntentListenerUnsubscribeRequest(value) {
    try {
        Convert.intentListenerUnsubscribeRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const INTENT_LISTENER_UNSUBSCRIBE_REQUEST_TYPE = 'IntentListenerUnsubscribeRequest';
/**
 * Returns true if the value has a type property with value 'intentListenerUnsubscribeResponse'. This is a fast check that does not check the format of the message
 */
function isIntentListenerUnsubscribeResponse(value) {
    return value != null && value.type === 'intentListenerUnsubscribeResponse';
}
/**
 * Returns true if value is a valid IntentListenerUnsubscribeResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidIntentListenerUnsubscribeResponse(value) {
    try {
        Convert.intentListenerUnsubscribeResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const INTENT_LISTENER_UNSUBSCRIBE_RESPONSE_TYPE = 'IntentListenerUnsubscribeResponse';
/**
 * Returns true if the value has a type property with value 'intentResultRequest'. This is a fast check that does not check the format of the message
 */
function isIntentResultRequest(value) {
    return value != null && value.type === 'intentResultRequest';
}
/**
 * Returns true if value is a valid IntentResultRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidIntentResultRequest(value) {
    try {
        Convert.intentResultRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const INTENT_RESULT_REQUEST_TYPE = 'IntentResultRequest';
/**
 * Returns true if the value has a type property with value 'intentResultResponse'. This is a fast check that does not check the format of the message
 */
function isIntentResultResponse(value) {
    return value != null && value.type === 'intentResultResponse';
}
/**
 * Returns true if value is a valid IntentResultResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidIntentResultResponse(value) {
    try {
        Convert.intentResultResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const INTENT_RESULT_RESPONSE_TYPE = 'IntentResultResponse';
/**
 * Returns true if the value has a type property with value 'joinUserChannelRequest'. This is a fast check that does not check the format of the message
 */
function isJoinUserChannelRequest(value) {
    return value != null && value.type === 'joinUserChannelRequest';
}
/**
 * Returns true if value is a valid JoinUserChannelRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidJoinUserChannelRequest(value) {
    try {
        Convert.joinUserChannelRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const JOIN_USER_CHANNEL_REQUEST_TYPE = 'JoinUserChannelRequest';
/**
 * Returns true if the value has a type property with value 'joinUserChannelResponse'. This is a fast check that does not check the format of the message
 */
function isJoinUserChannelResponse(value) {
    return value != null && value.type === 'joinUserChannelResponse';
}
/**
 * Returns true if value is a valid JoinUserChannelResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidJoinUserChannelResponse(value) {
    try {
        Convert.joinUserChannelResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const JOIN_USER_CHANNEL_RESPONSE_TYPE = 'JoinUserChannelResponse';
/**
 * Returns true if the value has a type property with value 'leaveCurrentChannelRequest'. This is a fast check that does not check the format of the message
 */
function isLeaveCurrentChannelRequest(value) {
    return value != null && value.type === 'leaveCurrentChannelRequest';
}
/**
 * Returns true if value is a valid LeaveCurrentChannelRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidLeaveCurrentChannelRequest(value) {
    try {
        Convert.leaveCurrentChannelRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const LEAVE_CURRENT_CHANNEL_REQUEST_TYPE = 'LeaveCurrentChannelRequest';
/**
 * Returns true if the value has a type property with value 'leaveCurrentChannelResponse'. This is a fast check that does not check the format of the message
 */
function isLeaveCurrentChannelResponse(value) {
    return value != null && value.type === 'leaveCurrentChannelResponse';
}
/**
 * Returns true if value is a valid LeaveCurrentChannelResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidLeaveCurrentChannelResponse(value) {
    try {
        Convert.leaveCurrentChannelResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const LEAVE_CURRENT_CHANNEL_RESPONSE_TYPE = 'LeaveCurrentChannelResponse';
/**
 * Returns true if the value has a type property with value 'openRequest'. This is a fast check that does not check the format of the message
 */
function isOpenRequest(value) {
    return value != null && value.type === 'openRequest';
}
/**
 * Returns true if value is a valid OpenRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidOpenRequest(value) {
    try {
        Convert.openRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const OPEN_REQUEST_TYPE = 'OpenRequest';
/**
 * Returns true if the value has a type property with value 'openResponse'. This is a fast check that does not check the format of the message
 */
function isOpenResponse(value) {
    return value != null && value.type === 'openResponse';
}
/**
 * Returns true if value is a valid OpenResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidOpenResponse(value) {
    try {
        Convert.openResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const OPEN_RESPONSE_TYPE = 'OpenResponse';
/**
 * Returns true if the value has a type property with value 'privateChannelAddEventListenerRequest'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelAddEventListenerRequest(value) {
    return value != null && value.type === 'privateChannelAddEventListenerRequest';
}
/**
 * Returns true if value is a valid PrivateChannelAddEventListenerRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelAddEventListenerRequest(value) {
    try {
        Convert.privateChannelAddEventListenerRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_ADD_EVENT_LISTENER_REQUEST_TYPE = 'PrivateChannelAddEventListenerRequest';
/**
 * Returns true if the value has a type property with value 'privateChannelAddEventListenerResponse'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelAddEventListenerResponse(value) {
    return value != null && value.type === 'privateChannelAddEventListenerResponse';
}
/**
 * Returns true if value is a valid PrivateChannelAddEventListenerResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelAddEventListenerResponse(value) {
    try {
        Convert.privateChannelAddEventListenerResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_ADD_EVENT_LISTENER_RESPONSE_TYPE = 'PrivateChannelAddEventListenerResponse';
/**
 * Returns true if the value has a type property with value 'privateChannelDisconnectRequest'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelDisconnectRequest(value) {
    return value != null && value.type === 'privateChannelDisconnectRequest';
}
/**
 * Returns true if value is a valid PrivateChannelDisconnectRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelDisconnectRequest(value) {
    try {
        Convert.privateChannelDisconnectRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_DISCONNECT_REQUEST_TYPE = 'PrivateChannelDisconnectRequest';
/**
 * Returns true if the value has a type property with value 'privateChannelDisconnectResponse'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelDisconnectResponse(value) {
    return value != null && value.type === 'privateChannelDisconnectResponse';
}
/**
 * Returns true if value is a valid PrivateChannelDisconnectResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelDisconnectResponse(value) {
    try {
        Convert.privateChannelDisconnectResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_DISCONNECT_RESPONSE_TYPE = 'PrivateChannelDisconnectResponse';
/**
 * Returns true if the value has a type property with value 'privateChannelOnAddContextListenerEvent'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelOnAddContextListenerEvent(value) {
    return value != null && value.type === 'privateChannelOnAddContextListenerEvent';
}
/**
 * Returns true if value is a valid PrivateChannelOnAddContextListenerEvent. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelOnAddContextListenerEvent(value) {
    try {
        Convert.privateChannelOnAddContextListenerEventToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_ON_ADD_CONTEXT_LISTENER_EVENT_TYPE = 'PrivateChannelOnAddContextListenerEvent';
/**
 * Returns true if the value has a type property with value 'privateChannelOnDisconnectEvent'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelOnDisconnectEvent(value) {
    return value != null && value.type === 'privateChannelOnDisconnectEvent';
}
/**
 * Returns true if value is a valid PrivateChannelOnDisconnectEvent. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelOnDisconnectEvent(value) {
    try {
        Convert.privateChannelOnDisconnectEventToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_ON_DISCONNECT_EVENT_TYPE = 'PrivateChannelOnDisconnectEvent';
/**
 * Returns true if the value has a type property with value 'privateChannelOnUnsubscribeEvent'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelOnUnsubscribeEvent(value) {
    return value != null && value.type === 'privateChannelOnUnsubscribeEvent';
}
/**
 * Returns true if value is a valid PrivateChannelOnUnsubscribeEvent. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelOnUnsubscribeEvent(value) {
    try {
        Convert.privateChannelOnUnsubscribeEventToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_ON_UNSUBSCRIBE_EVENT_TYPE = 'PrivateChannelOnUnsubscribeEvent';
/**
 * Returns true if the value has a type property with value 'privateChannelUnsubscribeEventListenerRequest'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelUnsubscribeEventListenerRequest(value) {
    return value != null && value.type === 'privateChannelUnsubscribeEventListenerRequest';
}
/**
 * Returns true if value is a valid PrivateChannelUnsubscribeEventListenerRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelUnsubscribeEventListenerRequest(value) {
    try {
        Convert.privateChannelUnsubscribeEventListenerRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_UNSUBSCRIBE_EVENT_LISTENER_REQUEST_TYPE = 'PrivateChannelUnsubscribeEventListenerRequest';
/**
 * Returns true if the value has a type property with value 'privateChannelUnsubscribeEventListenerResponse'. This is a fast check that does not check the format of the message
 */
function isPrivateChannelUnsubscribeEventListenerResponse(value) {
    return value != null && value.type === 'privateChannelUnsubscribeEventListenerResponse';
}
/**
 * Returns true if value is a valid PrivateChannelUnsubscribeEventListenerResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidPrivateChannelUnsubscribeEventListenerResponse(value) {
    try {
        Convert.privateChannelUnsubscribeEventListenerResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const PRIVATE_CHANNEL_UNSUBSCRIBE_EVENT_LISTENER_RESPONSE_TYPE = 'PrivateChannelUnsubscribeEventListenerResponse';
/**
 * Returns true if the value has a type property with value 'raiseIntentForContextRequest'. This is a fast check that does not check the format of the message
 */
function isRaiseIntentForContextRequest(value) {
    return value != null && value.type === 'raiseIntentForContextRequest';
}
/**
 * Returns true if value is a valid RaiseIntentForContextRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidRaiseIntentForContextRequest(value) {
    try {
        Convert.raiseIntentForContextRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const RAISE_INTENT_FOR_CONTEXT_REQUEST_TYPE = 'RaiseIntentForContextRequest';
/**
 * Returns true if the value has a type property with value 'raiseIntentForContextResponse'. This is a fast check that does not check the format of the message
 */
function isRaiseIntentForContextResponse(value) {
    return value != null && value.type === 'raiseIntentForContextResponse';
}
/**
 * Returns true if value is a valid RaiseIntentForContextResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidRaiseIntentForContextResponse(value) {
    try {
        Convert.raiseIntentForContextResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const RAISE_INTENT_FOR_CONTEXT_RESPONSE_TYPE = 'RaiseIntentForContextResponse';
/**
 * Returns true if the value has a type property with value 'raiseIntentRequest'. This is a fast check that does not check the format of the message
 */
function isRaiseIntentRequest(value) {
    return value != null && value.type === 'raiseIntentRequest';
}
/**
 * Returns true if value is a valid RaiseIntentRequest. This checks the type against the json schema for the message and will be slower
 */
function isValidRaiseIntentRequest(value) {
    try {
        Convert.raiseIntentRequestToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const RAISE_INTENT_REQUEST_TYPE = 'RaiseIntentRequest';
/**
 * Returns true if the value has a type property with value 'raiseIntentResponse'. This is a fast check that does not check the format of the message
 */
function isRaiseIntentResponse(value) {
    return value != null && value.type === 'raiseIntentResponse';
}
/**
 * Returns true if value is a valid RaiseIntentResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidRaiseIntentResponse(value) {
    try {
        Convert.raiseIntentResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const RAISE_INTENT_RESPONSE_TYPE = 'RaiseIntentResponse';
/**
 * Returns true if the value has a type property with value 'raiseIntentResultResponse'. This is a fast check that does not check the format of the message
 */
function isRaiseIntentResultResponse(value) {
    return value != null && value.type === 'raiseIntentResultResponse';
}
/**
 * Returns true if value is a valid RaiseIntentResultResponse. This checks the type against the json schema for the message and will be slower
 */
function isValidRaiseIntentResultResponse(value) {
    try {
        Convert.raiseIntentResultResponseToJson(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
const RAISE_INTENT_RESULT_RESPONSE_TYPE = 'RaiseIntentResultResponse';


/***/ },

/***/ "./node_modules/@finos/fdc3-schema/dist/generated/bridging/BridgingTypes.js"
/*!**********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-schema/dist/generated/bridging/BridgingTypes.js ***!
  \**********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Convert: () => (/* binding */ Convert)
/* harmony export */ });
// To parse this data:
//
//   import { Convert, AgentErrorResponseMessage, AgentRequestMessage, AgentResponseMessage, BridgeErrorResponseMessage, BridgeRequestMessage, BridgeResponseMessage, BroadcastAgentRequest, BroadcastBridgeRequest, ConnectionStepMessage, ConnectionStep2Hello, ConnectionStep3Handshake, ConnectionStep4AuthenticationFailed, ConnectionStep6ConnectedAgentsUpdate, FindInstancesAgentErrorResponse, FindInstancesAgentRequest, FindInstancesAgentResponse, FindInstancesBridgeErrorResponse, FindInstancesBridgeRequest, FindInstancesBridgeResponse, FindIntentAgentErrorResponse, FindIntentAgentRequest, FindIntentAgentResponse, FindIntentBridgeErrorResponse, FindIntentBridgeRequest, FindIntentBridgeResponse, FindIntentsByContextAgentErrorResponse, FindIntentsByContextAgentRequest, FindIntentsByContextAgentResponse, FindIntentsByContextBridgeErrorResponse, FindIntentsByContextBridgeRequest, FindIntentsByContextBridgeResponse, GetAppMetadataAgentErrorResponse, GetAppMetadataAgentRequest, GetAppMetadataAgentResponse, GetAppMetadataBridgeErrorResponse, GetAppMetadataBridgeRequest, GetAppMetadataBridgeResponse, OpenAgentErrorResponse, OpenAgentRequest, OpenAgentResponse, OpenBridgeErrorResponse, OpenBridgeRequest, OpenBridgeResponse, PrivateChannelBroadcastAgentRequest, PrivateChannelBroadcastBridgeRequest, PrivateChannelEventListenerAddedAgentRequest, PrivateChannelEventListenerAddedBridgeRequest, PrivateChannelEventListenerRemovedAgentRequest, PrivateChannelEventListenerRemovedBridgeRequest, PrivateChannelOnAddContextListenerAgentRequest, PrivateChannelOnAddContextListenerBridgeRequest, PrivateChannelOnDisconnectAgentRequest, PrivateChannelOnDisconnectBridgeRequest, PrivateChannelOnUnsubscribeAgentRequest, PrivateChannelOnUnsubscribeBridgeRequest, RaiseIntentAgentErrorResponse, RaiseIntentAgentRequest, RaiseIntentAgentResponse, RaiseIntentBridgeErrorResponse, RaiseIntentBridgeRequest, RaiseIntentBridgeResponse, RaiseIntentResultAgentErrorResponse, RaiseIntentResultAgentResponse, RaiseIntentResultBridgeErrorResponse, RaiseIntentResultBridgeResponse } from "./file";
//
//   const agentErrorResponseMessage = Convert.toAgentErrorResponseMessage(json);
//   const agentRequestMessage = Convert.toAgentRequestMessage(json);
//   const agentResponseMessage = Convert.toAgentResponseMessage(json);
//   const bridgeErrorResponseMessage = Convert.toBridgeErrorResponseMessage(json);
//   const bridgeRequestMessage = Convert.toBridgeRequestMessage(json);
//   const bridgeResponseMessage = Convert.toBridgeResponseMessage(json);
//   const broadcastAgentRequest = Convert.toBroadcastAgentRequest(json);
//   const broadcastBridgeRequest = Convert.toBroadcastBridgeRequest(json);
//   const bridgeCommonDefinitions = Convert.toBridgeCommonDefinitions(json);
//   const connectionStepMessage = Convert.toConnectionStepMessage(json);
//   const connectionStep2Hello = Convert.toConnectionStep2Hello(json);
//   const connectionStep3Handshake = Convert.toConnectionStep3Handshake(json);
//   const connectionStep4AuthenticationFailed = Convert.toConnectionStep4AuthenticationFailed(json);
//   const connectionStep6ConnectedAgentsUpdate = Convert.toConnectionStep6ConnectedAgentsUpdate(json);
//   const findInstancesAgentErrorResponse = Convert.toFindInstancesAgentErrorResponse(json);
//   const findInstancesAgentRequest = Convert.toFindInstancesAgentRequest(json);
//   const findInstancesAgentResponse = Convert.toFindInstancesAgentResponse(json);
//   const findInstancesBridgeErrorResponse = Convert.toFindInstancesBridgeErrorResponse(json);
//   const findInstancesBridgeRequest = Convert.toFindInstancesBridgeRequest(json);
//   const findInstancesBridgeResponse = Convert.toFindInstancesBridgeResponse(json);
//   const findIntentAgentErrorResponse = Convert.toFindIntentAgentErrorResponse(json);
//   const findIntentAgentRequest = Convert.toFindIntentAgentRequest(json);
//   const findIntentAgentResponse = Convert.toFindIntentAgentResponse(json);
//   const findIntentBridgeErrorResponse = Convert.toFindIntentBridgeErrorResponse(json);
//   const findIntentBridgeRequest = Convert.toFindIntentBridgeRequest(json);
//   const findIntentBridgeResponse = Convert.toFindIntentBridgeResponse(json);
//   const findIntentsByContextAgentErrorResponse = Convert.toFindIntentsByContextAgentErrorResponse(json);
//   const findIntentsByContextAgentRequest = Convert.toFindIntentsByContextAgentRequest(json);
//   const findIntentsByContextAgentResponse = Convert.toFindIntentsByContextAgentResponse(json);
//   const findIntentsByContextBridgeErrorResponse = Convert.toFindIntentsByContextBridgeErrorResponse(json);
//   const findIntentsByContextBridgeRequest = Convert.toFindIntentsByContextBridgeRequest(json);
//   const findIntentsByContextBridgeResponse = Convert.toFindIntentsByContextBridgeResponse(json);
//   const getAppMetadataAgentErrorResponse = Convert.toGetAppMetadataAgentErrorResponse(json);
//   const getAppMetadataAgentRequest = Convert.toGetAppMetadataAgentRequest(json);
//   const getAppMetadataAgentResponse = Convert.toGetAppMetadataAgentResponse(json);
//   const getAppMetadataBridgeErrorResponse = Convert.toGetAppMetadataBridgeErrorResponse(json);
//   const getAppMetadataBridgeRequest = Convert.toGetAppMetadataBridgeRequest(json);
//   const getAppMetadataBridgeResponse = Convert.toGetAppMetadataBridgeResponse(json);
//   const openAgentErrorResponse = Convert.toOpenAgentErrorResponse(json);
//   const openAgentRequest = Convert.toOpenAgentRequest(json);
//   const openAgentResponse = Convert.toOpenAgentResponse(json);
//   const openBridgeErrorResponse = Convert.toOpenBridgeErrorResponse(json);
//   const openBridgeRequest = Convert.toOpenBridgeRequest(json);
//   const openBridgeResponse = Convert.toOpenBridgeResponse(json);
//   const privateChannelBroadcastAgentRequest = Convert.toPrivateChannelBroadcastAgentRequest(json);
//   const privateChannelBroadcastBridgeRequest = Convert.toPrivateChannelBroadcastBridgeRequest(json);
//   const privateChannelEventListenerAddedAgentRequest = Convert.toPrivateChannelEventListenerAddedAgentRequest(json);
//   const privateChannelEventListenerAddedBridgeRequest = Convert.toPrivateChannelEventListenerAddedBridgeRequest(json);
//   const privateChannelEventListenerRemovedAgentRequest = Convert.toPrivateChannelEventListenerRemovedAgentRequest(json);
//   const privateChannelEventListenerRemovedBridgeRequest = Convert.toPrivateChannelEventListenerRemovedBridgeRequest(json);
//   const privateChannelOnAddContextListenerAgentRequest = Convert.toPrivateChannelOnAddContextListenerAgentRequest(json);
//   const privateChannelOnAddContextListenerBridgeRequest = Convert.toPrivateChannelOnAddContextListenerBridgeRequest(json);
//   const privateChannelOnDisconnectAgentRequest = Convert.toPrivateChannelOnDisconnectAgentRequest(json);
//   const privateChannelOnDisconnectBridgeRequest = Convert.toPrivateChannelOnDisconnectBridgeRequest(json);
//   const privateChannelOnUnsubscribeAgentRequest = Convert.toPrivateChannelOnUnsubscribeAgentRequest(json);
//   const privateChannelOnUnsubscribeBridgeRequest = Convert.toPrivateChannelOnUnsubscribeBridgeRequest(json);
//   const raiseIntentAgentErrorResponse = Convert.toRaiseIntentAgentErrorResponse(json);
//   const raiseIntentAgentRequest = Convert.toRaiseIntentAgentRequest(json);
//   const raiseIntentAgentResponse = Convert.toRaiseIntentAgentResponse(json);
//   const raiseIntentBridgeErrorResponse = Convert.toRaiseIntentBridgeErrorResponse(json);
//   const raiseIntentBridgeRequest = Convert.toRaiseIntentBridgeRequest(json);
//   const raiseIntentBridgeResponse = Convert.toRaiseIntentBridgeResponse(json);
//   const raiseIntentResultAgentErrorResponse = Convert.toRaiseIntentResultAgentErrorResponse(json);
//   const raiseIntentResultAgentResponse = Convert.toRaiseIntentResultAgentResponse(json);
//   const raiseIntentResultBridgeErrorResponse = Convert.toRaiseIntentResultBridgeErrorResponse(json);
//   const raiseIntentResultBridgeResponse = Convert.toRaiseIntentResultBridgeResponse(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.
// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
class Convert {
    static toAgentErrorResponseMessage(json) {
        return cast(JSON.parse(json), r('AgentErrorResponseMessage'));
    }
    static agentErrorResponseMessageToJson(value) {
        return JSON.stringify(uncast(value, r('AgentErrorResponseMessage')), null, 2);
    }
    static toAgentRequestMessage(json) {
        return cast(JSON.parse(json), r('AgentRequestMessage'));
    }
    static agentRequestMessageToJson(value) {
        return JSON.stringify(uncast(value, r('AgentRequestMessage')), null, 2);
    }
    static toAgentResponseMessage(json) {
        return cast(JSON.parse(json), r('AgentResponseMessage'));
    }
    static agentResponseMessageToJson(value) {
        return JSON.stringify(uncast(value, r('AgentResponseMessage')), null, 2);
    }
    static toBridgeErrorResponseMessage(json) {
        return cast(JSON.parse(json), r('BridgeErrorResponseMessage'));
    }
    static bridgeErrorResponseMessageToJson(value) {
        return JSON.stringify(uncast(value, r('BridgeErrorResponseMessage')), null, 2);
    }
    static toBridgeRequestMessage(json) {
        return cast(JSON.parse(json), r('BridgeRequestMessage'));
    }
    static bridgeRequestMessageToJson(value) {
        return JSON.stringify(uncast(value, r('BridgeRequestMessage')), null, 2);
    }
    static toBridgeResponseMessage(json) {
        return cast(JSON.parse(json), r('BridgeResponseMessage'));
    }
    static bridgeResponseMessageToJson(value) {
        return JSON.stringify(uncast(value, r('BridgeResponseMessage')), null, 2);
    }
    static toBroadcastAgentRequest(json) {
        return cast(JSON.parse(json), r('BroadcastAgentRequest'));
    }
    static broadcastAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('BroadcastAgentRequest')), null, 2);
    }
    static toBroadcastBridgeRequest(json) {
        return cast(JSON.parse(json), r('BroadcastBridgeRequest'));
    }
    static broadcastBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('BroadcastBridgeRequest')), null, 2);
    }
    static toBridgeCommonDefinitions(json) {
        return cast(JSON.parse(json), m('any'));
    }
    static bridgeCommonDefinitionsToJson(value) {
        return JSON.stringify(uncast(value, m('any')), null, 2);
    }
    static toConnectionStepMessage(json) {
        return cast(JSON.parse(json), r('ConnectionStepMessage'));
    }
    static connectionStepMessageToJson(value) {
        return JSON.stringify(uncast(value, r('ConnectionStepMessage')), null, 2);
    }
    static toConnectionStep2Hello(json) {
        return cast(JSON.parse(json), r('ConnectionStep2Hello'));
    }
    static connectionStep2HelloToJson(value) {
        return JSON.stringify(uncast(value, r('ConnectionStep2Hello')), null, 2);
    }
    static toConnectionStep3Handshake(json) {
        return cast(JSON.parse(json), r('ConnectionStep3Handshake'));
    }
    static connectionStep3HandshakeToJson(value) {
        return JSON.stringify(uncast(value, r('ConnectionStep3Handshake')), null, 2);
    }
    static toConnectionStep4AuthenticationFailed(json) {
        return cast(JSON.parse(json), r('ConnectionStep4AuthenticationFailed'));
    }
    static connectionStep4AuthenticationFailedToJson(value) {
        return JSON.stringify(uncast(value, r('ConnectionStep4AuthenticationFailed')), null, 2);
    }
    static toConnectionStep6ConnectedAgentsUpdate(json) {
        return cast(JSON.parse(json), r('ConnectionStep6ConnectedAgentsUpdate'));
    }
    static connectionStep6ConnectedAgentsUpdateToJson(value) {
        return JSON.stringify(uncast(value, r('ConnectionStep6ConnectedAgentsUpdate')), null, 2);
    }
    static toFindInstancesAgentErrorResponse(json) {
        return cast(JSON.parse(json), r('FindInstancesAgentErrorResponse'));
    }
    static findInstancesAgentErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesAgentErrorResponse')), null, 2);
    }
    static toFindInstancesAgentRequest(json) {
        return cast(JSON.parse(json), r('FindInstancesAgentRequest'));
    }
    static findInstancesAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesAgentRequest')), null, 2);
    }
    static toFindInstancesAgentResponse(json) {
        return cast(JSON.parse(json), r('FindInstancesAgentResponse'));
    }
    static findInstancesAgentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesAgentResponse')), null, 2);
    }
    static toFindInstancesBridgeErrorResponse(json) {
        return cast(JSON.parse(json), r('FindInstancesBridgeErrorResponse'));
    }
    static findInstancesBridgeErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesBridgeErrorResponse')), null, 2);
    }
    static toFindInstancesBridgeRequest(json) {
        return cast(JSON.parse(json), r('FindInstancesBridgeRequest'));
    }
    static findInstancesBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesBridgeRequest')), null, 2);
    }
    static toFindInstancesBridgeResponse(json) {
        return cast(JSON.parse(json), r('FindInstancesBridgeResponse'));
    }
    static findInstancesBridgeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindInstancesBridgeResponse')), null, 2);
    }
    static toFindIntentAgentErrorResponse(json) {
        return cast(JSON.parse(json), r('FindIntentAgentErrorResponse'));
    }
    static findIntentAgentErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentAgentErrorResponse')), null, 2);
    }
    static toFindIntentAgentRequest(json) {
        return cast(JSON.parse(json), r('FindIntentAgentRequest'));
    }
    static findIntentAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentAgentRequest')), null, 2);
    }
    static toFindIntentAgentResponse(json) {
        return cast(JSON.parse(json), r('FindIntentAgentResponse'));
    }
    static findIntentAgentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentAgentResponse')), null, 2);
    }
    static toFindIntentBridgeErrorResponse(json) {
        return cast(JSON.parse(json), r('FindIntentBridgeErrorResponse'));
    }
    static findIntentBridgeErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentBridgeErrorResponse')), null, 2);
    }
    static toFindIntentBridgeRequest(json) {
        return cast(JSON.parse(json), r('FindIntentBridgeRequest'));
    }
    static findIntentBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentBridgeRequest')), null, 2);
    }
    static toFindIntentBridgeResponse(json) {
        return cast(JSON.parse(json), r('FindIntentBridgeResponse'));
    }
    static findIntentBridgeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentBridgeResponse')), null, 2);
    }
    static toFindIntentsByContextAgentErrorResponse(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextAgentErrorResponse'));
    }
    static findIntentsByContextAgentErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextAgentErrorResponse')), null, 2);
    }
    static toFindIntentsByContextAgentRequest(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextAgentRequest'));
    }
    static findIntentsByContextAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextAgentRequest')), null, 2);
    }
    static toFindIntentsByContextAgentResponse(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextAgentResponse'));
    }
    static findIntentsByContextAgentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextAgentResponse')), null, 2);
    }
    static toFindIntentsByContextBridgeErrorResponse(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextBridgeErrorResponse'));
    }
    static findIntentsByContextBridgeErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextBridgeErrorResponse')), null, 2);
    }
    static toFindIntentsByContextBridgeRequest(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextBridgeRequest'));
    }
    static findIntentsByContextBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextBridgeRequest')), null, 2);
    }
    static toFindIntentsByContextBridgeResponse(json) {
        return cast(JSON.parse(json), r('FindIntentsByContextBridgeResponse'));
    }
    static findIntentsByContextBridgeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('FindIntentsByContextBridgeResponse')), null, 2);
    }
    static toGetAppMetadataAgentErrorResponse(json) {
        return cast(JSON.parse(json), r('GetAppMetadataAgentErrorResponse'));
    }
    static getAppMetadataAgentErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataAgentErrorResponse')), null, 2);
    }
    static toGetAppMetadataAgentRequest(json) {
        return cast(JSON.parse(json), r('GetAppMetadataAgentRequest'));
    }
    static getAppMetadataAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataAgentRequest')), null, 2);
    }
    static toGetAppMetadataAgentResponse(json) {
        return cast(JSON.parse(json), r('GetAppMetadataAgentResponse'));
    }
    static getAppMetadataAgentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataAgentResponse')), null, 2);
    }
    static toGetAppMetadataBridgeErrorResponse(json) {
        return cast(JSON.parse(json), r('GetAppMetadataBridgeErrorResponse'));
    }
    static getAppMetadataBridgeErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataBridgeErrorResponse')), null, 2);
    }
    static toGetAppMetadataBridgeRequest(json) {
        return cast(JSON.parse(json), r('GetAppMetadataBridgeRequest'));
    }
    static getAppMetadataBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataBridgeRequest')), null, 2);
    }
    static toGetAppMetadataBridgeResponse(json) {
        return cast(JSON.parse(json), r('GetAppMetadataBridgeResponse'));
    }
    static getAppMetadataBridgeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('GetAppMetadataBridgeResponse')), null, 2);
    }
    static toOpenAgentErrorResponse(json) {
        return cast(JSON.parse(json), r('OpenAgentErrorResponse'));
    }
    static openAgentErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('OpenAgentErrorResponse')), null, 2);
    }
    static toOpenAgentRequest(json) {
        return cast(JSON.parse(json), r('OpenAgentRequest'));
    }
    static openAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('OpenAgentRequest')), null, 2);
    }
    static toOpenAgentResponse(json) {
        return cast(JSON.parse(json), r('OpenAgentResponse'));
    }
    static openAgentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('OpenAgentResponse')), null, 2);
    }
    static toOpenBridgeErrorResponse(json) {
        return cast(JSON.parse(json), r('OpenBridgeErrorResponse'));
    }
    static openBridgeErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('OpenBridgeErrorResponse')), null, 2);
    }
    static toOpenBridgeRequest(json) {
        return cast(JSON.parse(json), r('OpenBridgeRequest'));
    }
    static openBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('OpenBridgeRequest')), null, 2);
    }
    static toOpenBridgeResponse(json) {
        return cast(JSON.parse(json), r('OpenBridgeResponse'));
    }
    static openBridgeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('OpenBridgeResponse')), null, 2);
    }
    static toPrivateChannelBroadcastAgentRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelBroadcastAgentRequest'));
    }
    static privateChannelBroadcastAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelBroadcastAgentRequest')), null, 2);
    }
    static toPrivateChannelBroadcastBridgeRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelBroadcastBridgeRequest'));
    }
    static privateChannelBroadcastBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelBroadcastBridgeRequest')), null, 2);
    }
    static toPrivateChannelEventListenerAddedAgentRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelEventListenerAddedAgentRequest'));
    }
    static privateChannelEventListenerAddedAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelEventListenerAddedAgentRequest')), null, 2);
    }
    static toPrivateChannelEventListenerAddedBridgeRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelEventListenerAddedBridgeRequest'));
    }
    static privateChannelEventListenerAddedBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelEventListenerAddedBridgeRequest')), null, 2);
    }
    static toPrivateChannelEventListenerRemovedAgentRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelEventListenerRemovedAgentRequest'));
    }
    static privateChannelEventListenerRemovedAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelEventListenerRemovedAgentRequest')), null, 2);
    }
    static toPrivateChannelEventListenerRemovedBridgeRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelEventListenerRemovedBridgeRequest'));
    }
    static privateChannelEventListenerRemovedBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelEventListenerRemovedBridgeRequest')), null, 2);
    }
    static toPrivateChannelOnAddContextListenerAgentRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnAddContextListenerAgentRequest'));
    }
    static privateChannelOnAddContextListenerAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnAddContextListenerAgentRequest')), null, 2);
    }
    static toPrivateChannelOnAddContextListenerBridgeRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnAddContextListenerBridgeRequest'));
    }
    static privateChannelOnAddContextListenerBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnAddContextListenerBridgeRequest')), null, 2);
    }
    static toPrivateChannelOnDisconnectAgentRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnDisconnectAgentRequest'));
    }
    static privateChannelOnDisconnectAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnDisconnectAgentRequest')), null, 2);
    }
    static toPrivateChannelOnDisconnectBridgeRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnDisconnectBridgeRequest'));
    }
    static privateChannelOnDisconnectBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnDisconnectBridgeRequest')), null, 2);
    }
    static toPrivateChannelOnUnsubscribeAgentRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnUnsubscribeAgentRequest'));
    }
    static privateChannelOnUnsubscribeAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnUnsubscribeAgentRequest')), null, 2);
    }
    static toPrivateChannelOnUnsubscribeBridgeRequest(json) {
        return cast(JSON.parse(json), r('PrivateChannelOnUnsubscribeBridgeRequest'));
    }
    static privateChannelOnUnsubscribeBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('PrivateChannelOnUnsubscribeBridgeRequest')), null, 2);
    }
    static toRaiseIntentAgentErrorResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentAgentErrorResponse'));
    }
    static raiseIntentAgentErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentAgentErrorResponse')), null, 2);
    }
    static toRaiseIntentAgentRequest(json) {
        return cast(JSON.parse(json), r('RaiseIntentAgentRequest'));
    }
    static raiseIntentAgentRequestToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentAgentRequest')), null, 2);
    }
    static toRaiseIntentAgentResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentAgentResponse'));
    }
    static raiseIntentAgentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentAgentResponse')), null, 2);
    }
    static toRaiseIntentBridgeErrorResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentBridgeErrorResponse'));
    }
    static raiseIntentBridgeErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentBridgeErrorResponse')), null, 2);
    }
    static toRaiseIntentBridgeRequest(json) {
        return cast(JSON.parse(json), r('RaiseIntentBridgeRequest'));
    }
    static raiseIntentBridgeRequestToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentBridgeRequest')), null, 2);
    }
    static toRaiseIntentBridgeResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentBridgeResponse'));
    }
    static raiseIntentBridgeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentBridgeResponse')), null, 2);
    }
    static toRaiseIntentResultAgentErrorResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentResultAgentErrorResponse'));
    }
    static raiseIntentResultAgentErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentResultAgentErrorResponse')), null, 2);
    }
    static toRaiseIntentResultAgentResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentResultAgentResponse'));
    }
    static raiseIntentResultAgentResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentResultAgentResponse')), null, 2);
    }
    static toRaiseIntentResultBridgeErrorResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentResultBridgeErrorResponse'));
    }
    static raiseIntentResultBridgeErrorResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentResultBridgeErrorResponse')), null, 2);
    }
    static toRaiseIntentResultBridgeResponse(json) {
        return cast(JSON.parse(json), r('RaiseIntentResultBridgeResponse'));
    }
    static raiseIntentResultBridgeResponseToJson(value) {
        return JSON.stringify(uncast(value, r('RaiseIntentResultBridgeResponse')), null, 2);
    }
}
function invalidValue(typ, val, key, parent = '') {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}
function prettyTypeName(typ) {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        }
        else {
            return `one of [${typ
                .map(a => {
                return prettyTypeName(a);
            })
                .join(', ')}]`;
        }
    }
    else if (typeof typ === 'object' && typ.literal !== undefined) {
        return typ.literal;
    }
    else {
        return typeof typ;
    }
}
function jsonToJSProps(typ) {
    if (typ.jsonToJS === undefined) {
        const map = {};
        typ.props.forEach((p) => (map[p.json] = { key: p.js, typ: p.typ }));
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}
function jsToJSONProps(typ) {
    if (typ.jsToJSON === undefined) {
        const map = {};
        typ.props.forEach((p) => (map[p.js] = { key: p.json, typ: p.typ }));
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}
function transform(val, typ, getProps, key = '', parent = '') {
    function transformPrimitive(typ, val) {
        if (typeof typ === typeof val)
            return val;
        return invalidValue(typ, val, key, parent);
    }
    function transformUnion(typs, val) {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            }
            catch (_) { }
        }
        return invalidValue(typs, val, key, parent);
    }
    function transformEnum(cases, val) {
        if (cases.indexOf(val) !== -1)
            return val;
        return invalidValue(cases.map(a => {
            return l(a);
        }), val, key, parent);
    }
    function transformArray(typ, val) {
        // val must be an array with no invalid elements
        if (!Array.isArray(val))
            return invalidValue(l('array'), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }
    function transformDate(val) {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l('Date'), val, key, parent);
        }
        return d;
    }
    function transformObject(props, additional, val) {
        if (val === null || typeof val !== 'object' || Array.isArray(val)) {
            return invalidValue(l(ref || 'object'), val, key, parent);
        }
        const result = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }
    if (typ === 'any')
        return val;
    if (typ === null) {
        if (val === null)
            return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false)
        return invalidValue(typ, val, key, parent);
    let ref = undefined;
    while (typeof typ === 'object' && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ))
        return transformEnum(typ, val);
    if (typeof typ === 'object') {
        return typ.hasOwnProperty('unionMembers')
            ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty('arrayItems')
                ? transformArray(typ.arrayItems, val)
                : typ.hasOwnProperty('props')
                    ? transformObject(getProps(typ), typ.additional, val)
                    : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== 'number')
        return transformDate(val);
    return transformPrimitive(typ, val);
}
function cast(val, typ) {
    return transform(val, typ, jsonToJSProps);
}
function uncast(val, typ) {
    return transform(val, typ, jsToJSONProps);
}
function l(typ) {
    return { literal: typ };
}
function a(typ) {
    return { arrayItems: typ };
}
function u(...typs) {
    return { unionMembers: typs };
}
function o(props, additional) {
    return { props, additional };
}
function m(additional) {
    return { props: [], additional };
}
function r(name) {
    return { ref: name };
}
const typeMap = {
    AgentErrorResponseMessage: o([
        { json: 'meta', js: 'meta', typ: r('AgentResponseMetadata') },
        { json: 'payload', js: 'payload', typ: r('ErrorResponseMessagePayload') },
        { json: 'type', js: 'type', typ: r('ResponseMessageType') },
    ], false),
    AgentResponseMetadata: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    ErrorResponseMessagePayload: o([{ json: 'error', js: 'error', typ: r('ResponseErrorDetail') }], 'any'),
    AgentRequestMessage: o([
        { json: 'meta', js: 'meta', typ: r('AgentRequestMetadata') },
        { json: 'payload', js: 'payload', typ: m('any') },
        { json: 'type', js: 'type', typ: r('RequestMessageType') },
    ], false),
    AgentRequestMetadata: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('BridgeParticipantIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    BridgeParticipantIdentifier: o([
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'appId', js: 'appId', typ: u(undefined, '') },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    SourceIdentifier: o([
        { json: 'appId', js: 'appId', typ: u(undefined, '') },
        { json: 'desktopAgent', js: 'desktopAgent', typ: u(undefined, '') },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    AgentResponseMessage: o([
        { json: 'meta', js: 'meta', typ: r('AgentResponseMetadata') },
        { json: 'payload', js: 'payload', typ: m('any') },
        { json: 'type', js: 'type', typ: r('ResponseMessageType') },
    ], false),
    BridgeErrorResponseMessage: o([
        { json: 'meta', js: 'meta', typ: r('BridgeErrorResponseMessageMeta') },
        { json: 'payload', js: 'payload', typ: r('ResponseErrorMessagePayload') },
        { json: 'type', js: 'type', typ: '' },
    ], false),
    BridgeErrorResponseMessageMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    DesktopAgentIdentifier: o([{ json: 'desktopAgent', js: 'desktopAgent', typ: '' }], 'any'),
    ResponseErrorMessagePayload: o([{ json: 'error', js: 'error', typ: u(undefined, r('ResponseErrorDetail')) }], 'any'),
    BridgeRequestMessage: o([
        { json: 'meta', js: 'meta', typ: r('BridgeRequestMetadata') },
        { json: 'payload', js: 'payload', typ: m('any') },
        { json: 'type', js: 'type', typ: '' },
    ], false),
    BridgeRequestMetadata: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('BridgeParticipantIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('BridgeParticipantIdentifier') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    BridgeResponseMessage: o([
        { json: 'meta', js: 'meta', typ: r('BridgeResponseMessageMeta') },
        { json: 'payload', js: 'payload', typ: m('any') },
        { json: 'type', js: 'type', typ: '' },
    ], false),
    BridgeResponseMessageMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: u(undefined, a(r('ResponseErrorDetail'))) },
        { json: 'errorSources', js: 'errorSources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'sources', js: 'sources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    BroadcastAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('BroadcastAgentRequestType') },
    ], false),
    BroadcastAgentRequestMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('SourceObject') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    SourceObject: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'desktopAgent', js: 'desktopAgent', typ: u(undefined, '') },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    BroadcastAgentRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'context', js: 'context', typ: r('Context') },
    ], false),
    Context: o([
        { json: 'id', js: 'id', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'type', js: 'type', typ: '' },
    ], 'any'),
    BroadcastBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('BroadcastBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('BroadcastBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('BroadcastAgentRequestType') },
    ], false),
    BroadcastBridgeRequestMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    MetaSource: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    BroadcastBridgeRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'context', js: 'context', typ: r('Context') },
    ], false),
    ConnectionStepMessage: o([
        { json: 'meta', js: 'meta', typ: r('ConnectionStepMetadata') },
        { json: 'payload', js: 'payload', typ: m('any') },
        { json: 'type', js: 'type', typ: r('ConnectionStepMessageType') },
    ], false),
    ConnectionStepMetadata: o([
        { json: 'requestUuid', js: 'requestUuid', typ: u(undefined, '') },
        { json: 'responseUuid', js: 'responseUuid', typ: u(undefined, '') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    ConnectionStep2Hello: o([
        { json: 'meta', js: 'meta', typ: r('ConnectionStep2HelloMeta') },
        { json: 'payload', js: 'payload', typ: r('ConnectionStep2HelloPayload') },
        { json: 'type', js: 'type', typ: r('ConnectionStep2HelloType') },
    ], false),
    ConnectionStep2HelloMeta: o([{ json: 'timestamp', js: 'timestamp', typ: Date }], false),
    ConnectionStep2HelloPayload: o([
        { json: 'authRequired', js: 'authRequired', typ: true },
        { json: 'authToken', js: 'authToken', typ: u(undefined, '') },
        { json: 'desktopAgentBridgeVersion', js: 'desktopAgentBridgeVersion', typ: '' },
        { json: 'supportedFDC3Versions', js: 'supportedFDC3Versions', typ: a('') },
    ], false),
    ConnectionStep3Handshake: o([
        { json: 'meta', js: 'meta', typ: r('ConnectionStep3HandshakeMeta') },
        { json: 'payload', js: 'payload', typ: r('ConnectionStep3HandshakePayload') },
        { json: 'type', js: 'type', typ: r('ConnectionStep3HandshakeType') },
    ], false),
    ConnectionStep3HandshakeMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    ConnectionStep3HandshakePayload: o([
        { json: 'authToken', js: 'authToken', typ: u(undefined, '') },
        { json: 'channelsState', js: 'channelsState', typ: m(a(r('Context'))) },
        { json: 'implementationMetadata', js: 'implementationMetadata', typ: r('ConnectingAgentImplementationMetadata') },
        { json: 'requestedName', js: 'requestedName', typ: '' },
    ], false),
    ConnectingAgentImplementationMetadata: o([
        { json: 'fdc3Version', js: 'fdc3Version', typ: '' },
        { json: 'optionalFeatures', js: 'optionalFeatures', typ: r('OptionalFeatures') },
        { json: 'provider', js: 'provider', typ: '' },
        { json: 'providerVersion', js: 'providerVersion', typ: u(undefined, '') },
    ], false),
    OptionalFeatures: o([
        { json: 'DesktopAgentBridging', js: 'DesktopAgentBridging', typ: true },
        { json: 'OriginatingAppMetadata', js: 'OriginatingAppMetadata', typ: true },
        { json: 'UserChannelMembershipAPIs', js: 'UserChannelMembershipAPIs', typ: true },
    ], false),
    ConnectionStep4AuthenticationFailed: o([
        { json: 'meta', js: 'meta', typ: r('ConnectionStep4AuthenticationFailedMeta') },
        { json: 'payload', js: 'payload', typ: r('ConnectionStep4AuthenticationFailedPayload') },
        { json: 'type', js: 'type', typ: r('ConnectionStep4AuthenticationFailedType') },
    ], false),
    ConnectionStep4AuthenticationFailedMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    ConnectionStep4AuthenticationFailedPayload: o([{ json: 'message', js: 'message', typ: u(undefined, '') }], false),
    ConnectionStep6ConnectedAgentsUpdate: o([
        { json: 'meta', js: 'meta', typ: r('ConnectionStep6ConnectedAgentsUpdateMeta') },
        { json: 'payload', js: 'payload', typ: r('ConnectionStep6ConnectedAgentsUpdatePayload') },
        { json: 'type', js: 'type', typ: r('ConnectionStep6ConnectedAgentsUpdateType') },
    ], false),
    ConnectionStep6ConnectedAgentsUpdateMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    ConnectionStep6ConnectedAgentsUpdatePayload: o([
        { json: 'addAgent', js: 'addAgent', typ: u(undefined, '') },
        { json: 'allAgents', js: 'allAgents', typ: a(r('DesktopAgentImplementationMetadata')) },
        { json: 'channelsState', js: 'channelsState', typ: u(undefined, m(a(r('Context')))) },
        { json: 'removeAgent', js: 'removeAgent', typ: u(undefined, '') },
    ], false),
    DesktopAgentImplementationMetadata: o([
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'fdc3Version', js: 'fdc3Version', typ: '' },
        { json: 'optionalFeatures', js: 'optionalFeatures', typ: r('OptionalFeatures') },
        { json: 'provider', js: 'provider', typ: '' },
        { json: 'providerVersion', js: 'providerVersion', typ: u(undefined, '') },
    ], false),
    FindInstancesAgentErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindInstancesAgentErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('PayloadClass') },
        { json: 'type', js: 'type', typ: r('FindInstancesAgentErrorResponseType') },
    ], false),
    FindInstancesAgentErrorResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PayloadClass: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    FindInstancesAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('FindInstancesAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindInstancesAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindInstancesAgentRequestType') },
    ], false),
    FindInstancesAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('DestinationObject')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    DestinationObject: o([
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'appId', js: 'appId', typ: u(undefined, '') },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    FindInstancesAgentRequestPayload: o([{ json: 'app', js: 'app', typ: r('AppIdentifier') }], false),
    AppIdentifier: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'desktopAgent', js: 'desktopAgent', typ: u(undefined, '') },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    FindInstancesAgentResponse: o([
        { json: 'meta', js: 'meta', typ: r('AgentResponseMetadata') },
        { json: 'payload', js: 'payload', typ: r('FindInstancesAgentResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindInstancesAgentErrorResponseType') },
    ], false),
    FindInstancesAgentResponsePayload: o([{ json: 'appIdentifiers', js: 'appIdentifiers', typ: a(r('AppMetadata')) }], false),
    AppMetadata: o([
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'description', js: 'description', typ: u(undefined, '') },
        { json: 'desktopAgent', js: 'desktopAgent', typ: u(undefined, '') },
        { json: 'icons', js: 'icons', typ: u(undefined, a(r('Icon'))) },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
        { json: 'instanceMetadata', js: 'instanceMetadata', typ: u(undefined, m('any')) },
        { json: 'name', js: 'name', typ: u(undefined, '') },
        { json: 'resultType', js: 'resultType', typ: u(undefined, u(null, '')) },
        { json: 'screenshots', js: 'screenshots', typ: u(undefined, a(r('Image'))) },
        { json: 'title', js: 'title', typ: u(undefined, '') },
        { json: 'tooltip', js: 'tooltip', typ: u(undefined, '') },
        { json: 'version', js: 'version', typ: u(undefined, '') },
    ], false),
    Icon: o([
        { json: 'size', js: 'size', typ: u(undefined, '') },
        { json: 'src', js: 'src', typ: '' },
        { json: 'type', js: 'type', typ: u(undefined, '') },
    ], false),
    Image: o([
        { json: 'label', js: 'label', typ: u(undefined, '') },
        { json: 'size', js: 'size', typ: u(undefined, '') },
        { json: 'src', js: 'src', typ: '' },
        { json: 'type', js: 'type', typ: u(undefined, '') },
    ], false),
    FindInstancesBridgeErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindInstancesBridgeErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('MessagePayload') },
        { json: 'type', js: 'type', typ: r('FindInstancesAgentErrorResponseType') },
    ], false),
    FindInstancesBridgeErrorResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    MessagePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    FindInstancesBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('FindInstancesBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindInstancesBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindInstancesAgentRequestType') },
    ], false),
    FindInstancesBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('DestinationObject')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSourceObject') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    MetaSourceObject: o([
        { json: 'appId', js: 'appId', typ: u(undefined, '') },
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    FindInstancesBridgeRequestPayload: o([{ json: 'app', js: 'app', typ: r('AppIdentifier') }], false),
    FindInstancesBridgeResponse: o([
        { json: 'meta', js: 'meta', typ: r('BridgeResponseMessageMeta') },
        { json: 'payload', js: 'payload', typ: r('FindInstancesBridgeResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindInstancesAgentErrorResponseType') },
    ], false),
    FindInstancesBridgeResponsePayload: o([{ json: 'appIdentifiers', js: 'appIdentifiers', typ: a(r('AppMetadata')) }], false),
    FindIntentAgentErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentAgentErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentAgentErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentAgentErrorResponseType') },
    ], false),
    FindIntentAgentErrorResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentAgentErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    FindIntentAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindIntentAgentRequestType') },
    ], false),
    FindIntentAgentRequestMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
        { json: 'destination', js: 'destination', typ: u(undefined, r('BridgeParticipantIdentifier')) },
    ], false),
    FindIntentAgentRequestPayload: o([
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
        { json: 'intent', js: 'intent', typ: '' },
        { json: 'resultType', js: 'resultType', typ: u(undefined, '') },
    ], false),
    FindIntentAgentResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentAgentResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentAgentResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentAgentErrorResponseType') },
    ], false),
    FindIntentAgentResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentAgentResponsePayload: o([{ json: 'appIntent', js: 'appIntent', typ: r('AppIntent') }], false),
    AppIntent: o([
        { json: 'apps', js: 'apps', typ: a(r('AppMetadata')) },
        { json: 'intent', js: 'intent', typ: r('IntentMetadata') },
    ], false),
    IntentMetadata: o([
        { json: 'displayName', js: 'displayName', typ: u(undefined, '') },
        { json: 'name', js: 'name', typ: '' },
    ], false),
    FindIntentBridgeErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentBridgeErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentBridgeErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentAgentErrorResponseType') },
    ], false),
    FindIntentBridgeErrorResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentBridgeErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    FindIntentBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindIntentAgentRequestType') },
    ], false),
    FindIntentBridgeRequestMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('BridgeParticipantIdentifier') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
        { json: 'destination', js: 'destination', typ: u(undefined, r('BridgeParticipantIdentifier')) },
    ], false),
    FindIntentBridgeRequestPayload: o([
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
        { json: 'intent', js: 'intent', typ: '' },
        { json: 'resultType', js: 'resultType', typ: u(undefined, '') },
    ], false),
    FindIntentBridgeResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentBridgeResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentBridgeResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentAgentErrorResponseType') },
    ], false),
    FindIntentBridgeResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: u(undefined, a(r('ResponseErrorDetail'))) },
        { json: 'errorSources', js: 'errorSources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'sources', js: 'sources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentBridgeResponsePayload: o([{ json: 'appIntent', js: 'appIntent', typ: r('AppIntent') }], false),
    FindIntentsByContextAgentErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentsByContextAgentErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextAgentErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextAgentErrorResponseType') },
    ], false),
    FindIntentsByContextAgentErrorResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentsByContextAgentErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    FindIntentsByContextAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentsByContextAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextAgentRequestType') },
    ], false),
    FindIntentsByContextAgentRequestMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceObject')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
        { json: 'destination', js: 'destination', typ: u(undefined, r('BridgeParticipantIdentifier')) },
    ], false),
    FindIntentsByContextAgentRequestPayload: o([
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'resultType', js: 'resultType', typ: u(undefined, '') },
    ], false),
    FindIntentsByContextAgentResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentsByContextAgentResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextAgentResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextAgentErrorResponseType') },
    ], false),
    FindIntentsByContextAgentResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentsByContextAgentResponsePayload: o([{ json: 'appIntents', js: 'appIntents', typ: a(r('AppIntent')) }], false),
    FindIntentsByContextBridgeErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentsByContextBridgeErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextBridgeErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextAgentErrorResponseType') },
    ], false),
    FindIntentsByContextBridgeErrorResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentsByContextBridgeErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    FindIntentsByContextBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentsByContextBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextAgentRequestType') },
    ], false),
    FindIntentsByContextBridgeRequestMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
        { json: 'destination', js: 'destination', typ: u(undefined, r('BridgeParticipantIdentifier')) },
    ], false),
    FindIntentsByContextBridgeRequestPayload: o([
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'resultType', js: 'resultType', typ: u(undefined, '') },
    ], false),
    FindIntentsByContextBridgeResponse: o([
        { json: 'meta', js: 'meta', typ: r('FindIntentsByContextBridgeResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('FindIntentsByContextBridgeResponsePayload') },
        { json: 'type', js: 'type', typ: r('FindIntentsByContextAgentErrorResponseType') },
    ], false),
    FindIntentsByContextBridgeResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: u(undefined, a(r('ResponseErrorDetail'))) },
        { json: 'errorSources', js: 'errorSources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'sources', js: 'sources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    FindIntentsByContextBridgeResponsePayload: o([{ json: 'appIntents', js: 'appIntents', typ: a(r('AppIntent')) }], false),
    GetAppMetadataAgentErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('GetAppMetadataAgentErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataAgentErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataAgentErrorResponseType') },
    ], false),
    GetAppMetadataAgentErrorResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    GetAppMetadataAgentErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    GetAppMetadataAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('GetAppMetadataAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataAgentRequestType') },
    ], false),
    GetAppMetadataAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('DestinationObject')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceIdentifier')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    GetAppMetadataAgentRequestPayload: o([{ json: 'app', js: 'app', typ: r('AppObject') }], false),
    AppObject: o([
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    GetAppMetadataAgentResponse: o([
        { json: 'meta', js: 'meta', typ: r('GetAppMetadataAgentResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataAgentResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataAgentErrorResponseType') },
    ], false),
    GetAppMetadataAgentResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    GetAppMetadataAgentResponsePayload: o([{ json: 'appMetadata', js: 'appMetadata', typ: r('AppMetadata') }], false),
    GetAppMetadataBridgeErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('GetAppMetadataBridgeErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataBridgeErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataAgentErrorResponseType') },
    ], false),
    GetAppMetadataBridgeErrorResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    GetAppMetadataBridgeErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    GetAppMetadataBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('GetAppMetadataBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataAgentRequestType') },
    ], false),
    GetAppMetadataBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('DestinationObject')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSourceObject') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    GetAppMetadataBridgeRequestPayload: o([{ json: 'app', js: 'app', typ: r('AppObject') }], false),
    GetAppMetadataBridgeResponse: o([
        { json: 'meta', js: 'meta', typ: r('GetAppMetadataBridgeResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('GetAppMetadataBridgeResponsePayload') },
        { json: 'type', js: 'type', typ: r('GetAppMetadataAgentErrorResponseType') },
    ], false),
    GetAppMetadataBridgeResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: u(undefined, a(r('ResponseErrorDetail'))) },
        { json: 'errorSources', js: 'errorSources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'sources', js: 'sources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    GetAppMetadataBridgeResponsePayload: o([{ json: 'appMetadata', js: 'appMetadata', typ: r('AppMetadata') }], false),
    OpenAgentErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('OpenAgentErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenAgentErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('OpenAgentErrorResponseType') },
    ], false),
    OpenAgentErrorResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    OpenAgentErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('OpenErrorResponsePayload') }], false),
    OpenAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('OpenAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('OpenAgentRequestType') },
    ], false),
    OpenAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('DestinationObject')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('SourceObject') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    OpenAgentRequestPayload: o([
        { json: 'app', js: 'app', typ: r('AppToOpen') },
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
    ], false),
    AppToOpen: o([
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    OpenAgentResponse: o([
        { json: 'meta', js: 'meta', typ: r('OpenAgentResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenAgentResponsePayload') },
        { json: 'type', js: 'type', typ: r('OpenAgentErrorResponseType') },
    ], false),
    OpenAgentResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    OpenAgentResponsePayload: o([{ json: 'appIdentifier', js: 'appIdentifier', typ: r('AppIdentifier') }], false),
    OpenBridgeErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('OpenBridgeErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenBridgeErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('OpenAgentErrorResponseType') },
    ], false),
    OpenBridgeErrorResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    OpenBridgeErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('OpenErrorResponsePayload') }], false),
    OpenBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('OpenBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('OpenAgentRequestType') },
    ], false),
    OpenBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('DestinationObject')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    OpenBridgeRequestPayload: o([
        { json: 'app', js: 'app', typ: r('AppToOpen') },
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
    ], false),
    OpenBridgeResponse: o([
        { json: 'meta', js: 'meta', typ: r('OpenBridgeResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('OpenBridgeResponsePayload') },
        { json: 'type', js: 'type', typ: r('OpenAgentErrorResponseType') },
    ], false),
    OpenBridgeResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: u(undefined, a(r('ResponseErrorDetail'))) },
        { json: 'errorSources', js: 'errorSources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'sources', js: 'sources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    OpenBridgeResponsePayload: o([{ json: 'appIdentifier', js: 'appIdentifier', typ: r('AppIdentifier') }], false),
    PrivateChannelBroadcastAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelBroadcastAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelBroadcastAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelBroadcastAgentRequestType') },
    ], false),
    PrivateChannelBroadcastAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceObject')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    MetaDestination: o([
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    PrivateChannelBroadcastAgentRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'context', js: 'context', typ: r('Context') },
    ], false),
    PrivateChannelBroadcastBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelBroadcastBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelBroadcastBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelBroadcastAgentRequestType') },
    ], false),
    PrivateChannelBroadcastBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelBroadcastBridgeRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'context', js: 'context', typ: r('Context') },
    ], false),
    PrivateChannelEventListenerAddedAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelEventListenerAddedAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelEventListenerAddedAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelEventListenerAddedAgentRequestType') },
    ], false),
    PrivateChannelEventListenerAddedAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceObject')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelEventListenerAddedAgentRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'listenerType', js: 'listenerType', typ: r('PrivateChannelEventType') },
    ], false),
    PrivateChannelEventListenerAddedBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelEventListenerAddedBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelEventListenerAddedBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelEventListenerAddedAgentRequestType') },
    ], false),
    PrivateChannelEventListenerAddedBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelEventListenerAddedBridgeRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'listenerType', js: 'listenerType', typ: r('PrivateChannelEventType') },
    ], false),
    PrivateChannelEventListenerRemovedAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelEventListenerRemovedAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelEventListenerRemovedAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelEventListenerRemovedAgentRequestType') },
    ], false),
    PrivateChannelEventListenerRemovedAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceObject')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelEventListenerRemovedAgentRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'listenerType', js: 'listenerType', typ: r('PrivateChannelEventType') },
    ], false),
    PrivateChannelEventListenerRemovedBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelEventListenerRemovedBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelEventListenerRemovedBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelEventListenerRemovedAgentRequestType') },
    ], false),
    PrivateChannelEventListenerRemovedBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelEventListenerRemovedBridgeRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'listenerType', js: 'listenerType', typ: r('PrivateChannelEventType') },
    ], false),
    PrivateChannelOnAddContextListenerAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelOnAddContextListenerAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnAddContextListenerAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnAddContextListenerAgentRequestType') },
    ], false),
    PrivateChannelOnAddContextListenerAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceObject')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelOnAddContextListenerAgentRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
    ], false),
    PrivateChannelOnAddContextListenerBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelOnAddContextListenerBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnAddContextListenerBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnAddContextListenerAgentRequestType') },
    ], false),
    PrivateChannelOnAddContextListenerBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelOnAddContextListenerBridgeRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
    ], false),
    PrivateChannelOnDisconnectAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelOnDisconnectAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnDisconnectAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnDisconnectAgentRequestType') },
    ], false),
    PrivateChannelOnDisconnectAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceObject')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelOnDisconnectAgentRequestPayload: o([{ json: 'channelId', js: 'channelId', typ: '' }], false),
    PrivateChannelOnDisconnectBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelOnDisconnectBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnDisconnectBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnDisconnectAgentRequestType') },
    ], false),
    PrivateChannelOnDisconnectBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelOnDisconnectBridgeRequestPayload: o([{ json: 'channelId', js: 'channelId', typ: '' }], false),
    PrivateChannelOnUnsubscribeAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('PrivateChannelOnUnsubscribeAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnUnsubscribeAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnUnsubscribeAgentRequestType') },
    ], false),
    PrivateChannelOnUnsubscribeAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: u(undefined, r('SourceObject')) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelOnUnsubscribeAgentRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
    ], false),
    PrivateChannelOnUnsubscribeBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('ERequestMetadata') },
        { json: 'payload', js: 'payload', typ: r('PrivateChannelOnUnsubscribeBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('PrivateChannelOnUnsubscribeAgentRequestType') },
    ], false),
    ERequestMetadata: o([
        { json: 'destination', js: 'destination', typ: u(undefined, r('MetaDestination')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    PrivateChannelOnUnsubscribeBridgeRequestPayload: o([
        { json: 'channelId', js: 'channelId', typ: '' },
        { json: 'contextType', js: 'contextType', typ: u(null, '') },
    ], false),
    RaiseIntentAgentErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentAgentErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentAgentErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentAgentErrorResponseType') },
    ], false),
    RaiseIntentAgentErrorResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentAgentErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    RaiseIntentAgentRequest: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentAgentRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentAgentRequestPayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentAgentRequestType') },
    ], false),
    RaiseIntentAgentRequestMeta: o([
        { json: 'destination', js: 'destination', typ: r('MetaDestination') },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('SourceObject') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentAgentRequestPayload: o([
        { json: 'app', js: 'app', typ: r('AppDestinationIdentifier') },
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'intent', js: 'intent', typ: '' },
    ], false),
    AppDestinationIdentifier: o([
        { json: 'desktopAgent', js: 'desktopAgent', typ: '' },
        { json: 'appId', js: 'appId', typ: '' },
        { json: 'instanceId', js: 'instanceId', typ: u(undefined, '') },
    ], 'any'),
    RaiseIntentAgentResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentAgentResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentAgentResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentAgentErrorResponseType') },
    ], false),
    RaiseIntentAgentResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentAgentResponsePayload: o([{ json: 'intentResolution', js: 'intentResolution', typ: r('IntentResolution') }], false),
    IntentResolution: o([
        { json: 'intent', js: 'intent', typ: '' },
        { json: 'source', js: 'source', typ: r('AppIdentifier') },
    ], false),
    RaiseIntentBridgeErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentBridgeErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentBridgeErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentAgentErrorResponseType') },
    ], false),
    RaiseIntentBridgeErrorResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentBridgeErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('FindInstancesErrors') }], false),
    RaiseIntentBridgeRequest: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentBridgeRequestMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentBridgeRequestPayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentAgentRequestType') },
    ], false),
    RaiseIntentBridgeRequestMeta: o([
        { json: 'destination', js: 'destination', typ: r('MetaDestination') },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'source', js: 'source', typ: r('MetaSource') },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentBridgeRequestPayload: o([
        { json: 'app', js: 'app', typ: r('AppDestinationIdentifier') },
        { json: 'context', js: 'context', typ: r('Context') },
        { json: 'intent', js: 'intent', typ: '' },
    ], false),
    RaiseIntentBridgeResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentBridgeResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentBridgeResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentAgentErrorResponseType') },
    ], false),
    RaiseIntentBridgeResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: u(undefined, a(r('ResponseErrorDetail'))) },
        { json: 'errorSources', js: 'errorSources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'sources', js: 'sources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentBridgeResponsePayload: o([{ json: 'intentResolution', js: 'intentResolution', typ: r('IntentResolution') }], false),
    RaiseIntentResultAgentErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentResultAgentErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentResultAgentErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentResultAgentErrorResponseType') },
    ], false),
    RaiseIntentResultAgentErrorResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentResultAgentErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('RaiseIntentResultErrorMessage') }], false),
    RaiseIntentResultAgentResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentResultAgentResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentResultAgentResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentResultAgentErrorResponseType') },
    ], false),
    RaiseIntentResultAgentResponseMeta: o([
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentResultAgentResponsePayload: o([{ json: 'intentResult', js: 'intentResult', typ: r('IntentResult') }], false),
    IntentResult: o([
        { json: 'context', js: 'context', typ: u(undefined, r('Context')) },
        { json: 'channel', js: 'channel', typ: u(undefined, r('Channel')) },
    ], false),
    Channel: o([
        { json: 'displayMetadata', js: 'displayMetadata', typ: u(undefined, r('DisplayMetadata')) },
        { json: 'id', js: 'id', typ: '' },
        { json: 'type', js: 'type', typ: r('Type') },
    ], false),
    DisplayMetadata: o([
        { json: 'color', js: 'color', typ: u(undefined, '') },
        { json: 'glyph', js: 'glyph', typ: u(undefined, '') },
        { json: 'name', js: 'name', typ: u(undefined, '') },
    ], false),
    RaiseIntentResultBridgeErrorResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentResultBridgeErrorResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentResultBridgeErrorResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentResultAgentErrorResponseType') },
    ], false),
    RaiseIntentResultBridgeErrorResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: a(r('ResponseErrorDetail')) },
        { json: 'errorSources', js: 'errorSources', typ: a(r('DesktopAgentIdentifier')) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentResultBridgeErrorResponsePayload: o([{ json: 'error', js: 'error', typ: r('RaiseIntentResultErrorMessage') }], false),
    RaiseIntentResultBridgeResponse: o([
        { json: 'meta', js: 'meta', typ: r('RaiseIntentResultBridgeResponseMeta') },
        { json: 'payload', js: 'payload', typ: r('RaiseIntentResultBridgeResponsePayload') },
        { json: 'type', js: 'type', typ: r('RaiseIntentResultAgentErrorResponseType') },
    ], false),
    RaiseIntentResultBridgeResponseMeta: o([
        { json: 'errorDetails', js: 'errorDetails', typ: u(undefined, a(r('ResponseErrorDetail'))) },
        { json: 'errorSources', js: 'errorSources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'requestUuid', js: 'requestUuid', typ: '' },
        { json: 'responseUuid', js: 'responseUuid', typ: '' },
        { json: 'sources', js: 'sources', typ: u(undefined, a(r('DesktopAgentIdentifier'))) },
        { json: 'timestamp', js: 'timestamp', typ: Date },
    ], false),
    RaiseIntentResultBridgeResponsePayload: o([{ json: 'intentResult', js: 'intentResult', typ: r('IntentResult') }], false),
    ResponseErrorDetail: [
        'ApiTimeout',
        'AccessDenied',
        'AgentDisconnected',
        'AppNotFound',
        'AppTimeout',
        'CreationFailed',
        'DesktopAgentNotFound',
        'ErrorOnLaunch',
        'IntentDeliveryFailed',
        'IntentHandlerRejected',
        'IntentListenerConflict',
        'InvalidArguments',
        'MalformedContext',
        'MalformedMessage',
        'NoAppsFound',
        'NoChannelFound',
        'NoResultReturned',
        'NotConnectedToBridge',
        'ResolverTimeout',
        'ResolverUnavailable',
        'ResponseToBridgeTimedOut',
        'TargetAppUnavailable',
        'TargetInstanceUnavailable',
        'UserCancelledResolution',
    ],
    ResponseMessageType: [
        'findInstancesResponse',
        'findIntentResponse',
        'findIntentsByContextResponse',
        'getAppMetadataResponse',
        'openResponse',
        'raiseIntentResponse',
        'raiseIntentResultResponse',
    ],
    RequestMessageType: [
        'broadcastRequest',
        'findInstancesRequest',
        'findIntentRequest',
        'findIntentsByContextRequest',
        'getAppMetadataRequest',
        'openRequest',
        'PrivateChannel.broadcast',
        'PrivateChannel.eventListenerAdded',
        'PrivateChannel.eventListenerRemoved',
        'PrivateChannel.onAddContextListener',
        'PrivateChannel.onDisconnect',
        'PrivateChannel.onUnsubscribe',
        'raiseIntentRequest',
    ],
    BroadcastAgentRequestType: ['broadcastRequest'],
    ConnectionStepMessageType: ['authenticationFailed', 'connectedAgentsUpdate', 'handshake', 'hello'],
    ConnectionStep2HelloType: ['hello'],
    ConnectionStep3HandshakeType: ['handshake'],
    ConnectionStep4AuthenticationFailedType: ['authenticationFailed'],
    ConnectionStep6ConnectedAgentsUpdateType: ['connectedAgentsUpdate'],
    FindInstancesErrors: [
        'ApiTimeout',
        'AgentDisconnected',
        'DesktopAgentNotFound',
        'IntentDeliveryFailed',
        'IntentListenerConflict',
        'InvalidArguments',
        'MalformedContext',
        'MalformedMessage',
        'NoAppsFound',
        'NotConnectedToBridge',
        'ResolverTimeout',
        'ResolverUnavailable',
        'ResponseToBridgeTimedOut',
        'TargetAppUnavailable',
        'TargetInstanceUnavailable',
        'UserCancelledResolution',
    ],
    FindInstancesAgentErrorResponseType: ['findInstancesResponse'],
    FindInstancesAgentRequestType: ['findInstancesRequest'],
    FindIntentAgentErrorResponseType: ['findIntentResponse'],
    FindIntentAgentRequestType: ['findIntentRequest'],
    FindIntentsByContextAgentErrorResponseType: ['findIntentsByContextResponse'],
    FindIntentsByContextAgentRequestType: ['findIntentsByContextRequest'],
    GetAppMetadataAgentErrorResponseType: ['getAppMetadataResponse'],
    GetAppMetadataAgentRequestType: ['getAppMetadataRequest'],
    OpenErrorResponsePayload: [
        'ApiTimeout',
        'AgentDisconnected',
        'AppNotFound',
        'AppTimeout',
        'DesktopAgentNotFound',
        'ErrorOnLaunch',
        'InvalidArguments',
        'MalformedContext',
        'MalformedMessage',
        'NotConnectedToBridge',
        'ResolverUnavailable',
        'ResponseToBridgeTimedOut',
    ],
    OpenAgentErrorResponseType: ['openResponse'],
    OpenAgentRequestType: ['openRequest'],
    PrivateChannelBroadcastAgentRequestType: ['PrivateChannel.broadcast'],
    PrivateChannelEventType: ['addContextListener', 'disconnect', 'unsubscribe'],
    PrivateChannelEventListenerAddedAgentRequestType: ['PrivateChannel.eventListenerAdded'],
    PrivateChannelEventListenerRemovedAgentRequestType: ['PrivateChannel.eventListenerRemoved'],
    PrivateChannelOnAddContextListenerAgentRequestType: ['PrivateChannel.onAddContextListener'],
    PrivateChannelOnDisconnectAgentRequestType: ['PrivateChannel.onDisconnect'],
    PrivateChannelOnUnsubscribeAgentRequestType: ['PrivateChannel.onUnsubscribe'],
    RaiseIntentAgentErrorResponseType: ['raiseIntentResponse'],
    RaiseIntentAgentRequestType: ['raiseIntentRequest'],
    RaiseIntentResultErrorMessage: [
        'ApiTimeout',
        'AgentDisconnected',
        'IntentHandlerRejected',
        'MalformedMessage',
        'NoResultReturned',
        'NotConnectedToBridge',
        'ResponseToBridgeTimedOut',
    ],
    RaiseIntentResultAgentErrorResponseType: ['raiseIntentResultResponse'],
    Type: ['app', 'private', 'user'],
};


/***/ },

/***/ "./node_modules/@finos/fdc3-schema/dist/src/index.js"
/*!***********************************************************!*\
  !*** ./node_modules/@finos/fdc3-schema/dist/src/index.js ***!
  \***********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BridgingTypes: () => (/* reexport module object */ _generated_bridging_BridgingTypes_js__WEBPACK_IMPORTED_MODULE_1__),
/* harmony export */   BrowserTypes: () => (/* reexport module object */ _generated_api_BrowserTypes_js__WEBPACK_IMPORTED_MODULE_0__)
/* harmony export */ });
/* harmony import */ var _generated_api_BrowserTypes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../generated/api/BrowserTypes.js */ "./node_modules/@finos/fdc3-schema/dist/generated/api/BrowserTypes.js");
/* harmony import */ var _generated_bridging_BridgingTypes_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../generated/bridging/BridgingTypes.js */ "./node_modules/@finos/fdc3-schema/dist/generated/bridging/BridgingTypes.js");





/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/AppIntent.js"
/*!*********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/AppIntent.js ***!
  \*********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/AppMetadata.js"
/*!***********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/AppMetadata.js ***!
  \***********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Channel.js"
/*!*******************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Channel.js ***!
  \*******************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/ContextMetadata.js"
/*!***************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/ContextMetadata.js ***!
  \***************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/DesktopAgent.js"
/*!************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/DesktopAgent.js ***!
  \************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/DisplayMetadata.js"
/*!***************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/DisplayMetadata.js ***!
  \***************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Errors.js"
/*!******************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Errors.js ***!
  \******************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AgentError: () => (/* binding */ AgentError),
/* harmony export */   BridgingError: () => (/* binding */ BridgingError),
/* harmony export */   ChannelError: () => (/* binding */ ChannelError),
/* harmony export */   OpenError: () => (/* binding */ OpenError),
/* harmony export */   ResolveError: () => (/* binding */ ResolveError),
/* harmony export */   ResultError: () => (/* binding */ ResultError)
/* harmony export */ });
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */
/**
 * Contains constants representing the errors that can be encountered when trying to connect to a web-based Desktop Agent with the getAgent function.
 */
var AgentError;
(function (AgentError) {
    /** Returned if no Desktop Agent was found by any means available or
     * if the Agent previously connected to is not contactable on a
     * subsequent connection attempt.*/
    AgentError["AgentNotFound"] = "AgentNotFound";
    /** Returned if validation of the app identity by the Desktop Agent
     * Failed or the app is not being allowed to connect to the Desktop Agent
     * for another reason. */
    AgentError["AccessDenied"] = "AccessDenied";
    /** Returned if an error or exception occurs while trying to set
     * up communication with a Desktop Agent. */
    AgentError["ErrorOnConnect"] = "ErrorOnConnect";
    /** Returned if the failover function is not a function, or it did not
     * resolve to one of the allowed types. */
    AgentError["InvalidFailover"] = "InvalidFailover";
    /** Returned if an API call rejects after a timeout. Used where an API call
     * is not aligned to another error enumeration.
     */
    AgentError["ApiTimeout"] = "ApiTimeout";
})(AgentError || (AgentError = {}));
/** Constants representing the errors that can be encountered when calling the `open` method on the DesktopAgent object (`fdc3`). */
var OpenError;
(function (OpenError) {
    /** Returned if the specified application is not found.*/
    OpenError["AppNotFound"] = "AppNotFound";
    /** Returned if the specified application fails to launch correctly.*/
    OpenError["ErrorOnLaunch"] = "ErrorOnLaunch";
    /** Returned if the specified application launches but fails to add a context listener in order to receive the context passed to the `fdc3.open` call.*/
    OpenError["AppTimeout"] = "AppTimeout";
    /** Returned if the FDC3 desktop agent implementation is not currently able to handle the request.*/
    OpenError["ResolverUnavailable"] = "ResolverUnavailable";
    /** Returned if a call to the `open` function is made with an invalid context argument. Contexts should be Objects with at least a `type` field that has a `string` value.*/
    OpenError["MalformedContext"] = "MalformedContext";
    /** @experimental Returned if the specified Desktop Agent is not found, via a connected Desktop Agent Bridge.*/
    OpenError["DesktopAgentNotFound"] = "DesktopAgentNotFound";
    /** Returned if a timeout occurs before a call to open is resolved for any reason other than the not adding its context listener in time.*/
    OpenError["ApiTimeout"] = "ApiTimeout";
    /** Returned when incorrect arguments are passed to API calls.*/
    OpenError["InvalidArguments"] = "InvalidArguments";
})(OpenError || (OpenError = {}));
/** Constants representing the errors that can be encountered when calling the `findIntent`, `findIntentsByContext`, `raiseIntent` or `raiseIntentForContext` methods on the DesktopAgent (`fdc3`). */
var ResolveError;
(function (ResolveError) {
    /** SHOULD be returned if no apps are available that can resolve the intent and context combination.*/
    ResolveError["NoAppsFound"] = "NoAppsFound";
    /** Returned if the FDC3 desktop agent implementation is not currently able to handle the request.*/
    ResolveError["ResolverUnavailable"] = "ResolverUnavailable";
    /** Returned if the user cancelled the resolution request, for example by closing or cancelling a resolver UI.*/
    ResolveError["UserCancelled"] = "UserCancelledResolution";
    /** SHOULD be returned if a timeout cancels an intent resolution that required user interaction. Please use `ResolverUnavailable` instead for situations where a resolver UI or similar fails.*/
    ResolveError["ResolverTimeout"] = "ResolverTimeout";
    /** Returned if a specified target application is not available or a new instance of it cannot be opened. */
    ResolveError["TargetAppUnavailable"] = "TargetAppUnavailable";
    /** Returned if a specified target application instance is not available, for example because it has been closed. */
    ResolveError["TargetInstanceUnavailable"] = "TargetInstanceUnavailable";
    /** Returned if the intent and context could not be delivered to the selected application or instance, for example because it has not added an intent handler within a timeout.*/
    ResolveError["IntentDeliveryFailed"] = "IntentDeliveryFailed";
    /** Returned if a call to one of the `raiseIntent` functions is made with an invalid context argument. Contexts should be Objects with at least a `type` field that has a `string` value.*/
    ResolveError["MalformedContext"] = "MalformedContext";
    /** Returned if `fdc3.addIntentListener` is called for a specified intent that the application has already added a listener for and has not subsequently removed it. */
    ResolveError["IntentListenerConflict"] = "IntentListenerConflict";
    /** @experimental Returned if the specified Desktop Agent is not found, via a connected Desktop Agent Bridge.*/
    ResolveError["DesktopAgentNotFound"] = "DesktopAgentNotFound";
    /** Returned if a timeout occurs before the API call is resolved for any reason other than the resolver timing out (use ResolverTimeout) or an app launched by a raiseIntent function doesn't add its intent listener in time (use IntentDeliveryFailed).*/
    ResolveError["ApiTimeout"] = "ApiTimeout";
    /** Returned when incorrect arguments are passed to API calls.*/
    ResolveError["InvalidArguments"] = "InvalidArguments";
})(ResolveError || (ResolveError = {}));
var ResultError;
(function (ResultError) {
    /** Returned if the intent handler exited without returning a valid result (a promise resolving to a Context, Channel object or void). */
    ResultError["NoResultReturned"] = "NoResultReturned";
    /** Returned if the Intent handler function processing the raised intent throws an error or rejects the Promise it returned. */
    ResultError["IntentHandlerRejected"] = "IntentHandlerRejected";
    /** Returned if a timeout occurs before the getResult() API call is resolved.*/
    ResultError["ApiTimeout"] = "ApiTimeout";
})(ResultError || (ResultError = {}));
var ChannelError;
(function (ChannelError) {
    /** Returned if the specified channel is not found when attempting to join a channel via the `joinUserChannel` function  of the DesktopAgent (`fdc3`).*/
    ChannelError["NoChannelFound"] = "NoChannelFound";
    /** SHOULD be returned when a request to join a user channel or to a retrieve a Channel object via the `joinUserChannel` or `getOrCreateChannel` methods of the DesktopAgent (`fdc3`) object is denied. */
    ChannelError["AccessDenied"] = "AccessDenied";
    /** SHOULD be returned when a channel cannot be created or retrieved via the `getOrCreateChannel` method of the DesktopAgent (`fdc3`).*/
    ChannelError["CreationFailed"] = "CreationFailed";
    /** Returned if a call to the `broadcast` functions is made with an invalid context argument. Contexts should be Objects with at least a `type` field that has a `string` value.*/
    ChannelError["MalformedContext"] = "MalformedContext";
    /** Returned if a timeout occurs before any Channel related API call is resolved.*/
    ChannelError["ApiTimeout"] = "ApiTimeout";
    /** Returned when incorrect arguments are passed to API calls.*/
    ChannelError["InvalidArguments"] = "InvalidArguments";
})(ChannelError || (ChannelError = {}));
var BridgingError;
(function (BridgingError) {
    /** @experimental Returned if a Desktop Agent did not return a response, via Desktop Agent Bridging, within the alloted timeout. */
    BridgingError["ResponseTimedOut"] = "ResponseToBridgeTimedOut";
    /** @experimental Returned if a Desktop Agent that has been targeted by a particular request has been disconnected from the Bridge before a response has been received from it. */
    BridgingError["AgentDisconnected"] = "AgentDisconnected";
    /** @experimental Returned for FDC3 API calls that are specified with arguments indicating that a remote Desktop agent should be targeted (e.g. raiseIntent with an app on a remote DesktopAgent targeted), when the local Desktop Agent is not connected to a bridge. */
    BridgingError["NotConnectedToBridge"] = "NotConnectedToBridge";
    /** @experimental Returned if a message to a Bridge deviates from the schema for that message sufficiently that it could not be processed. */
    BridgingError["MalformedMessage"] = "MalformedMessage";
})(BridgingError || (BridgingError = {}));


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Events.js"
/*!******************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Events.js ***!
  \******************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/GetAgent.js"
/*!********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/GetAgent.js ***!
  \********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX: () => (/* binding */ DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX),
/* harmony export */   LogLevel: () => (/* binding */ LogLevel),
/* harmony export */   WebDesktopAgentType: () => (/* binding */ WebDesktopAgentType)
/* harmony export */ });
/**
 * Type representing the different log-levels that can be set.
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["NONE"] = 0] = "NONE";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
})(LogLevel || (LogLevel = {}));
/** Enumeration of values used to describe types of web-based
 *  Desktop Agent. Each 'type' refers to the means by which
 *  a connection to the agent is made and/or an interface to it
 *  received. */
var WebDesktopAgentType;
(function (WebDesktopAgentType) {
    /** Denotes Desktop Agents that inject the FDC3 interface
     *  at `window.fdc3`. */
    WebDesktopAgentType["Preload"] = "PRELOAD";
    /** Denotes Desktop Agents that run (or provide an interface)
     *  within a parent window or frame, a reference to which
     *  will be found at `window.opener`, `window.parent`,
     *  `window.parent.opener` etc. */
    WebDesktopAgentType["ProxyParent"] = "PROXY_PARENT";
    /** Denotes Desktop Agents that are connected to by loading a URL
     *  into a hidden iframe whose URL was returned by a parent window
     *  or frame. */
    WebDesktopAgentType["ProxyUrl"] = "PROXY_URL";
    /** Denotes a Desktop Agent that was returned by a failover
     *  function that was passed by the application. */
    WebDesktopAgentType["Failover"] = "FAILOVER";
})(WebDesktopAgentType || (WebDesktopAgentType = {}));
const DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX = 'fdc3-desktop-agent-details';


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Icon.js"
/*!****************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Icon.js ***!
  \****************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Image.js"
/*!*****************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Image.js ***!
  \*****************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/ImplementationMetadata.js"
/*!**********************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/ImplementationMetadata.js ***!
  \**********************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/IntentMetadata.js"
/*!**************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/IntentMetadata.js ***!
  \**************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/IntentResolution.js"
/*!****************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/IntentResolution.js ***!
  \****************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Listener.js"
/*!********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Listener.js ***!
  \********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Methods.js"
/*!*******************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Methods.js ***!
  \*******************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addContextListener: () => (/* binding */ addContextListener),
/* harmony export */   addEventListener: () => (/* binding */ addEventListener),
/* harmony export */   addIntentListener: () => (/* binding */ addIntentListener),
/* harmony export */   broadcast: () => (/* binding */ broadcast),
/* harmony export */   compareVersionNumbers: () => (/* binding */ compareVersionNumbers),
/* harmony export */   createPrivateChannel: () => (/* binding */ createPrivateChannel),
/* harmony export */   findInstances: () => (/* binding */ findInstances),
/* harmony export */   findIntent: () => (/* binding */ findIntent),
/* harmony export */   findIntentsByContext: () => (/* binding */ findIntentsByContext),
/* harmony export */   getAppMetadata: () => (/* binding */ getAppMetadata),
/* harmony export */   getCurrentChannel: () => (/* binding */ getCurrentChannel),
/* harmony export */   getInfo: () => (/* binding */ getInfo),
/* harmony export */   getOrCreateChannel: () => (/* binding */ getOrCreateChannel),
/* harmony export */   getSystemChannels: () => (/* binding */ getSystemChannels),
/* harmony export */   getUserChannels: () => (/* binding */ getUserChannels),
/* harmony export */   isStandardContextType: () => (/* binding */ isStandardContextType),
/* harmony export */   isStandardIntent: () => (/* binding */ isStandardIntent),
/* harmony export */   joinChannel: () => (/* binding */ joinChannel),
/* harmony export */   joinUserChannel: () => (/* binding */ joinUserChannel),
/* harmony export */   leaveCurrentChannel: () => (/* binding */ leaveCurrentChannel),
/* harmony export */   open: () => (/* binding */ open),
/* harmony export */   raiseIntent: () => (/* binding */ raiseIntent),
/* harmony export */   raiseIntentForContext: () => (/* binding */ raiseIntentForContext),
/* harmony export */   versionIsAtLeast: () => (/* binding */ versionIsAtLeast)
/* harmony export */ });
/* harmony import */ var _internal_contextConfiguration_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../internal/contextConfiguration.js */ "./node_modules/@finos/fdc3-standard/dist/src/internal/contextConfiguration.js");
/* harmony import */ var _internal_intentConfiguration_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../internal/intentConfiguration.js */ "./node_modules/@finos/fdc3-standard/dist/src/internal/intentConfiguration.js");


const UnavailableError = new Error('FDC3 DesktopAgent not available at `window.fdc3`.');
/**
 * @deprecated This function depends on window.fdc3 (which may not be set for web-based Desktop Agents)
 * and does not wait on the fdc3Ready event, so it may return errors on container-based Desktop Agents.
 * Use `const fdc3 = getAgent()` to retrieve (and wait for) a reference to the FDC3 API instead.
 */
function rejectIfNoGlobal(f) {
    return window.fdc3 ? f(window.fdc3) : Promise.reject(UnavailableError);
}
function isString(app) {
    return !!app && typeof app === 'string';
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function open(app, context) {
    if (isString(app)) {
        return window.fdc3 ? window.fdc3.open(app, context) : Promise.reject(UnavailableError);
    }
    else {
        return window.fdc3 ? window.fdc3.open(app, context) : Promise.reject(UnavailableError);
    }
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function findIntent(intent, context, resultType) {
    return window.fdc3 ? window.fdc3.findIntent(intent, context, resultType) : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function findIntentsByContext(context, resultType) {
    return window.fdc3 ? window.fdc3.findIntentsByContext(context, resultType) : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function broadcast(context) {
    return window.fdc3 ? window.fdc3.broadcast(context) : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function raiseIntent(intent, context, app) {
    if (isString(app)) {
        return window.fdc3 ? window.fdc3.raiseIntent(intent, context, app) : Promise.reject(UnavailableError);
    }
    else {
        return window.fdc3 ? window.fdc3.raiseIntent(intent, context, app) : Promise.reject(UnavailableError);
    }
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function raiseIntentForContext(context, app) {
    if (isString(app)) {
        return window.fdc3 ? window.fdc3.raiseIntentForContext(context, app) : Promise.reject(UnavailableError);
    }
    else {
        return window.fdc3 ? window.fdc3.raiseIntentForContext(context, app) : Promise.reject(UnavailableError);
    }
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function addIntentListener(intent, handler) {
    return window.fdc3 ? window.fdc3.addIntentListener(intent, handler) : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function addContextListener(contextTypeOrHandler, handler) {
    //Handle (deprecated) function signature that allowed contextType argument to be omitted
    if (typeof contextTypeOrHandler !== 'function') {
        return window.fdc3
            ? window.fdc3.addContextListener(contextTypeOrHandler, handler)
            : Promise.reject(UnavailableError);
    }
    else {
        return window.fdc3
            ? window.fdc3.addContextListener(null, contextTypeOrHandler)
            : Promise.reject(UnavailableError);
    }
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function addEventListener(eventType, handler) {
    return rejectIfNoGlobal(fdc3 => fdc3.addEventListener(eventType, handler));
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function getUserChannels() {
    if (window.fdc3) {
        //fallback to getSystemChannels for FDC3 <2.0 implementations
        if (window.fdc3.getUserChannels) {
            return window.fdc3.getUserChannels();
        }
        else {
            return window.fdc3.getSystemChannels();
        }
    }
    else {
        return Promise.reject(UnavailableError);
    }
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function getSystemChannels() {
    //fall-forward to getUserChannels for FDC3 2.0+ implementations
    return getUserChannels();
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function joinUserChannel(channelId) {
    if (window.fdc3) {
        //fallback to joinChannel for FDC3 <2.0 implementations
        if (window.fdc3.joinUserChannel) {
            return window.fdc3.joinUserChannel(channelId);
        }
        else {
            return window.fdc3.joinChannel(channelId);
        }
    }
    else {
        return Promise.reject(UnavailableError);
    }
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function joinChannel(channelId) {
    //fall-forward to joinUserChannel for FDC3 2.0+ implementations
    return joinUserChannel(channelId);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function getOrCreateChannel(channelId) {
    return window.fdc3 ? window.fdc3.getOrCreateChannel(channelId) : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function getCurrentChannel() {
    return window.fdc3 ? window.fdc3.getCurrentChannel() : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function leaveCurrentChannel() {
    return window.fdc3 ? window.fdc3.leaveCurrentChannel() : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function createPrivateChannel() {
    return window.fdc3 ? window.fdc3.createPrivateChannel() : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function getInfo() {
    return window.fdc3 ? window.fdc3.getInfo() : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function getAppMetadata(app) {
    return window.fdc3 ? window.fdc3.getAppMetadata(app) : Promise.reject(UnavailableError);
}
/**
 * @deprecated Importing individual FDC3 API calls is deprecated. Use `getAgent` to retrieve
 * an FDC3 API reference and use the functions that it provides instead.
 */
function findInstances(app) {
    return window.fdc3 ? window.fdc3.findInstances(app) : Promise.reject(UnavailableError);
}
/**
 * Check if the given context is a standard context type.
 * @param contextType
 */
function isStandardContextType(contextType) {
    return _internal_contextConfiguration_js__WEBPACK_IMPORTED_MODULE_0__.StandardContextsSet.has(contextType);
}
/**
 * Check if the given intent is a standard intent.
 * @param intent
 */
function isStandardIntent(intent) {
    return _internal_intentConfiguration_js__WEBPACK_IMPORTED_MODULE_1__.StandardIntentsSet.has(intent);
}
/**
 * Compare numeric semver version number strings (in the form `1.2.3`).
 *
 * Returns `-1` if the first argument is a lower version number than the second,
 * `1` if the first argument is greater than the second, 0 if the arguments are
 * equal and `null` if an error occurred during the comparison.
 *
 * @param a
 * @param b
 */
const compareVersionNumbers = (a, b) => {
    try {
        const aVerArr = a.split('.').map(Number);
        const bVerArr = b.split('.').map(Number);
        for (let index = 0; index < Math.max(aVerArr.length, bVerArr.length); index++) {
            /* If one version number has more digits and the other does not, and they are otherwise equal,
               assume the longer is greater. E.g. 1.1.1 > 1.1 */
            if (index === aVerArr.length || aVerArr[index] < bVerArr[index]) {
                return -1;
            }
            else if (index === bVerArr.length || aVerArr[index] > bVerArr[index]) {
                return 1;
            }
        }
        return 0;
    }
    catch (e) {
        console.error('Failed to compare version strings', e);
        return null;
    }
};
/**
 * Check if the FDC3 version in an ImplementationMetadata object is greater than
 * or equal to the supplied numeric semver version number string (in the form `1.2.3`).
 *
 * Returns a boolean or null if an error occurred while comparing the version numbers.
 *
 * @param metadata
 * @param version
 */
const versionIsAtLeast = (metadata, version) => {
    const comparison = compareVersionNumbers(metadata.fdc3Version, version);
    return comparison === null ? null : comparison >= 0 ? true : false;
};


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/PrivateChannel.js"
/*!**************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/PrivateChannel.js ***!
  \**************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2021 FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/RecommendedChannels.js"
/*!*******************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/RecommendedChannels.js ***!
  \*******************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */
const recommendedChannels = [
    {
        id: 'fdc3.channel.1',
        type: 'user',
        displayMetadata: {
            name: 'Channel 1',
            color: 'red',
            glyph: '1',
        },
    },
    {
        id: 'fdc3.channel.2',
        type: 'user',
        displayMetadata: {
            name: 'Channel 2',
            color: 'orange',
            glyph: '2',
        },
    },
    {
        id: 'fdc3.channel.3',
        type: 'user',
        displayMetadata: {
            name: 'Channel 3',
            color: 'yellow',
            glyph: '3',
        },
    },
    {
        id: 'fdc3.channel.4',
        type: 'user',
        displayMetadata: {
            name: 'Channel 4',
            color: 'green',
            glyph: '4',
        },
    },
    {
        id: 'fdc3.channel.5',
        type: 'user',
        displayMetadata: {
            name: 'Channel 5',
            color: 'cyan',
            glyph: '5',
        },
    },
    {
        id: 'fdc3.channel.6',
        type: 'user',
        displayMetadata: {
            name: 'Channel 6',
            color: 'blue',
            glyph: '6',
        },
    },
    {
        id: 'fdc3.channel.7',
        type: 'user',
        displayMetadata: {
            name: 'Channel 7',
            color: 'magenta',
            glyph: '7',
        },
    },
    {
        id: 'fdc3.channel.8',
        type: 'user',
        displayMetadata: {
            name: 'Channel 8',
            color: 'purple',
            glyph: '8',
        },
    },
];
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (recommendedChannels);


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/api/Types.js"
/*!*****************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/api/Types.js ***!
  \*****************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/context/ContextType.js"
/*!***************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/context/ContextType.js ***!
  \***************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ContextTypes: () => (/* binding */ ContextTypes)
/* harmony export */ });
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */
/**
 * @deprecated Use {@link StandardContextType} instead
 */
var ContextTypes;
(function (ContextTypes) {
    ContextTypes["Action"] = "fdc3.action";
    ContextTypes["Chart"] = "fdc3.chart";
    ContextTypes["ChatInitSettings"] = "fdc3.chat.initSettings";
    ContextTypes["ChatMessage"] = "fdc3.chat.message";
    ContextTypes["ChatRoom"] = "fdc3.chat.room";
    ContextTypes["ChatSearchCriteria"] = "fdc3.chat.searchCriteria";
    ContextTypes["Contact"] = "fdc3.contact";
    ContextTypes["ContactList"] = "fdc3.contactList";
    ContextTypes["Country"] = "fdc3.country";
    ContextTypes["Currency"] = "fdc3.currency";
    ContextTypes["Email"] = "fdc3.email";
    ContextTypes["FileAttachment"] = "fdc3.fileAttachment";
    ContextTypes["Instrument"] = "fdc3.instrument";
    ContextTypes["InstrumentList"] = "fdc3.instrumentList";
    ContextTypes["Interaction"] = "fdc3.interaction";
    ContextTypes["Message"] = "fdc3.message";
    ContextTypes["Nothing"] = "fdc3.nothing";
    ContextTypes["Order"] = "fdc3.order";
    ContextTypes["OrderList"] = "fdc3.orderList";
    ContextTypes["Organization"] = "fdc3.organization";
    ContextTypes["Portfolio"] = "fdc3.portfolio";
    ContextTypes["Position"] = "fdc3.position";
    ContextTypes["Product"] = "fdc3.product";
    ContextTypes["TimeRange"] = "fdc3.timeRange";
    ContextTypes["Trade"] = "fdc3.trade";
    ContextTypes["TradeList"] = "fdc3.tradeList";
    ContextTypes["TransactionResult"] = "fdc3.transactionResult";
    ContextTypes["Valuation"] = "fdc3.valuation";
})(ContextTypes || (ContextTypes = {}));


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/index.js"
/*!*************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/index.js ***!
  \*************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AgentError: () => (/* reexport safe */ _api_Errors_js__WEBPACK_IMPORTED_MODULE_6__.AgentError),
/* harmony export */   BridgingError: () => (/* reexport safe */ _api_Errors_js__WEBPACK_IMPORTED_MODULE_6__.BridgingError),
/* harmony export */   ChannelError: () => (/* reexport safe */ _api_Errors_js__WEBPACK_IMPORTED_MODULE_6__.ChannelError),
/* harmony export */   ContextTypes: () => (/* reexport safe */ _context_ContextType_js__WEBPACK_IMPORTED_MODULE_19__.ContextTypes),
/* harmony export */   DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX: () => (/* reexport safe */ _api_GetAgent_js__WEBPACK_IMPORTED_MODULE_7__.DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX),
/* harmony export */   FDC3_VERSION: () => (/* binding */ FDC3_VERSION),
/* harmony export */   Intents: () => (/* reexport safe */ _intents_Intents_js__WEBPACK_IMPORTED_MODULE_20__.Intents),
/* harmony export */   LogLevel: () => (/* reexport safe */ _api_GetAgent_js__WEBPACK_IMPORTED_MODULE_7__.LogLevel),
/* harmony export */   OpenError: () => (/* reexport safe */ _api_Errors_js__WEBPACK_IMPORTED_MODULE_6__.OpenError),
/* harmony export */   ResolveError: () => (/* reexport safe */ _api_Errors_js__WEBPACK_IMPORTED_MODULE_6__.ResolveError),
/* harmony export */   ResultError: () => (/* reexport safe */ _api_Errors_js__WEBPACK_IMPORTED_MODULE_6__.ResultError),
/* harmony export */   WebDesktopAgentType: () => (/* reexport safe */ _api_GetAgent_js__WEBPACK_IMPORTED_MODULE_7__.WebDesktopAgentType),
/* harmony export */   addContextListener: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.addContextListener),
/* harmony export */   addEventListener: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.addEventListener),
/* harmony export */   addIntentListener: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.addIntentListener),
/* harmony export */   broadcast: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.broadcast),
/* harmony export */   compareVersionNumbers: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.compareVersionNumbers),
/* harmony export */   createPrivateChannel: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.createPrivateChannel),
/* harmony export */   findInstances: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.findInstances),
/* harmony export */   findIntent: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.findIntent),
/* harmony export */   findIntentsByContext: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.findIntentsByContext),
/* harmony export */   getAppMetadata: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.getAppMetadata),
/* harmony export */   getCurrentChannel: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.getCurrentChannel),
/* harmony export */   getInfo: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.getInfo),
/* harmony export */   getOrCreateChannel: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.getOrCreateChannel),
/* harmony export */   getSystemChannels: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.getSystemChannels),
/* harmony export */   getUserChannels: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.getUserChannels),
/* harmony export */   isStandardContextType: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.isStandardContextType),
/* harmony export */   isStandardIntent: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.isStandardIntent),
/* harmony export */   joinChannel: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.joinChannel),
/* harmony export */   joinUserChannel: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.joinUserChannel),
/* harmony export */   leaveCurrentChannel: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.leaveCurrentChannel),
/* harmony export */   open: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.open),
/* harmony export */   raiseIntent: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.raiseIntent),
/* harmony export */   raiseIntentForContext: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.raiseIntentForContext),
/* harmony export */   versionIsAtLeast: () => (/* reexport safe */ _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__.versionIsAtLeast)
/* harmony export */ });
/* harmony import */ var _api_AppIntent_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./api/AppIntent.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/AppIntent.js");
/* harmony import */ var _api_AppMetadata_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./api/AppMetadata.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/AppMetadata.js");
/* harmony import */ var _api_Channel_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./api/Channel.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Channel.js");
/* harmony import */ var _api_ContextMetadata_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./api/ContextMetadata.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/ContextMetadata.js");
/* harmony import */ var _api_DesktopAgent_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./api/DesktopAgent.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/DesktopAgent.js");
/* harmony import */ var _api_DisplayMetadata_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./api/DisplayMetadata.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/DisplayMetadata.js");
/* harmony import */ var _api_Errors_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./api/Errors.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Errors.js");
/* harmony import */ var _api_GetAgent_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./api/GetAgent.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/GetAgent.js");
/* harmony import */ var _api_Icon_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./api/Icon.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Icon.js");
/* harmony import */ var _api_Image_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./api/Image.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Image.js");
/* harmony import */ var _api_ImplementationMetadata_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./api/ImplementationMetadata.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/ImplementationMetadata.js");
/* harmony import */ var _api_IntentMetadata_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./api/IntentMetadata.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/IntentMetadata.js");
/* harmony import */ var _api_IntentResolution_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./api/IntentResolution.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/IntentResolution.js");
/* harmony import */ var _api_Listener_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./api/Listener.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Listener.js");
/* harmony import */ var _api_Methods_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./api/Methods.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Methods.js");
/* harmony import */ var _api_PrivateChannel_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./api/PrivateChannel.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/PrivateChannel.js");
/* harmony import */ var _api_RecommendedChannels_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./api/RecommendedChannels.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/RecommendedChannels.js");
/* harmony import */ var _api_Types_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./api/Types.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Types.js");
/* harmony import */ var _api_Events_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./api/Events.js */ "./node_modules/@finos/fdc3-standard/dist/src/api/Events.js");
/* harmony import */ var _context_ContextType_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./context/ContextType.js */ "./node_modules/@finos/fdc3-standard/dist/src/context/ContextType.js");
/* harmony import */ var _intents_Intents_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./intents/Intents.js */ "./node_modules/@finos/fdc3-standard/dist/src/intents/Intents.js");
/* harmony import */ var _ui_IntentResolver_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./ui/IntentResolver.js */ "./node_modules/@finos/fdc3-standard/dist/src/ui/IntentResolver.js");
/* harmony import */ var _ui_ChannelSelector_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./ui/ChannelSelector.js */ "./node_modules/@finos/fdc3-standard/dist/src/ui/ChannelSelector.js");
/* harmony import */ var _ui_Connectable_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./ui/Connectable.js */ "./node_modules/@finos/fdc3-standard/dist/src/ui/Connectable.js");
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2019 FINOS FDC3 contributors - see NOTICE file
 */

























const FDC3_VERSION = '2.2';


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/intents/Intents.js"
/*!***********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/intents/Intents.js ***!
  \***********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Intents: () => (/* binding */ Intents)
/* harmony export */ });
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright FINOS FDC3 contributors - see NOTICE file
 */
/**
 * @deprecated Use {@link StandardIntent} instead
 */
var Intents;
(function (Intents) {
    Intents["CreateInteraction"] = "CreateInteraction";
    Intents["CreateOrUpdateProfile"] = "CreateOrUpdateProfile";
    Intents["SendChatMessage"] = "SendChatMessage";
    Intents["StartCall"] = "StartCall";
    Intents["StartChat"] = "StartChat";
    Intents["StartEmail"] = "StartEmail";
    Intents["ViewAnalysis"] = "ViewAnalysis";
    Intents["ViewChat"] = "ViewChat";
    Intents["ViewChart"] = "ViewChart";
    Intents["ViewContact"] = "ViewContact";
    Intents["ViewHoldings"] = "ViewHoldings";
    Intents["ViewInstrument"] = "ViewInstrument";
    Intents["ViewInteractions"] = "ViewInteractions";
    Intents["ViewMessages"] = "ViewMessages";
    Intents["ViewNews"] = "ViewNews";
    Intents["ViewOrders"] = "ViewOrders";
    Intents["ViewProfile"] = "ViewProfile";
    Intents["ViewQuote"] = "ViewQuote";
    Intents["ViewResearch"] = "ViewResearch";
})(Intents || (Intents = {}));


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/internal/contextConfiguration.js"
/*!*************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/internal/contextConfiguration.js ***!
  \*************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StandardContextsSet: () => (/* binding */ StandardContextsSet)
/* harmony export */ });
/* harmony import */ var _typeHelpers_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./typeHelpers.js */ "./node_modules/@finos/fdc3-standard/dist/src/internal/typeHelpers.js");

const STANDARD_CONTEXT_TYPES = (0,_typeHelpers_js__WEBPACK_IMPORTED_MODULE_0__.exhaustiveStringTuple)()('fdc3.action', 'fdc3.chart', 'fdc3.chat.initSettings', 'fdc3.chat.message', 'fdc3.chat.room', 'fdc3.chat.searchCriteria', 'fdc3.contact', 'fdc3.contactList', 'fdc3.country', 'fdc3.currency', 'fdc3.email', 'fdc3.fileAttachment', 'fdc3.instrument', 'fdc3.instrumentList', 'fdc3.interaction', 'fdc3.message', 'fdc3.nothing', 'fdc3.organization', 'fdc3.portfolio', 'fdc3.position', 'fdc3.timeRange', 'fdc3.transactionResult', 'fdc3.valuation');
// used internally to check if a given intent/context is a standard one
const StandardContextsSet = new Set(STANDARD_CONTEXT_TYPES);


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/internal/intentConfiguration.js"
/*!************************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/internal/intentConfiguration.js ***!
  \************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StandardIntentsSet: () => (/* binding */ StandardIntentsSet)
/* harmony export */ });
/* harmony import */ var _typeHelpers_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./typeHelpers.js */ "./node_modules/@finos/fdc3-standard/dist/src/internal/typeHelpers.js");

const STANDARD_INTENTS = (0,_typeHelpers_js__WEBPACK_IMPORTED_MODULE_0__.exhaustiveStringTuple)()('CreateInteraction', 'CreateOrUpdateProfile', 'SendChatMessage', 'StartCall', 'StartChat', 'StartEmail', 'ViewAnalysis', 'ViewChat', 'ViewChart', 'ViewContact', 'ViewHoldings', 'ViewInstrument', 'ViewInteractions', 'ViewMessages', 'ViewNews', 'ViewOrders', 'ViewProfile', 'ViewQuote', 'ViewResearch');
// used internally to check if a given intent/context is a standard one
const StandardIntentsSet = new Set(STANDARD_INTENTS);


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/internal/typeHelpers.js"
/*!****************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/internal/typeHelpers.js ***!
  \****************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   exhaustiveStringTuple: () => (/* binding */ exhaustiveStringTuple)
/* harmony export */ });
/**
 * Ensures at compile time that the given string tuple is exhaustive on a given union type, i.e. contains ALL possible values of the given UNION_TYPE.
 */
const exhaustiveStringTuple = () => (...tuple) => tuple;


/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/ui/ChannelSelector.js"
/*!**************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/ui/ChannelSelector.js ***!
  \**************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/ui/Connectable.js"
/*!**********************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/ui/Connectable.js ***!
  \**********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);



/***/ },

/***/ "./node_modules/@finos/fdc3-standard/dist/src/ui/IntentResolver.js"
/*!*************************************************************************!*\
  !*** ./node_modules/@finos/fdc3-standard/dist/src/ui/IntentResolver.js ***!
  \*************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);



/***/ },

/***/ "./node_modules/@finos/fdc3/dist/src/index.js"
/*!****************************************************!*\
  !*** ./node_modules/@finos/fdc3/dist/src/index.js ***!
  \****************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AgentError: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.AgentError),
/* harmony export */   BridgingError: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.BridgingError),
/* harmony export */   BridgingTypes: () => (/* reexport safe */ _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_1__.BridgingTypes),
/* harmony export */   BrowserTypes: () => (/* reexport safe */ _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_1__.BrowserTypes),
/* harmony export */   ChannelError: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.ChannelError),
/* harmony export */   ContextTypes: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.ContextTypes),
/* harmony export */   Convert: () => (/* reexport safe */ _finos_fdc3_context__WEBPACK_IMPORTED_MODULE_0__.Convert),
/* harmony export */   DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.DESKTOP_AGENT_SESSION_STORAGE_KEY_PREFIX),
/* harmony export */   FDC3_VERSION: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.FDC3_VERSION),
/* harmony export */   Intents: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.Intents),
/* harmony export */   LogLevel: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.LogLevel),
/* harmony export */   OpenError: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.OpenError),
/* harmony export */   ResolveError: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.ResolveError),
/* harmony export */   ResultError: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.ResultError),
/* harmony export */   WebDesktopAgentType: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.WebDesktopAgentType),
/* harmony export */   addContextListener: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.addContextListener),
/* harmony export */   addEventListener: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.addEventListener),
/* harmony export */   addIntentListener: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.addIntentListener),
/* harmony export */   broadcast: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.broadcast),
/* harmony export */   compareVersionNumbers: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.compareVersionNumbers),
/* harmony export */   createPrivateChannel: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.createPrivateChannel),
/* harmony export */   fdc3Ready: () => (/* reexport safe */ _finos_fdc3_get_agent__WEBPACK_IMPORTED_MODULE_3__.fdc3Ready),
/* harmony export */   findInstances: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.findInstances),
/* harmony export */   findIntent: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.findIntent),
/* harmony export */   findIntentsByContext: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.findIntentsByContext),
/* harmony export */   getAgent: () => (/* reexport safe */ _finos_fdc3_get_agent__WEBPACK_IMPORTED_MODULE_3__.getAgent),
/* harmony export */   getAppMetadata: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.getAppMetadata),
/* harmony export */   getCurrentChannel: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.getCurrentChannel),
/* harmony export */   getInfo: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.getInfo),
/* harmony export */   getOrCreateChannel: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.getOrCreateChannel),
/* harmony export */   getSystemChannels: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.getSystemChannels),
/* harmony export */   getUserChannels: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.getUserChannels),
/* harmony export */   isStandardContextType: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.isStandardContextType),
/* harmony export */   isStandardIntent: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.isStandardIntent),
/* harmony export */   joinChannel: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.joinChannel),
/* harmony export */   joinUserChannel: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.joinUserChannel),
/* harmony export */   leaveCurrentChannel: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.leaveCurrentChannel),
/* harmony export */   open: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.open),
/* harmony export */   raiseIntent: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.raiseIntent),
/* harmony export */   raiseIntentForContext: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.raiseIntentForContext),
/* harmony export */   versionIsAtLeast: () => (/* reexport safe */ _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__.versionIsAtLeast)
/* harmony export */ });
/* harmony import */ var _finos_fdc3_context__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3-context */ "./node_modules/@finos/fdc3-context/dist/src/index.js");
/* harmony import */ var _finos_fdc3_schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @finos/fdc3-schema */ "./node_modules/@finos/fdc3-schema/dist/src/index.js");
/* harmony import */ var _finos_fdc3_standard__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @finos/fdc3-standard */ "./node_modules/@finos/fdc3-standard/dist/src/index.js");
/* harmony import */ var _finos_fdc3_get_agent__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @finos/fdc3-get-agent */ "./node_modules/@finos/fdc3-get-agent/dist/src/index.js");








/***/ },

/***/ "./node_modules/uuid/dist/regex.js"
/*!*****************************************!*\
  !*** ./node_modules/uuid/dist/regex.js ***!
  \*****************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i);


/***/ },

/***/ "./node_modules/uuid/dist/rng.js"
/*!***************************************!*\
  !*** ./node_modules/uuid/dist/rng.js ***!
  \***************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ rng)
/* harmony export */ });
const rnds8 = new Uint8Array(16);
function rng() {
    return crypto.getRandomValues(rnds8);
}


/***/ },

/***/ "./node_modules/uuid/dist/stringify.js"
/*!*********************************************!*\
  !*** ./node_modules/uuid/dist/stringify.js ***!
  \*********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   unsafeStringify: () => (/* binding */ unsafeStringify)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validate.js */ "./node_modules/uuid/dist/validate.js");

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
    return (byteToHex[arr[offset + 0]] +
        byteToHex[arr[offset + 1]] +
        byteToHex[arr[offset + 2]] +
        byteToHex[arr[offset + 3]] +
        '-' +
        byteToHex[arr[offset + 4]] +
        byteToHex[arr[offset + 5]] +
        '-' +
        byteToHex[arr[offset + 6]] +
        byteToHex[arr[offset + 7]] +
        '-' +
        byteToHex[arr[offset + 8]] +
        byteToHex[arr[offset + 9]] +
        '-' +
        byteToHex[arr[offset + 10]] +
        byteToHex[arr[offset + 11]] +
        byteToHex[arr[offset + 12]] +
        byteToHex[arr[offset + 13]] +
        byteToHex[arr[offset + 14]] +
        byteToHex[arr[offset + 15]]).toLowerCase();
}
function stringify(arr, offset = 0) {
    const uuid = unsafeStringify(arr, offset);
    if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
        throw TypeError('Stringified UUID is invalid');
    }
    return uuid;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (stringify);


/***/ },

/***/ "./node_modules/uuid/dist/v4.js"
/*!**************************************!*\
  !*** ./node_modules/uuid/dist/v4.js ***!
  \**************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./rng.js */ "./node_modules/uuid/dist/rng.js");
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./stringify.js */ "./node_modules/uuid/dist/stringify.js");


function v4(options, buf, offset) {
    if (!buf && !options && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return _v4(options, buf, offset);
}
function _v4(options, buf, offset) {
    options = options || {};
    const rnds = options.random ?? options.rng?.() ?? (0,_rng_js__WEBPACK_IMPORTED_MODULE_0__["default"])();
    if (rnds.length < 16) {
        throw new Error('Random bytes length must be >= 16');
    }
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;
    if (buf) {
        offset = offset || 0;
        if (offset < 0 || offset + 16 > buf.length) {
            throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
        }
        for (let i = 0; i < 16; ++i) {
            buf[offset + i] = rnds[i];
        }
        return buf;
    }
    return (0,_stringify_js__WEBPACK_IMPORTED_MODULE_1__.unsafeStringify)(rnds);
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v4);


/***/ },

/***/ "./node_modules/uuid/dist/validate.js"
/*!********************************************!*\
  !*** ./node_modules/uuid/dist/validate.js ***!
  \********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./regex.js */ "./node_modules/uuid/dist/regex.js");

function validate(uuid) {
    return typeof uuid === 'string' && _regex_js__WEBPACK_IMPORTED_MODULE_0__["default"].test(uuid);
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (validate);


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!******************************!*\
  !*** ./src/mock/intent-h.ts ***!
  \******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _finos_fdc3__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @finos/fdc3 */ "./node_modules/@finos/fdc3/dist/src/index.js");
/* harmony import */ var _mock_functions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mock-functions */ "./src/mock/mock-functions.ts");


(0,_finos_fdc3__WEBPACK_IMPORTED_MODULE_0__.getAgent)().then(async (fdc3) => {
    await (0,_mock_functions__WEBPACK_IMPORTED_MODULE_1__.closeWindowOnCompletion)(fdc3);
});

})();

/******/ })()
;
//# sourceMappingURL=intent-h.js.map