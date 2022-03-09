import {ipcRenderer} from 'electron';
import {TOPICS, TARGETS} from '../../../main/src/constants';

let workspaceId : string | null = null;

ipcRenderer.on(TOPICS.WINDOW_START, (event, args) => {
    workspaceId = args.workspaceId;
    console.log("start", workspaceId);
 });

ipcRenderer.on(TOPICS.RES_LOAD_RESULTS,(event, args) => {
  console.log("load search results", args);
   const resultsList = document.getElementById("results");
   if (resultsList){
    resultsList.innerHTML = "";
    const results = args.results;
    results.forEach((result : any) => {
        const item = document.createElement("li");
        item.textContent = result.title;
        item.className = "result";
        item.addEventListener("click",(event) => {
            selectResult(result);
        });
        resultsList.appendChild(item);
    });
  }
});


const selectResult = (result : any) => {
  const selection = result.name;
  if (selection){
    ipcRenderer.send(TOPICS.FDC3_OPEN,{'topic':'open', 'source':workspaceId, 'data':{name:selection}});
  }
  else if (result.start_url){
      ipcRenderer.send(TOPICS.NAVIGATE,{url:result.start_url, target:"tab", 'source':workspaceId});
  }
  ipcRenderer.send(TOPICS.HIDE_WINDOW, {source:workspaceId, target:TARGETS.SEARCH_RESULTS})
};