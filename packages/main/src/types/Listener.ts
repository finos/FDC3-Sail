import { FDC3Message } from "./FDC3Message";
import { Runtime } from "../runtime";


export interface Listener {
    name: string;
    handler: (runtime : Runtime, msg : FDC3Message) => Promise<any>;
};

