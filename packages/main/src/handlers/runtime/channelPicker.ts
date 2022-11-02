import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';

export const hideChannelWindow = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //bring selected browserview to front
  const workspace = runtime?.getWorkspace(message.source);
  workspace?.hideChannelWindow();
};

export const pickChannel = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const sourceWS = runtime.getWorkspace(message.source);
  const mouseX: number = message.data.mouseX || 0;
  const mouseY: number = message.data.mouseY || 0;
  if (sourceWS) {
    sourceWS.showChannelWindow(mouseX, mouseY);
  }
};

export const joinChannel = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const sourceWS = runtime.getWorkspace(message.source);
  if (sourceWS) {
    sourceWS.setChannel(message.data.channel);
  }
};
