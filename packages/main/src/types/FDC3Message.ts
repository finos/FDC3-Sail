import {FDC3App} from './FDC3Data';
import {Context} from '@finos/fdc3';

export interface FDC3Message {
    topic  : string | null;
    source : string;
    name? : string | null;
    intent? : string | null;
    data? : any | null;
    tabId? : number;
    selected ? : FDC3App | null;
    context ? : Context | null;
    
}