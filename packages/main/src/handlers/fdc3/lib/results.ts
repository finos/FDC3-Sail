import { FDC3_TOPICS } from "../topics";
import { getRuntime } from "/@/index";
import { FDC3Message, IntentResultData } from "/@/types/FDC3Message";

export const resultCreated = async (message: FDC3Message) => {
    const runtime = getRuntime();
    console.log("Intent result to deliver: ", message);

    const data = message.data as IntentResultData;
    const resultId = data.resultId;
    const type = data.type;

    const viewId = runtime.getIntentResult(resultId);

    if (viewId) {
        // deliver this to the right view
        const view = runtime.getView(viewId);
        if (view) {
            view.content.webContents.send(FDC3_TOPICS.RESULT_DELIVERY, data);
        }
    }
    
}