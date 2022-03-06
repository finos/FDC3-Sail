/**
 * A View wraps a BrowserView and has a specific AppInstance associated with it
 * Views have
 *    - Channel membership
 *    - Pending Context / Intent (?)
 */

import {ViewConfig} from './types/ViewConfig';
import {getRuntime} from './index';
import {BrowserView} from 'electron';
import utils from './utils';
import {DirectoryApp} from './types/FDC3Data';
import { Rectangle } from 'electron/main';
import { Workspace } from './workspace';
import { FDC3Listener } from './types/FDC3Listener';
import {Pending} from './types/Pending';
import fetch from 'electron-fetch';
import {TOPICS} from './constants';
import { join } from 'path';

const VIEW_PRELOAD = join(__dirname, '../../preload/dist/view/index.cjs');

const TOOLBAR_HEIGHT : number = 90;

 export class View {

    constructor(url? : string | null, config? : ViewConfig, parent? : Workspace){

      const VIEW_DEFAULT =  import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_DEFAULT_URL !== undefined
      ? import.meta.env.VITE_DEV_SERVER_DEFAULT_URL
      : new URL(
          '../renderer/dist/defaultView/index.html',
          'file://' + __dirname,
        ).toString();

        const setId = () => {
            this.content.webContents.send(TOPICS.FDC3_START,{'id':this.id, 'directory':this.directoryData || null});
            this.initiated = true;
            console.log("view created",this.id, url);
            const runtime = getRuntime();
            if (runtime){
              runtime.getViews().set(this.id, this);
            }
        }
    

        const initView  = (config ? : ViewConfig) => {
          const doInit = () => {
            setId();
            this.size();
             //call onInit handler, if in the config
            if (config && config.onReady){
              config.onReady.call(this, this);
            }
            
          };

         
          //if there are actions in the directory metadata, resolve these first...
          if (this.directoryData && this.directoryData.hasActions){
            
            //if the app has actions defined in the appD, look those up (this is an extension of appD implemented by appd.kolbito.com) 
            //actions automate wiring context and intent handlers for apps with gettable end-points
            utils.getDirectoryUrl().then((directoryUrl) => {
              if (this.directoryData){
                fetch(`${directoryUrl}/apps/${this.directoryData.name}/actions`).then((actionsR) => {
                  actionsR.json().then(actions => {
                      if (this.directoryData){
                          this.directoryData.actions = actions;
                      }
                      doInit();
                  });
                  
                });
              }
            });
               
          }
          else {
            doInit();
          }

        }

            this.id = utils.guid();
            this.parent = parent;

            if (config){
              this.directoryData = config.directoryData;
            }

            this.content = new BrowserView({
              webPreferences:{
               preload: VIEW_PRELOAD,
               devTools:true,
               contextIsolation:true,
              // enableRemoteModule:false,
               webSecurity:true,
              // worldSafeExecuteJavaScript:true
              }
            });
            //set bgcolor so view doesn't bleed through to hidden tabs
            this.content.setBackgroundColor("#fff");

            console.log("create view", url, config);
           
            this.content.webContents.on("ipc-message",(event, channel, args) => {
              if (channel === TOPICS.FDC3_INITIATE && !this.initiated){
                initView(config);
              }

            });

            if (url){
            this.content.webContents.loadURL(url).then(() => {
           //   initView(config);
            });
           }
           else if (VIEW_DEFAULT) {
            
             this.content.webContents.loadURL(VIEW_DEFAULT).then(() => {
                  console.log("content loaded");
              },(err) => {
                console.error("Error loading file", VIEW_DEFAULT);
              });
           }
          
           //listen for reloads and reset id
           this.content.webContents.on("devtools-reload-page",() => {
               this.content.webContents.once("did-finish-load", () => {
                this.content.webContents.send(TOPICS.FDC3_START,{'id':this.id, 'directory':this.directoryData || null});
                console.log("FDC3 restart", this.id);
               });
           });
           
           //listen for navigation
           //to do: ensure directory entry and new location match up!
           this.content.webContents.on("did-navigate",() => {
            this.content.webContents.once("did-finish-load", () => {
             this.content.webContents.send(TOPICS.FDC3_START,{'id':this.id, 'directory':this.directoryData || null});
             console.log("FDC3 restart", this.id);
            });
        });
           
        }  
  /**
   * size the view to the parent
   */           
   size(){
    if (this.parent && this.parent.window) {
      const bounds : Rectangle = this.parent.window.getBounds();
      this.content.setBounds({x:0, y: TOOLBAR_HEIGHT, width:bounds.width, height:(bounds.height - TOOLBAR_HEIGHT)});
      
    } else {
      this.content.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width: 800, height: 500 });
    }
   }   

    id: string;

    content : BrowserView;

    channel : string | null = null;

    /**
     * contexts that the view is listening to
     */
    listeners : Array<FDC3Listener> = [];

   /* array pending contexts
   */
    pendingContexts : Array<Pending> = [];
    directoryData? : DirectoryApp;

    parent ? : Workspace;

    initiated : boolean = false;

    close() {
      const runtime = getRuntime();
      if (this.parent && this.parent.window) {
        this.parent.window.removeBrowserView(this.content);
      }
      if (this.content){
        this.content.webContents.closeDevTools();
      }
      //how do you destroy a browser view?
      if (runtime){
        runtime.getViews().delete(this.id);
      }
    }

 };