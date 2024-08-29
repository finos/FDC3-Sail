import { AppIdentifier, AppMetadata, Context } from "@finos/fdc3";


export interface AppSupport {
    
    hasDesktopAgentBridging(): boolean;

    hasOriginatingAppMetadata(): boolean;

    findInstances(app: AppIdentifier): Promise<Array<AppIdentifier>>

    getAppMetadata(app: AppIdentifier): Promise<AppMetadata>

    open(app: AppIdentifier, context?: Context) : Promise<AppIdentifier>

    getThisAppMetadata(): Promise<AppMetadata>

}