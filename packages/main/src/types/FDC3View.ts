import { BrowserView, BrowserWindow } from "electron";

export interface FDC3View {
    channel : string;
    content : BrowserView;
   };


export interface FDC3Instance {
    channel : string;
    content : BrowserView;
    id : number;
}

export interface WindowInstance {
    channel : string;
    content : BrowserWindow;
    id : number;
}