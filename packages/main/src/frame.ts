import {ipcRenderer} from 'electron';

import './frame.css';
import { ipcMain } from 'electron/main';
import { resolve } from 'url';
import {channels} from '../../system-channels';
import {TOPICS} from '../../constants';


//flag to indicate the background script is ready for fdc3!
let connected : boolean = true;
let id : string = null;

/**
 * listen for start event - assigning id for the instance
 */
ipcRenderer.on(TOPICS.WORKSPACE_START, async (event, args) => {
    console.log(TOPICS.WORKSPACE_START,args);
    if (args.id){
        id = args.id;
        connected = true;
    }
});

ipcRenderer.on(TOPICS.ADD_TAB, (event, args) => {
    
    document.dispatchEvent(new CustomEvent(TOPICS.ADD_TAB, {detail:{
        viewId : args.viewId,
        title : args.title
    }}));
});

ipcRenderer.on(TOPICS.SELECT_TAB, (event, args) => {
    console.log("select tab", args.viewId);
    document.dispatchEvent(new CustomEvent(TOPICS.SELECT_TAB, {detail:{
        selected : args.viewId
    }}));
});

ipcRenderer.on(TOPICS.CHANNEL_SELECTED, async (event,args) => {
    const channel = args.channel !== "default" ? channels.find((c) => {return c.id === args.channel;}) : {id:"default","displayMetadata":{color:"#ccc", color2:"#999"}};
    document.dispatchEvent(new CustomEvent(TOPICS.CHANNEL_SELECTED, {detail:{channel:channel}}));
});

const autoComplete = require("@tarekraafat/autocomplete.js/dist/js/autoComplete");


document.addEventListener(TOPICS.JOIN_CHANNEL,(event : CustomEvent) => {
    ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL,{'source':id, 'data':event.detail});
});


document.addEventListener(TOPICS.SELECT_TAB, (event :CustomEvent)=> {
    ipcRenderer.send(TOPICS.SELECT_TAB,{'source':id,'selected':event.detail.selected});
});

document.addEventListener(TOPICS.CLOSE_TAB, (event :CustomEvent)=> {
    ipcRenderer.send(TOPICS.CLOSE_TAB,{'source':id,'tabId':event.detail.tabId});
});

document.addEventListener(TOPICS.DROP_TAB, (event :CustomEvent)=> {
    ipcRenderer.send(TOPICS.DROP_TAB,{'source':id,'tabId':event.detail.tabId});
});




document.addEventListener("DOMContentLoaded",()=>{

    

    
    // Toggle results list and other elements
    const action = function(action : any) {
        const selection = (document.querySelector(".selection") as HTMLElement);
        if (selection){
            if (action === "dim") {
        
            selection.style.opacity = "1";
        
            } else {
    
            selection.style.opacity = "0.1";
                
            }
        }
      };
    
    ["focus", "blur"].forEach(function(eventType) {
        const resultsList = (document.querySelector("#result_list") as HTMLElement);
      
        document.querySelector("#autoComplete").addEventListener(eventType, function() {
          // Hide results list & show other elements
          if (resultsList){
            if (eventType === "blur") {
                action("dim");
                resultsList.style.display = "none";
            } else if (eventType === "focus") {
                // Show results list & hide other elemennts
                action("light");
                resultsList.style.display = "block";
            }
          }
        });
      });
      
})
//viewId of currently selected tab
let currentTab : string  = null; 
let draggedTab : HTMLElement = null;

const selectTab = (selectedId : string) => {

    //change the selection state of the tabs
    if (currentTab){
      const oldTab = document.getElementById(`tab_${currentTab}`);
      if (oldTab){
        oldTab.className = "tab";
      }
    }
    currentTab = selectedId;
    const newTab = document.getElementById(`tab_${selectedId}`);
    newTab.className = "tab selected"; 
};

const closeTab = (tabId : string) => {
  //dispatch event to bring view to front
 document.dispatchEvent(new CustomEvent(TOPICS.CLOSE_TAB, {detail:{
      tabId:tabId
    }}));
  const tab = document.getElementById(`tab_${tabId}`);
  tab.parentElement.removeChild(tab);
}

document.addEventListener(TOPICS.ADD_TAB,(event : CustomEvent) => {

  const tab = document.createElement("div");
  const tabId = event.detail.viewId;
  tab.className = "tab";
  tab.id = `tab_${tabId}`;

  
  tab.className = "tab";
  tab.addEventListener("click", () => {
     //dispatch event to bring view to front
    document.dispatchEvent(new CustomEvent(TOPICS.SELECT_TAB, {detail:{
      selected:tabId
    }}));
    selectTab(tabId);
  });
  const label = document.createElement("div");
  label.className = "label";
  label.title = event.detail.title;
  label.textContent = event.detail.title;

  tab.appendChild(label);
  
  const close = document.createElement("button");
  close.className = "close";
  close.textContent = "x";
  close.addEventListener("click", () => {
    closeTab(tabId);
  });

  tab.appendChild(close);
  
  tab.draggable = true;

  //add drag handler
  tab.addEventListener("dragstart", (event : DragEvent) => {
      draggedTab = tabId;
  });



  tab.addEventListener("dragend", (event : DragEvent) => {
   // event.cancelBubble = true;
  //  event.stopPropagation();
   // event.target.style.display = "none";
   const target : HTMLElement = event.target as HTMLElement;
   target.parentElement.removeChild(target);
    document.dispatchEvent(new CustomEvent(TOPICS.DROP_TAB,{detail:{tabId:draggedTab}}));
    
    draggedTab = null;
    
  });

  document.getElementById("tabBar").appendChild(tab);
  const content = document.createElement("div");
  content.id = `content_${tabId}`;
  content.className = "content";
  document.getElementById("contentContainer").appendChild(content);
  //select the new Tab
  selectTab(tabId);
});


document.addEventListener(TOPICS.SELECT_TAB, (event : CustomEvent) => {
  selectTab(event.detail.selected);
});

document.addEventListener(TOPICS.CHANNEL_SELECTED, (event : CustomEvent) => {
  const channelPicker = document.getElementById("channelPicker");
  channelPicker.style.backgroundColor = event.detail.channel.displayMetadata.color;
  channelPicker.style.borderColor = event.detail.channel.displayMetadata.color2;
});

document.addEventListener("DOMContentLoaded",() => {
  
  const tabBar = document.getElementById("tabBar");

  /*document.addEventListener("drop", (event) => {
    alert("drop!");
    document.dispatchEvent(new CustomEvent("WORK:dropWSTab",{detail:{tabId:draggedTab}}));
    draggedTab = null;
  });*/

  tabBar.addEventListener("dragenter", (event) => {
    

  });

  tabBar.addEventListener("dragleave", (event) => {
  /*  if (draggedTab){
      const tab = document.getElementById(`tab_${draggedTab}`);
      tab.parentElement.removeChild(tab);
      document.dispatchEvent(new CustomEvent("WORK:dropTab",{detail:{tabId:draggedTab}}));
    }*/

  });


  const newTab = document.getElementById("newTab");
  newTab.addEventListener("click",() => {
    ipcRenderer.send(TOPICS.NEW_TAB,{'source':id});
  });

  const channelPicker = document.getElementById("channelPicker");
  channelPicker.addEventListener("click",() => {
    ipcRenderer.send(TOPICS.PICK_CHANNEL,{'source':id});
  });
  
  const tabToolsButton = document.getElementById("tabDevTools");
  const frameToolsButton = document.getElementById("frameDevTools");

  tabToolsButton.addEventListener("click",() => {
    ipcRenderer.send(TOPICS.TAB_DEV_TOOLS,{'source':id});
  });

  const signInButton = document.getElementById("signIn");
  signInButton.addEventListener("click",() => {
    ipcRenderer.send(TOPICS.SIGN_IN,{'source':id});
  });

  frameToolsButton.addEventListener("click",() => {
    ipcRenderer.send(TOPICS.FRAME_DEV_TOOLS,{'source':id});
  });



});