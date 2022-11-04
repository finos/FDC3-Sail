import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';
import { WebContents } from 'electron';
import { RUNTIME_TOPICS } from './topics';
import { Runtime } from '/@/runtime';

export function initFetchFromDirectory(
  runtime: Runtime = getRuntime(),
): (message: RuntimeMessage) => Promise<void> {
  return async (message: RuntimeMessage) => {
    const directory = runtime.getDirectory();

    const result = directory.retrieveByQuery(message.data.query);

    //request can come frome 2 types of (priviledged) sources: the workspace UI and views
    //if the sourceType is View.  We need to check that the view is a 'system' view and can access the directory
    //through this API.  Today, this is only the 'home' view.
    let wContents: WebContents | undefined = undefined;

    if (message.data.sourceType && message.data.sourceType === 'view') {
      //ensure this is a view that has permissions for this api
      const sourceView = runtime.getView(message.source);

      if (sourceView && sourceView.isSystemView() && sourceView.content) {
        wContents = sourceView.content.webContents;
      }
    } else {
      const sourceWS = runtime.getWorkspace(message.source);
      if (sourceWS && sourceWS.window) {
        wContents = sourceWS.window.webContents;
      }
    }

    if (wContents) {
      wContents.send(
        `${RUNTIME_TOPICS.FETCH_FROM_DIRECTORY}-${message.data.query}`,
        {
          data: result,
        },
      );
    }
  };
}
