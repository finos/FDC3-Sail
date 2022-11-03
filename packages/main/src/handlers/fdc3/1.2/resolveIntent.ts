import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { FDC3_2_0_TOPICS } from '/@/handlers/fdc3/2.0/topics';
import { FDC3_1_2_TOPICS } from '/@/handlers/fdc3/1.2/topics';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';

export const resolveIntent = async (message: RuntimeMessage) => {
  const runtime = getRuntime();

  //TODO: autojoin the new app to the channel which the 'open' call is sourced from

  if (!message.data.selected.instanceId) {
    const data: DirectoryApp = message.data.selected?.directoryData;

    //launch window
    const runtime = getRuntime();
    if (runtime) {
      const win = runtime.createWorkspace();
      const view = win.createView(
        (data.details as DirectoryAppLaunchDetailsWeb).url,
        {
          directoryData: data as DirectoryApp,
        },
      );

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
      if (view.fdc3Version === '1.2') {
        view.content.webContents.send(FDC3_1_2_TOPICS.INTENT, {
          topic: 'intent',
          data: { intent: message.data.intent, context: message.data.context },
          source: message.data.id,
        });
      } else {
        view.content.webContents.send(FDC3_2_0_TOPICS.INTENT, {
          topic: 'intent',
          data: { intent: message.data.intent, context: message.data.context },
          source: message.data.id,
        });
      }
      view.parent.setSelectedTab(view.id);
    }
  }

  //close the resolver
  const resolver = runtime.getResolver();
  if (resolver) {
    resolver.close();
  }
};
