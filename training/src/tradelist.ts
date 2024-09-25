import { fdc3Ready, Channel, Context, PrivateChannel } from '@kite9/fdc3'

// lab-9
type StockItem = {
    ticker: string, 
    holding: number,
    value: number,
    channel?: Channel
}

let stockItems : StockItem[] = [ {
    ticker: 'TSLA',
    holding: 400,
    value: 0
}]

function addStock(ticker: string, holding: number) {
  const stock : StockItem = {
    ticker,
    holding,
    value: 0
  };

  stockItems.push(stock);
  render();
}

function removeStock(si: StockItem) {
    stockItems = stockItems.filter(e => e != si);
    render();
}

// lab-7

function renderStock(si: StockItem) : HTMLTableRowElement {
    const out : HTMLTableRowElement = document.createElement("tr");
    const ticker : HTMLTableCellElement = document.createElement("td");
    ticker.textContent = si.ticker;
    out.appendChild(ticker);
    const holding : HTMLTableCellElement = document.createElement("td");
    holding.textContent = ""+si.holding;
    out.appendChild(holding); 
    const price : HTMLTableCellElement = document.createElement("td");
    price.textContent = ""+si.value;
    out.appendChild(price);
    
    const value : HTMLTableCellElement = document.createElement("td");
    value.textContent = (si.value*si.holding).toFixed(2);
    out.appendChild(value);

    const buttons : HTMLTableCellElement = document.createElement("td");
    const remove : HTMLButtonElement = document.createElement("button");
    buttons.appendChild(remove);
    remove.textContent="X"
    remove.onclick = () => removeStock(si);
    out.appendChild(buttons);
    
    // lab-4
 
    // lab-6
 
    // lab-7
    const ctx =  { type: "fdc3.instrument", id: { ticker: si.ticker }};
    if (window.fdc3) {
        // quote button
        const price : HTMLButtonElement = document.createElement("button");
        buttons.appendChild(price);
        price.textContent="..."
        price.onclick = () => {
            window.fdc3.raiseIntentForContext(ctx);
        }
    }

    // lab-7

    return out;
}

function render() {
    const stockList = document.getElementById("stock-list")!!
    while (stockList.lastElementChild) {
        stockList.removeChild(stockList.lastElementChild);
    }        

    stockItems.map(si => renderStock(si)).forEach(e => stockList.appendChild(e));

    const totalValue = stockItems
        .map(si => si.holding * si.value)
        .reduce((a,b) => a+b, 0)
        .toFixed(2);

    const totalStr = ""+totalValue

    document.getElementById("total")!!.textContent = totalStr;
}

const theForm = document.getElementById("js-form") as HTMLFormElement;

theForm.addEventListener("submit", event => {
    event.preventDefault();
    const ticker = document.getElementById("ticker") as HTMLInputElement;
    const holding = document.getElementById("holding") as HTMLInputElement;
    if ((ticker.value.length > 0) && (holding.value.length > 0)) {
        addStock(ticker.value, parseFloat(holding.value));
    }
});

window.addEventListener("load", _e => render());


// lab-4
// redraws the screen when FDC3 is enabled, in case we need to see the new buttons
fdc3Ready().then(() => {
    render()
});
 
// lab-9
fdc3Ready().then((da) => {

    // make sure we are getting price updates for each stock
    // setInterval(() => {
    //     stockItems.forEach(s => {
    //         if (!s.channel) {
    //             const ctx : Context = { type: "fdc3.instrument", id: { ticker: s.ticker }};
    //             fdc3.raiseIntent("demo.GetPrices", ctx).then(async (r: Context) => {
    //                 const result = await r.getResult();
    //                 if (result?.broadcast) {
    //                     const channel = result as PrivateChannel;
    //                     s.channel = channel;
    //                     channel.addContextListener("fdc3.valuation", (valuation: Context) => {
    //                         if (valuation?.value) {
    //                             s.value = parseFloat((Math.round(valuation.value * 100) / 100).toFixed(2));
    //                         }
    //                     });
    //                  }
    //             })
    //         }
    //     })
    // }, 5000);

    // update the screen
    setInterval(render, 5000);
})