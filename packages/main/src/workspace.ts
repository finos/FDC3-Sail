/**
 *  A Workspace wraps a BrowserWindow instance, containing any number of Views (BrowserViews containing AppInstances)
 * 
 *  Workspaces have:
 *     - Toolbars
 *     - Channel membership
 *     - ultimately, management abilities like save & restore, etc
 */

 import {WorkspaceConfig} from './types/WorkspaceConfig';
 import {ViewConfig} from './types/ViewConfig';
 import {View} from './view';
 import {getRuntime} from './index';
import { BrowserWindow, Rectangle, TouchBarScrubber} from 'electron';
import {joinViewToChannel} from './listeners/fdc3Listeners';
import utils from './utils';
import { join } from 'path';
import {DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_WIDTH, TOOLBAR_HEIGHT, TOPICS} from './constants';

 

const MAIN_WINDOW_PRELOAD = join(__dirname, '../../preload/dist/index.cjs');

const CHANNEL_PICKER_PRELOAD = join(__dirname, '../../preload/dist/channelPicker/index.cjs');

const SEARCH_RESULTS_PRELOAD = join(__dirname, '../../preload/dist/searchResults/index.cjs');







 export class Workspace {

    constructor(config? : WorkspaceConfig) {
       this.id = utils.guid();

  /*      this.window = new BrowserWindow({
            height: DEFAULT_WINDOW_HEIGHT,
            width: DEFAULT_WINDOW_WIDTH,
            
            webPreferences:{
              webSecurity:true,
              nodeIntegration:true,
              contextIsolation:false,
              preload:MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
              devTools:true
            }
        });*/


        this.window = new BrowserWindow({
           // show: false, // Use 'ready-to-show' event to show window
           height: DEFAULT_WINDOW_HEIGHT,
            width: DEFAULT_WINDOW_WIDTH,
            webPreferences: {
              nativeWindowOpen: true,
              webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
              preload: join(__dirname, '../../preload/dist/index.cjs'),
            },
          });
        
    
        if (config && config.x && config.y){
            this.window.setBounds({
                x:(config.x),
                y:(config.y)
            });
        }

        console.log("main window content DEV = ", import.meta.env.DEV);
        
        const MAIN_WINDOW_CONTENT  = import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_URL
        : new URL(
              '../renderer/dist/index.html',
              'file://' + __dirname,
            ).toString();


 
        
        // and load the index.html of the app.
        if (this.window && MAIN_WINDOW_CONTENT){
        this.window.loadURL(MAIN_WINDOW_CONTENT).then(() => {
       // this.window.loadFile('src/windows/workspace/frame.html').then(() => {   
           if (this.window){ 
            this.window.webContents.send(TOPICS.WORKSPACE_START,{'id':this.id});
           // this.window.webContents.openDevTools();
            console.log("workspace created",this.id);
            const runtime = getRuntime();
            if (runtime){
                runtime.getWorkspaces().set(this.id, this);

                this.window.on("resize",() => {
                    if (this.window){
                        const bounds : Rectangle = this.window.getBounds();
                        this.views.forEach(v => {
                            v.content.setBounds({x:0, y: TOOLBAR_HEIGHT, width:bounds.width, height:(bounds.height - TOOLBAR_HEIGHT)});
                        });
                    }
                });

              
                //listen for the view closing, unregister listeners
                //TODO: cleanup the whole workspace
                this.window.on("close",() => {
                    this.close();
                });

                //call onInit handler, if in the config
                if (config && config.onInit){
                    config.onInit.call(this, this);
                }
            }
        }

        });
        }
    }
    
    window : BrowserWindow| null = null;

    resultsWindow : BrowserWindow | null= null;

    channelWindow : BrowserWindow | null = null;
    
    views : Array<View> = [];

    id : string;

    resultsId : string | null = null;

    channel : string | null = null;

    selectedTab : string | null = null;

    getSelectedIndex() : number {
        return this.views.findIndex((v) => {return v.id === this.selectedTab;});
    }

    setSelectedTab(tabId : string) {
        console.log("setSelectedTab");
        const runtime = getRuntime();
        if (runtime){
            //set new selected state and show new selected view
            console.log("setSelectedTab tabId", tabId);
            this.selectedTab = tabId;
            //ensure the view still exists 
            const view = runtime.getView(this.selectedTab);
            if (view){
                try {
                    if (this.window){
                    //just make sure the browserview is actually attached to the window
                    console.log("setSelectedTab addBrowserView", view.content);
                    
                        this.window.addBrowserView(view.content);
                       // setTimeout(() => {
                            if (this.window){
                                try {
                                    console.log("setting top browser view");
                                    this.window.setTopBrowserView(view.content);
                                } catch (err) {
                                    console.error("setSelectedTab", err);
                                }
                            }
                       // }, 300);
                        
                    }
                }
                catch (err){
                    console.warn("setSelectedTab", err);
                }
                
            }
        }

    }




    /**
     * 
     * close the workspace
     */
    close(){
        const runtime = getRuntime();
        this.getViews().forEach(view => {
            view.close();  
        });
    
        //destroy results window
        if (this.resultsWindow){
            this.resultsWindow.destroy();
        }

        //destroy the channel window
        if (this.channelWindow){
            this.channelWindow.destroy();
        }

        //unregister workspace
        if (runtime){
            runtime.getWorkspaces().delete(this.id);
        }

        //close the window
        if (this.window){
            this.window.destroy();
        }
    }
    
    /**
     * close a tab 
     * @param tabId 
     */

    closeTab(tabId : string) {
        const runtime = getRuntime();
        if (runtime){
            const view = runtime.getView(tabId);
            const newSelection : boolean = tabId === this.selectedTab;
            let selectedIndex : number = -1;
            //remove the view from the workspace
            this.views = this.views.filter((v, i) => {
                if (v.id === this.selectedTab){
                    selectedIndex = i;
                }   
                return v.id !== tabId;
            });

            //are there more tabs?
            //if not, close the workspace
            console.log("close tab views ",this.views.length);
            if (this.views.length === 0){
                this.close();
            } else if (newSelection) {
            
                //if the removed tashift the selected tab to the left
                selectedIndex--;
                //select the next tab if the closed tab was selected
                if (selectedIndex > -1){
                    //if we're down to 1 tab, force selected index to 0
                    console.log("selectedIndex ", selectedIndex, "views length ", this.views.length);
                    selectedIndex = this.views.length === 0 ? 0 : selectedIndex;
                    selectedIndex = this.views.length === selectedIndex ? selectedIndex-1 : selectedIndex;
                    console.log("selectedIndex ", selectedIndex);              
                    const selectedView = this.views[selectedIndex];
                    if (selectedView){
                        this.setSelectedTab(selectedView.id);
                        if (this.window){
                            this.window.webContents.send(TOPICS.SELECT_TAB,{viewId:selectedView.id});
                        }
                    }
                }
                
                //close the view, this removes from workspace and cleans up 
                if (view){
                    view.close();
                }
                
            }
        }
        
    }
    
    removeTab(tabId : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            console.log("removeTab");
            //to do : clear all handlers and workspace bindings
            const runtime = getRuntime();
            if (runtime){
                const view = runtime.getView(tabId);    
                let selectedIndex : number = -1;
                //if we're removing the currently selected tab, then we'll have to make a new selection
                const newSelection : boolean = (tabId === this.selectedTab);
                //remove the view from the workspace
                this.views = this.views.filter((v, i) => {
                    if (v.id === this.selectedTab){
                        selectedIndex = i;
                        //remove view parent
                        delete v.parent;
                        if (this.window){
                            this.window.removeBrowserView(v.content);
                        }
                    }   
                    return v.id !== tabId;
                });

                //are there more tabs?
                //if not, close the workspace
                if (this.views.length === 0){
                    this.close();
                    resolve();
                } else if (newSelection) {
                
                    //if the removed tab was selected, shift the selected tab to the left
                    selectedIndex--;
                    
                    if (selectedIndex > -1){
                        //if we're down to 1 tab, force selected index to 0
                        console.log("selectedIndex ", selectedIndex, "views length ", this.views.length);
                        selectedIndex = this.views.length === 1 ? 0 : selectedIndex;
                                    
                        const selectedView = this.views[selectedIndex];
                        if (selectedView){
                            console.log("remove tab - selectedView = ", selectedView.id);
                            this.setSelectedTab(selectedView.id);
                            if (this.window){
                                this.window.webContents.send("WORK:selectTab",{viewId:selectedView.id});
                            }
                            resolve();
                        }
                        else {
                            console.log("remove tab - no selectedView");
                            resolve();
                        }
                    }
                    
        
                    
                }
                else if (this.selectedTab) {
                    //just reselect the already selected tab
                    this.setSelectedTab(this.selectedTab);
                    if (this.window){
                        this.window.webContents.send(TOPICS.SELECT_TAB,{viewId:this.selectedTab});
                    }
                    resolve();
                }
            }
        });
        
    }

    createResultsWindow() : Promise<void> {
        return new Promise((resolve, reject) => {
        this.resultsWindow = new BrowserWindow({
            height: 100,
            width: 370,
            hasShadow: true,
            show:false,
            frame:false,
            alwaysOnTop:true,
            webPreferences:{
                webSecurity:true,
                nodeIntegration:true,
                contextIsolation:false,
                preload: SEARCH_RESULTS_PRELOAD,
                devTools:true
            }
        });

        const SEARCH_RESULTS_CONTENT =  import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_SEARCH_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_SEARCH_URL
        :  new URL(
            '../renderer/dist/searchResults/index.html',
            'file://' + __dirname,
        ).toString();


        if (SEARCH_RESULTS_CONTENT && this.resultsWindow){
            this.resultsWindow.loadURL((SEARCH_RESULTS_CONTENT as string)).then(() => {
            //this.resultsWindow.loadFile('src/windows/searchResults/searchResults.html').then(() => {
                if (this.resultsWindow){
                    this.resultsWindow.webContents.send(TOPICS.WINDOW_START,{'workspaceId':this.id});
                    console.log("results window created",this.resultsId);
                    resolve();
                }
            },(err : Error) => {
                reject(err);
            });
        }
    });

    }

    createChannelWindow() : Promise<void> {
        console.log("creatChannelWIndow");
        return new Promise((resolve, reject) => {
        this.channelWindow = new BrowserWindow({
            height: 100,
            width: 140,
            hasShadow: true,
            show:false,
            frame:false,
            alwaysOnTop:true,
            webPreferences:{
                webSecurity:true,
                nodeIntegration:true,
                contextIsolation:false,
                preload: CHANNEL_PICKER_PRELOAD,
                devTools:true
            }
        });
        const CHANNEL_PICKER_CONTENT = import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_CHANNEL_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_CHANNEL_URL
        : new URL(
            '../renderer/dist/channelPicker/index.html',
            'file://' + __dirname,
        ).toString();

        if (CHANNEL_PICKER_CONTENT){
            console.log("chnnel picker", CHANNEL_PICKER_CONTENT);
            this.channelWindow.loadURL((CHANNEL_PICKER_CONTENT as string)).then(() => {
            //this.channelWindow.loadFile('src/windows/channelPicker/channelPicker.html').then(() => {
               // const channelWindow = this.channelWindow;
                if (this.channelWindow){
                 //   this.channelWindow.webContents.openDevTools();
                //    setTimeout(()=> {
                    //    if (channelWindow){
                            this.channelWindow.webContents.send(TOPICS.WINDOW_START,{'workspaceId':this.id});
                            console.log("channel window created",this.id);
                            resolve();
                   //     }
                  //  },1000);
                    
                }
            },(err) => {
                reject(err);
            });
        }
    });

    }

    async showChannelWindow() {
        if (!this.channelWindow){
            await this.createChannelWindow();
        }
        if (this.channelWindow){
            this.channelWindow.webContents.send(TOPICS.WINDOW_SHOW,{selectedChannel:this.channel});
            const winPos : number[] = this.window ? this.window.getPosition() : [0,0];
            this.channelWindow.setPosition(winPos[0] + 349, winPos[1] + 60);
            this.channelWindow.show();
            this.channelWindow.focus();
            this.channelWindow.on("blur", () => {
            this.hideChannelWindow(); 
            })
        }

    }

    hideChannelWindow() {
        if (this.channelWindow){
            this.channelWindow.hide();
        }
    }

 
    

    async loadSearchResults(results : Array<any>) {
        
        if (! this.resultsWindow){
            await this.createResultsWindow();
        }
        if (this.resultsWindow){
            const winPos : number[] = this.window ? this.window.getPosition() : [0,0];
            this.resultsWindow.setSize(370,(30 +(results.length * 20)),false);
            
            this.resultsWindow.setPosition(winPos[0] + 9, winPos[1] + 60);
            
            
            this.resultsWindow.showInactive();
            this.resultsWindow.webContents.send(TOPICS.RES_LOAD_RESULTS,{results:results});
     //   this.resultsWindow.webContents.openDevTools();
            let hideTimer : NodeJS.Timeout | null  = null;
            hideTimer = setTimeout(() => {
                    this.hideSearchResults();
                }, 3000);
            
            this.resultsWindow.on("focus",() => {
                if (hideTimer){
                    clearTimeout(hideTimer);
                }
            });

            this.resultsWindow.on("blur",() => {
                hideTimer = setTimeout(() => {
                    this.hideSearchResults();
                }, 1000);
            });
        }
    }

    hideSearchResults() {
        if (this.resultsWindow){
            this.resultsWindow.hide();
            this.resultsWindow.removeAllListeners();
        }
    }



 

    addTab(tabId : string) : Promise<void>{
        return new Promise((resolve, reject) => {
            //to do: add workspace handlers and bindings
            const runtime = getRuntime();
            if (runtime){
                const view = runtime.getView(tabId);
                if (view){
                    //add to view collection 
                    if (this.window){
                        this.window.addBrowserView(view.content);

                        view.parent = this;
            
                    
                        this.views.push(view);
                        setTimeout(async ()=>{
                            view.size();
                            this.setSelectedTab(view.id);
                            if (this.window){
                                this.window.webContents.send(TOPICS.ADD_TAB, {viewId: view.id, title:view.directoryData && view.directoryData.title ? view.directoryData.title :view.content.webContents.getTitle()});
                                if (this.channel && view.channel !== this.channel){
                                    await joinViewToChannel(this.channel,view);
                                }
                                resolve();
                            }
                        },300);
                        
                    
                    }
                }
            }
        });  
    }

    createView(url? : string, config? : ViewConfig) :View {
        const conf = config || {};
        conf.workspace = this;
        conf.onReady = (view) => {
            console.log("view ready");
            return new Promise(async (resolve) => {
            if (this.window){
                this.window.webContents.send(TOPICS.ADD_TAB, {viewId: view.id, title:view.directoryData && view.directoryData.title ? view.directoryData.title :view.content.webContents.getTitle()});
            
                this.setSelectedTab(view.id);
                
            // this.window.addBrowserView(view.content);
                console.log("createView - join view to channel", this.channel);
                if (this.channel){
                    
                    await joinViewToChannel(this.channel,view);
                }
                resolve();
            }
        });
        }
        const view = new View(url, conf, this);
        /*view.content.webContents.on("did-finish-load",() => {
            this.window.webContents.send("WORK:addTab", {viewId: view.id, title:view.directoryData && view.directoryData.title ? view.directoryData.title :view.content.webContents.getTitle()});
            this.setSelectedTab(view.id);
        });*/
        
        this.views.push(view);
        //add to view collection 
        if (this.window){
            this.window.addBrowserView(view.content);
        }
        return view;
    }



    getViews() : Array<View> {
        return this.views;
    }

    /**
     * set the workspace - wide channel (apply to all views)
     */
    setChannel(channel : string) : Promise<void> {
        return new Promise((resolve, reject) => {
        this.channel = channel;
        this.views.forEach(async (view) => {
            if (view.channel !== channel){
                await joinViewToChannel(channel,view);
            }
        });
        if (this.channelWindow){
            this.channelWindow.webContents.send(TOPICS.CHANNEL_SELECTED,{channel:channel});
        }
        if (this.window){
            this.window.webContents.send(TOPICS.CHANNEL_SELECTED,{channel:channel});
        }
        resolve();
    });
    }


 };