import { FDC3Message, SailTargetIdentifier } from '/@/types/FDC3Message';
import { getRuntime } from '/@/index';

const validAppMetaDataProperties = [
  'appId',
  'instanceId',
  'name',
  'version',
  'instanceMetadata',
  'title',
  'tooltip',
  'description',
  'icons',
  'screenshots',
  'resultType',
];

function filterProperties(o: any) {
  const subset = Object.fromEntries(
    validAppMetaDataProperties
      .filter((k) => k in o) // line can be removed to make it inclusive
      .map((k) => [k, o[k]]),
  );

  return subset;
}

export const getAppMetadata = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: SailTargetIdentifier = message.data as SailTargetIdentifier;
  const dir = runtime.getDirectory();

  if (data.appId) {
    return filterProperties(dir.retrieveByAppId(data.appId));
  } else if (data.name) {
    return filterProperties(dir.retrieveByName(data.name));
  } else {
    // no argument = assume the current app.
    const view = runtime.getView(message.source);
    const appId = view?.config?.directoryData?.appId;
    return filterProperties(dir.retrieveByAppId(appId!)[0]);
  }
};

export const getAppId = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const view = runtime.getView(message.source);
  const appId = view?.config?.directoryData?.appId;
  const instanceId = view?.id;

  return {
    appMetadata: {
      appId: appId,
      instanceId,
    },
    OtherNonsense: 'blb',
  };
};
