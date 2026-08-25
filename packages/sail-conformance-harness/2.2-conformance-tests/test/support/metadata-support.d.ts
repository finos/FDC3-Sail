import { IntentResolution, AppIdentifier, AppMetadata, Channel, Context, ContextMetadata, ImplementationMetadata } from '@finos/fdc3';
export declare class MetadataValidator {
    validateAppMetadata(metadata: AppMetadata): void;
    validateImplementationMetadata(implMetadata: ImplementationMetadata): void;
    validateAppIdentifier(appIdentifier: AppIdentifier | undefined): void;
}
export declare class MetadataFdc3Api {
    openMetadataApp(contextType?: string): Promise<AppIdentifier>;
    getAppInstances(): Promise<AppIdentifier[]>;
    getAppMetadata(appIdentifier?: AppIdentifier): Promise<AppMetadata>;
    retrieveAppControlChannel(): Promise<Channel>;
    raiseIntent(intent: string, contextType: string, appIdentifier: AppIdentifier): Promise<IntentResolution>;
    getInfo(): Promise<ImplementationMetadata>;
}
export interface MetadataContext extends Context {
    implMetadata?: ImplementationMetadata;
    contextMetadata?: ContextMetadata;
}
