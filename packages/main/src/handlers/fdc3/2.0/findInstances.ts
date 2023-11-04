import { getRuntime } from '/@/index';
import {
  FDC3Message,
  FindInstancesData,
  SailTargetIdentifier,
} from '/@/types/FDC3Message';
import { View } from '/@/view';

export const findInstances = async (
  message: FDC3Message,
): Promise<SailTargetIdentifier[]> => {
  const app = (message.data as FindInstancesData).app as SailTargetIdentifier;
  const runtime = getRuntime();

  const openViews: View[] = Array.from(runtime.getViews().values());
  let matching: View[];

  if (app.name) {
    matching = openViews.filter((v) => v.directoryData?.name == app.name);
  } else if (app.appId) {
    matching = openViews.filter((v) => v.directoryData?.appId == app.appId);
  } else if (app.instanceId) {
    matching = openViews.filter((v) => v.id == app.instanceId);
  } else {
    matching = [];
  }

  return matching.map((v) => {
    return {
      appId: v.directoryData?.appId,
      name: v.directoryData?.name,
      instanceId: v.id,
      appMetadata: v.directoryData,
    };
  });
};
