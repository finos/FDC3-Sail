import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';
import { DirectoryApp } from '../../types/FDC3Data';
import { TOPICS } from '../../constants';

export const resolveIntent = async (message: RuntimeMessage) => {
  const runtime = getRuntime();

  //TODO: autojoin the new app to the channel which the 'open' call is sourced from

  if (!message.data.selected.instanceId) {
    const data: DirectoryApp = message.data.selected?.directoryData;

    //launch window
    const runtime = getRuntime();
    if (runtime) {
      const win = runtime.createWorkspace();
      const view = win.createView(data.start_url, {
        directoryData: data as DirectoryApp,
      });

      //set pending intent and context
      view.setPendingIntent(
        message.data.intent,
        message.data.context,
        message.data.id,
      );
    }
  } else {
    const view = runtime.getView(message.data.selected?.instanceId);
    //send new intent
    if (view && view.parent) {
      view.content.webContents.send(TOPICS.FDC3_INTENT, {
        topic: 'intent',
        data: { intent: message.data.intent, context: message.data.context },
        source: message.data.id,
      });
      view.parent.setSelectedTab(view.id);
    }
  }

  //close the resolver
  const resolver = runtime.getResolver();
  if (resolver) {
    resolver.close();
  }
};
