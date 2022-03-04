    import {View} from './view';
    import {getRuntime} from './index';
    import {BrowserWindow} from 'electron';
    import {FDC3App, ResolverDetail} from './types/FDC3Data';
    import {Context} from '@finos/fdc3';
    import utils from './utils';
    import { join } from 'path';
    import {TOPICS} from './constants';

 

    const RESOLVER_PRELOAD = join(__dirname, '../../intentResolver-preload/dist/index.cjs');
                                                                                

    export class IntentResolver {


        window : BrowserWindow;

        view : View | null = null;

        id : string;

        intent : string;

        context : Context | null;

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
                preload:RESOLVER_PRELOAD,
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

            const RESOLVER_CONTENT = import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_INTENTS_URL !== undefined
            ? import.meta.env.VITE_DEV_SERVER_INTENTS_URL
            : new URL(
                '../renderer/dist/intentResolver.html',
                'file://' + __dirname,
            ).toString();
            // and load the index.html of the app.
            if (RESOLVER_CONTENT){
                this.window.loadURL((RESOLVER_CONTENT as string)).then(() => {
                
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
        }

        close() {
            this.window.close();
            getRuntime().getResolvers().delete(this.id);
        }
    };