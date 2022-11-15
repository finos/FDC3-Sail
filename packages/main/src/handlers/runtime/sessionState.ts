import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';
import { WebContents } from 'electron';
import { RUNTIME_TOPICS } from './topics';

export const getSessionState = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const result = runtime.getSessionState();

  //request can come frome 2 types of (priviledged) sources: the workspace UI and views
  //if the sourceType is View.  We need to check that the view is a 'system' view and can access the directory
  //through this API.  Today, this is only the 'home' view.
  let wContents: WebContents | undefined = undefined;

  const sourceView = runtime.getView(message.source);

  if (sourceView && sourceView.isSystemView() && sourceView.content) {
    wContents = sourceView.content.webContents;
  }

  if (wContents) {
    wContents.send(`${RUNTIME_TOPICS.GET_SESSION_STATE}`, {
      data: result,
    });
  }
};
