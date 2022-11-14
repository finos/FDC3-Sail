import { Runtime } from '/@/runtime';
import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';
import { WebContents } from 'electron';
import { RUNTIME_TOPICS } from './topics';

export const getSessionState = (
  runtime: Runtime = getRuntime(),
): ((message: RuntimeMessage) => Promise<unknown>) => {
  return async (message: RuntimeMessage) => {
    const result = runtime.getSessionState();

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
    }

    if (wContents) {
      wContents.send(`${RUNTIME_TOPICS.GET_SESSION_STATE}`, {
        data: result,
      });
    }
  };
};
