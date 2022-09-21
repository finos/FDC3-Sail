import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';
import { WebContents } from 'electron';
import utils from '../../utils';
import fetch from 'electron-fetch';
import { RUNTIME_TOPICS } from './index';

export const fetchFromDirectory = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const directoryUrl = await utils.getDirectoryUrl();
  const response = await fetch(`${directoryUrl}${message.data.query}`);
  const result = await response.json();

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
