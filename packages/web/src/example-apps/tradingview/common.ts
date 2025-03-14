

/* eslint-disable  @typescript-eslint/no-explicit-any */


export interface TradingViewIntent {
    name: string
    function: (context: any, setState: React.Dispatch<any>) => void
}

export interface TradingViewListener {
    name: string
    function: (context: any, setState: React.Dispatch<any>) => void
}

export interface TradingViewMode {
    name: string
    script: string
    innerHTML: (state: object) => string
    initialState: any
    intents: TradingViewIntent[]
    listeners: TradingViewListener[]
}
