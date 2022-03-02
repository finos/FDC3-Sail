import {channels as systemChannels} from "../../main/src/system-channels";
import {Channel} from '@finos/fdc3';


function joinChannel(channel : string){
    //get the current active tab and message
 /*   chrome.tabs.query({active:true, currentWindow:true},tab => {
        chrome.tabs.sendMessage(tab[0].id, {
            message:"popup-join-channel",
            channel:channel
        });
    });*/
    document.dispatchEvent(new CustomEvent("WIN:join-channel", {detail:{"channel":channel}}));

}

function getSelectedChannel(){
   /* return new Promise((resolve, reject) => {

        chrome.tabs.query({active:true, currentWindow:true},tab => {
            chrome.tabs.sendMessage(tab[0].id, {
                message:"popup-get-current-channel"
            },response =>{
                resolve(response);
            });
        });
    });*/
 
}

export class FDC3ChannelPicker extends HTMLElement {

    closed : boolean = true;
    handle : HTMLElement | null = null;
    channels : Array<Channel> = [];

    constructor() {
        super();


        // Create a shadow root
      var shadow = this.attachShadow({mode: 'open'});

      // Create wrapper element
      var wrapper = document.createElement('div');
      wrapper.id = "channel-picker"

      // Create some CSS to apply to the shadow dom
      const style = document.createElement('style');
  
      style.textContent = `
      #channel-picker {
          display: inline-flex;
          border:solid 1px #999;
          width: 18px;
          z-index:9999;
      }
      .picker-item {
          margin:0px;
          top:0px;
          left:0px;
          height:18px;
          width:18px;
          z-index:9999;
       
          display:none;
      }

      #handle {
          display:block;
          background:url('./link.png');
          background-size:16px;
          background-position:center;
          backgrount-color:#aaa;
      }
      `;



      let handle = document.createElement("div");
          handle.id = "handle";
          handle.className = "picker-item";
          handle.title = "Set Tab Channel";
      this.handle = handle;
      let toggle = this.toggle.bind(this);
          handle.addEventListener("click",toggle);
          wrapper.appendChild(handle);
       // Attach the created elements to the shadow dom
      shadow.appendChild(style);
      shadow.appendChild(wrapper);

          const target = wrapper;
        let defChan : Array<any> = [{id:"default", type: "public", "displayMetadata":{name:"Linking Off", color:"#ccc",color2:"#999"}}];
        //add the "default" option and remove the global channel from the list
       defChan.concat(systemChannels.filter(c => {return c.id !== "global";})).forEach((c) => {this.channels.push(c)});
       console.log(this.channels);
       
          this.channels.forEach(channel => {
                let ch = document.createElement("div");
                let select = this.selectItem.bind(this);
                let hover = this.hoverItem.bind(this);
                let revert = this.revertItem.bind(this);
                ch.id = channel.id;
                ch.className = "picker-item";
                ch.title = channel.displayMetadata && channel.displayMetadata.name || "";
                ch.style.backgroundColor = channel.displayMetadata && channel.displayMetadata.color || "";
              
                target.appendChild(ch);
                ch.addEventListener("click",select);
                ch.addEventListener("mouseover",hover);
                ch.addEventListener("mouseout",revert);
          });
         
    /*      getSelectedChannel().then(chan => {
            console.log("selected channel : " + chan);
            if (chan){
                this.selectItem({target:{id:chan}}); 
            }
            if (!this.closed){
                this.toggle();
            }
          });*/

         /* chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
              if (request.message === "set-badge"){
                  console.log("set-badge " + request.channel + " tab " + sender.tab.id);
                chrome.browserAction.setBadgeText({text:"+",
                                    tabId:sender.tab.id});
                let selectedChannel = this.channels.find(chan => {return chan.id === request.channel});
                chrome.browserAction.setBadgeBackgroundColor({color:selectedChannel.displayMetadata.color,
                                tabId:sender.tab.id});
                }

         });*/

    }

    selectItem(ev : MouseEvent) {
        const target  = (ev.target as HTMLElement);
        const selection = target.id;
        const root = this.shadowRoot;
        if (root){
            const picker = root.getElementById("channel-picker");
            if (picker){
                if (selection === "default"){
                    joinChannel(selection);
                    this.toggle();
                    picker.style.borderColor = "#999";
                /*   chrome.tabs.query({active:true, currentWindow:true},tab => {
                        chrome.browserAction.setBadgeText({text:"",
                            tabId:tab[0].id});
                    });*/
                } else {
                    joinChannel(selection);
                        this.toggle();
                        let selectedChannel = this.channels.find(chan => {return chan.id === selection});
                        if (selectedChannel && selectedChannel.displayMetadata && selectedChannel.displayMetadata.color){
                            picker.style.borderColor = selectedChannel.displayMetadata.color;
                            
                        }
                }
            }
        }
    }

    hoverItem(ev : MouseEvent){
        const target  = (ev.target as HTMLElement);
        const selection = target.id;
        const selectedChannel = this.channels.find(chan => {return chan.id === selection});
        if (selectedChannel && selectedChannel.displayMetadata && (selectedChannel.displayMetadata as any).color2){
            target.style.backgroundColor = (selectedChannel.displayMetadata as any).color2;
        }
    }

    revertItem(ev : MouseEvent){
        const target  = (ev.target as HTMLElement);
        const selection = target.id;
        const selectedChannel = this.channels.find(chan => {return chan.id === selection});
        if (target && selectedChannel && selectedChannel.displayMetadata && selectedChannel.displayMetadata.color){
            target.style.backgroundColor = selectedChannel.displayMetadata.color;
        }
    }
    toggle() {
      const root = this.shadowRoot;
      if (root){
        const items = root.querySelectorAll(".picker-item");
        const picker = root.getElementById("channel-picker");
            if (picker){
                if (!this.closed){              
                    items.forEach(item => {
                        item.setAttribute("style","display:none;");
                    });
                    const handle = root.getElementById("handle");
                    if (handle){
                        handle.style.display = "inline-flex";
                        picker.style.transition = "all 0.4s ease";
                        picker.style.width = "18px";
                        picker.style.borderTop = "1px";
                            picker.style.borderLeft = "1px";
                        /*picker.style.borderColor="#999"*/
                        this.closed = true;
                    }
                }
                else {
                items.forEach(item => {
                        item.setAttribute("style","display:inline-flex;");
                        picker.style.transition = "all 0.4s ease";
                        picker.style.width = "140px";
                        picker.style.borderTop = "0px";
                        picker.style.borderLeft = "0px";
                    picker.style.borderColor="#666"
                    this.closed = false;
                    });
                }
            }
      }
    }

   
}
