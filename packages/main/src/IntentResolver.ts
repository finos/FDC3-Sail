    import {View} from './view';
    import {getRuntime} from './index';
    import {ipcMain, BrowserWindow} from 'electron';
    import {FDC3App, ResolverDetail} from './types/FDC3Data';
    import {Context} from './types/fdc3/Context';
    import utils from './utils';
    import {TOPICS} from './constants';

    declare const RESOLVER_WEBPACK_ENTRY : any;


    export class IntentResolver {


        window : BrowserWindow;

        view : View;

        id : string;

        intent : string;

        context : Context;

        constructor(view : View, detail : ResolverDetail, options ? : Array<FDC3App>){

            this.id = utils.guid();

            this.intent = detail.intent;

            this.context = detail.context || null;

            this.window =  new BrowserWindow({
                height: 400,
                width: 400,
                frame:false,
                hasShadow:true,
                webPreferences:{
                
                webSecurity:true,
                nodeIntegration:true,
                contextIsolation:false,
                devTools:true
                }
            });;
            const vBounds = view.content.getBounds();
           
            this.window.setBounds({
                x:vBounds.x + (((vBounds.width + 200)/2)),
                y: vBounds.y + (((vBounds.height -200)/2))
            });

            //add resolution listener
            getRuntime().getResolvers().set(this.id, this);

            //to do: position resolver in relation to view

            // and load the index.html of the app.
            this.window.loadURL(RESOLVER_WEBPACK_ENTRY).then(() => {
            
        //     this.window.webContents.openDevTools();
                this.window.webContents.send(TOPICS.WINDOW_START,{
                    'id': this.id,
                    'intent': this.intent,
                    'context':this.context,
                    'options':options});
            
                console.log("intent resolver create",options);
                this.view = view;
            });

            this.window.focus();

            this.window.on("blur",() => {
                this.window.destroy();
            });
        }

        close() {
            this.window.close();
            getRuntime().getResolvers().delete(this.id);
        }
    };