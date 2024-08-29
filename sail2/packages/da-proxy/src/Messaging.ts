import { AppIdentifier } from "@finos/fdc3";
import { RegisterableListener } from "./listeners/RegisterableListener";

export interface Messaging {

    /**
     * Source for outgoing message
     */
    getSource(): AppIdentifier

    /**
    * UUID for outgoing message
    */
    createUUID(): string;

    /**
     * Post an outgoing message
     */
    post(message: object): Promise<void>

    /**
     * Registers a listener for incoming messages.
     */
    register(l: RegisterableListener): void

    /**
     * Unregisters a listener with the id given above
     * @param id 
     */
    unregister(id: string): void

    createMeta(): object

    /**
     * Waits for a specific matching message
     */
    waitFor<X>(filter: (m: any) => boolean): Promise<X>

    /**
     * 
     * @param message Performs a request / response message pass
     */
    exchange<X>(message: object, expectedTypeName: string): Promise<X>
}