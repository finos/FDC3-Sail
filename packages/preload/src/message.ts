import { FDC3MessageData } from "/@main/types/FDC3Message";

/**
 * Provides a type for send message
 */
export type SendMessage = (topic: string, data: FDC3MessageData) => Promise<any>

/**
 * Implemented by ipcRenderer
 */
export interface MessagingSupport {
    on(channel: string, listener: (event: Event, ...args: any[]) => void): this;
    send(channel: string, ...args: any[]): void;
} 