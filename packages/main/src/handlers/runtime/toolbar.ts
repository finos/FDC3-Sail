import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';
import { Menu } from 'electron';

export const openToolsMenu = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //bring selected browserview to front
  const workspace = runtime?.getWorkspace(message.source);

  if (workspace) {
    const template = [
      {
        label: 'Top Nav Dev Tools',
        click: () => {
          if (workspace && workspace.window) {
            workspace.window.webContents.openDevTools();
          }
        },
      },
      {
        label: 'Main Dev Tools',
        click: () => {
          if (workspace && workspace.selectedTab) {
            const selectedTab = runtime.getView(workspace.selectedTab);
            if (selectedTab && selectedTab.content) {
              selectedTab.content.webContents.openDevTools();
            }
          }
        },
      },
      {
        label: 'View Session',
        click: async () => {
          await workspace.createSessionView();
        },
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup();
  }
};
