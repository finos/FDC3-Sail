import {ipcRenderer} from 'electron';
import {TOPICS} from '../../../main/src/constants';



let id : string | null = null;
let intent : string | null = null;
let context : any = null;

ipcRenderer.on(TOPICS.WINDOW_START, (event, args) => {
    console.log("start");
    id = args.id;
    intent = args.intent;
    context = args.context;


    start(args.options);
});

const resolveIntent = (selected : any) => {
    ipcRenderer.send(TOPICS.RES_RESOLVE_INTENT,{
        method:"resolveIntent",
        id:id,
        intent:intent,
        selected:selected.details,
        context:context
    }); 
}

//document.addEventListener("RES:start",(event) => {
const start = (options : Array<any>) => {
    const root = createResolverRoot();
    const rootContainer= document.getElementById("root");
    if (rootContainer){
        rootContainer.appendChild(root);
    }
    const list = root.querySelector("#resolve-list");
    const clickHandler = (evt : Event, selected : any) => {
    

    resolveIntent(selected);
  
    };
    options.forEach((item) => {
        const selected = item;
        const data = item.details;
        const title = data.directoryData ? data.directoryData.title : data.title;
        const rItem = document.createElement("div");
        rItem.className = "item";
        console.log(data);
        rItem.style.color = "white";
        rItem.style.flexFlow = "row";
        rItem.style.height = "20px";
        rItem.innerText = `${title}${!data.instanceId ? '*' : ''}`;
        

        rItem.addEventListener("click",(event) => {clickHandler.call(window,event,selected);});
        if (list){
            list.appendChild(rItem);
        }
    });
};

function createResolverRoot() {

    // Create root element
    const root = document.createElement('div');
    const wrapper  = document.createElement('div');
    wrapper.id = "fdc3-intent-resolver";




    const header  = document.createElement('div');
    header.id = "resolve-header";
    wrapper.appendChild(header);
    const subheader  = document.createElement('div');
    subheader.id = "resolve-subheader";
    subheader.textContent = "choose an app";
    wrapper.appendChild(subheader);
    const list  = document.createElement('div');
    list.id = "resolve-list";
    wrapper.appendChild(list);
    root.appendChild(wrapper);
    // Attach the created elements to the shadow dom
    //shadow.appendChild(style);
    //shadow.appendChild(wrapper);



    return root;
}