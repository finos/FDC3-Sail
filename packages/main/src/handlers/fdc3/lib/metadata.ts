import { FDC3Message, SailTargetIdentifier } from "/@/types/FDC3Message";
import { getRuntime } from '/@/index';
import { DirectoryApp, DirectoryIntent } from '/@/directory/directory';


export const getAppMetadata = async (message: FDC3Message) => {
    const runtime = getRuntime();
    const data: SailTargetIdentifier = message.data as SailTargetIdentifier;
    const dir = runtime.getDirectory();

    if (data.appId) {
        return dir.retrieveByAppId(data.appId);
    } else if (data.name) {
        return dir.retrieveByName(data.name);
    } else {
        // no argument = assume the current app.
        return {

        }
    }
};