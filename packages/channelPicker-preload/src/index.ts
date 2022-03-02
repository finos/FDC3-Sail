import {ipcRenderer} from 'electron';
import {channels} from '../../main/src/system-channels';
import {Channel} from '../../main/src/types/FDC3Data';
import {TOPICS} from '../../main/src/constants';
import {FDC3ChannelPicker} from './channel-picker';

let workspaceId : string | null = null;
let selected : string | null= null;



ipcRenderer.on(TOPICS.WINDOW_START, (event, args) => {
    console.log("channels window start ", args);
    workspaceId = args.workspaceId;
    start(channels);
});

ipcRenderer.on(TOPICS.CHANNEL_SELECTED,(event, args) => {
    channelSelected(args.channel);
});

(document as any).addEventListener(TOPICS.JOIN_CHANNEL,(event : CustomEvent) => {
    ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL,{source:workspaceId,data:{channel:event.detail.channel}});
});

const pickChannel = (event : Event, channel : Channel) => {
    //is it the selected channel?
    //then unselect the channel
    const selectedChannel = (selected && selected === channel.id) ? "default" : channel.id;
    
    //set selected channel
   ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL,{source:workspaceId,data:{channel:selectedChannel}});
};

//document.addEventListener(TOPICS.CHANNEL_SELECTED,(event : CustomEvent) => {
const channelSelected = (channel : string) => {
    //deselect the previous selection if one
    if (selected && selected !== "default"){
        const selectedElement = document.getElementById(selected);
        if (selectedElement){
            const text = selectedElement.querySelector(".text");
            if (text){
                text.textContent = "";
            }
        }
    }
    //set the new selected value
    selected = channel;

    //update the ui with the new selection
    //ignore if selected is "default" (no selection)
    if (selected !== "default"){
        const selectedElement = document.getElementById(selected);
        if (selectedElement){
            const text = selectedElement.querySelector(".text");
            if (text){
                text.textContent = "\u2666";
            }
        }
    }
};

//document.addEventListener(TOPICS.WINDOW_START,(event : CustomEvent) => {
const start = (channels : Array<Channel>) => {
    const picker = document.getElementById("picker");
    //const channels : Array<Channel> = event.detail.channels;
    channels.forEach(channel => {
        const square = document.createElement("div");
        square.id = channel.id;
        square.className = "square";
        if (channel.displayMetadata){
            square.setAttribute('style',`background-color:${channel.displayMetadata.color};`);
        }
      //  square.textContent = channel.displayMetadata.color;
        square.addEventListener("mouseover",() => {
            if (channel.displayMetadata){
                square.setAttribute('style', `background-color:${channel.displayMetadata.color2};`);
            }
        });
        square.addEventListener("mouseout",() => {
            if (channel.displayMetadata){
                square.setAttribute('style',`background-color:${channel.displayMetadata.color};`);
            }
        });

        const text = document.createElement("div");
        text.className = "text";

        square.appendChild(text);

        square.addEventListener("click",(event) => {
            pickChannel(event, channel);
            
        });
        if (picker){
            picker.appendChild(square);
        }
        
    });
};


document.addEventListener("DOMContentLoaded",() => {
 
    // Define the new element
    customElements.define("fdc3-channel-picker", FDC3ChannelPicker);
});
