import {ipcRenderer} from 'electron';
import {channels} from '../../main/src/system-channels';
import {TOPICS} from '../../main/src/constants';


//flag to indicate the background script is ready for fdc3!
let connected : boolean = true;
let id : string | null = null;

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




(document as any).addEventListener(TOPICS.JOIN_CHANNEL,(event : CustomEvent) => {
    ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL,{'source':id, 'data':event.detail});
});


(document as any).addEventListener(TOPICS.SELECT_TAB, (event :CustomEvent)=> {
    ipcRenderer.send(TOPICS.SELECT_TAB,{'source':id,'selected':event.detail.selected});
});

(document as any).addEventListener(TOPICS.CLOSE_TAB, (event :CustomEvent)=> {
    ipcRenderer.send(TOPICS.CLOSE_TAB,{'source':id,'tabId':event.detail.tabId});
});

(document as any).addEventListener(TOPICS.DROP_TAB, (event :CustomEvent)=> {
    ipcRenderer.send(TOPICS.DROP_TAB,{'source':id,'tabId':event.detail.tabId});
});

/*
    Listen for UI Events
*/

  document.addEventListener(TOPICS.NEW_TAB_CLICK,() => {
      ipcRenderer.send(TOPICS.NEW_TAB,{'source':id});
  });

  document.addEventListener(TOPICS.OPEN_CHANNEL_PICKER_CLICK,() => {
    ipcRenderer.send(TOPICS.PICK_CHANNEL,{'source':id});
});

document.addEventListener(TOPICS.OPEN_FRAME_TOOLS_CLICK,() => {
    ipcRenderer.send(TOPICS.FRAME_DEV_TOOLS,{'source':id});
});

document.addEventListener(TOPICS.OPEN_TAB_TOOLS_CLICK,() => {
    ipcRenderer.send(TOPICS.TAB_DEV_TOOLS,{'source':id});
});





document.addEventListener("DOMContentLoaded",()=>{

    
/*
    new autoComplete({
        data: {                              // Data src [Array, Function, Async] | (REQUIRED)
          src:  () => {
              return new Promise((resolve, reject) => {

         
            // API key token
         //   const token = "this_is_the_API_token_number";
            // User search query
            const query = (document.querySelector("#autoComplete") as HTMLInputElement).value;
            ipcRenderer.once(`${TOPICS.FETCH_FROM_DIRECTORY}-/apps/search?text=${query}`,(event, args) => {
                //resolve(args.data);
                //add web search results
                const results = args.data;
                const link = `https://${query}`;
                results.push({source:id, title:link, start_url:link});
              
                ipcRenderer.send("RES:loadResults",{source:id, results:results});
            });
            // Fetch External Data Source
            ipcRenderer.send(TOPICS.FETCH_FROM_DIRECTORY,{'source':id, 'query':`/apps/search?text=${query}`});
            //const directoryUrl = "https://appd.kolbito.com"; //await utils.getDirectoryUrl();
            //const source = await fetch(`${directoryUrl}/apps/search?text=${query}`);
            // Format data into JSON
            //const data = await source.json();
            // Return Fetched data
           // resolve(data);
        });
          },
          key: ["name"],
          cache: false
        },
       
        placeHolder: "fdc3...",     // Place Holder text                 | (Optional)
        selector: "#autoComplete",           // Input field selector              | (Optional)
        threshold: 3,                        // Min. Chars length to start Engine | (Optional)
        debounce: 300,                       // Post duration for engine to start | (Optional)
        searchEngine: "loose",              // Search Engine type/mode           | (Optional)
        resultsList: {                       // Rendered results list object      | (Optional)
            render: true,
            container:( source : HTMLElement) => {
                source.setAttribute("id", "result_list");
            },
            destination: "#autoComplete",
            position: "afterend",
            element: "div"
        },
        maxResults: 5,                         // Max. number of rendered results | (Optional)
        highlight: true,                       // Highlight matching results      | (Optional)
        resultItem: {                          // Rendered result item            | (Optional)
            content: (data : any, source : HTMLElement) => {
                console.log("result item", data);
                source.innerHTML = data.value.title;
            },
            element: "div"
        },
        noResults: () => {                     // Action script on noResults      | (Optional)
            const result = window.document.createElement("li");
            result.setAttribute("class", "no_result");
            result.setAttribute("tabindex", "1");
            result.innerHTML = "No Results";
            const resultList = document.querySelector("#result_list");
            if (resultList){
                resultList.appendChild(result);
            }
        },
        onSelection: (feedback : any) => {             // Action script onSelection event | (Optional)
           // console.log("selection",feedback.selection);
            const selection = feedback.selection.value.name;
            ipcRenderer.send(TOPICS.FDC3_OPEN,{'topic':'open', 'source':id, 'data':{name:selection}});
           // console.log(feedback.selection.value.title);
            // Render selected choice to selection div
            //document.querySelector(".selection").innerHTML = selection;
            // Clear Input
            (document.querySelector("#autoComplete") as HTMLInputElement).value = "";
            // Change placeholder with the selected value
        //	document
        //        .querySelector("#autoComplete")
         //       .setAttribute("placeholder", selection);
         //      chrome.tabs.query({active:true, currentWindow:true},tab => {
         //           chrome.tabs.sendMessage(tab[0].id, {
         //               message:"popup-open",
         //               name:selection
         //           });
                });
                
        }
    });
    
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
        const autoComplete = document.querySelector("#autoComplete");
        if (autoComplete){
            autoComplete.addEventListener(eventType, function() {
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
        }
      });*/
      
});

//viewId of currently selected tab
let currentTab : string | null  = null; 
let draggedTab : HTMLElement | null = null;

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
    if (newTab){
        newTab.className = "tab selected"; 
    }
};

const closeTab = (tabId : string) => {
  //dispatch event to bring view to front
 document.dispatchEvent(new CustomEvent(TOPICS.CLOSE_TAB, {detail:{
      tabId:tabId
    }}));
  const tab = document.getElementById(`tab_${tabId}`);
  if (tab && tab.parentElement){
      tab.parentElement.removeChild(tab);
  }
}
/*
(document as any).addEventListener(TOPICS.ADD_TAB,(event : CustomEvent) => {

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
   if (target && target.parentElement){
    target.parentElement.removeChild(target);
        document.dispatchEvent(new CustomEvent(TOPICS.DROP_TAB,{detail:{tabId:draggedTab}}));
        
        draggedTab = null;
   }    
  });

  (document as any).getElementById("tabBar").appendChild(tab);
  const content = document.createElement("div");
  content.id = `content_${tabId}`;
  content.className = "content";
  const contentContainer = document.getElementById("contentContainer");
  if (contentContainer){
    contentContainer.appendChild(content);
    //select the new Tab
    selectTab(tabId);
  }
});
*/

(document as any).addEventListener(TOPICS.SELECT_TAB, (event : CustomEvent) => {
  selectTab(event.detail.selected);
});

(document as any).addEventListener(TOPICS.CHANNEL_SELECTED, (event : CustomEvent) => {
  const channelPicker = document.getElementById("channelPicker");
  if (channelPicker){
    channelPicker.style.backgroundColor = event.detail.channel.displayMetadata.color;
    channelPicker.style.borderColor = event.detail.channel.displayMetadata.color2;
  }
});

