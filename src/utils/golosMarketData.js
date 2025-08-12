import config from 'config'
import xml2js from 'xml2js'
import golos from 'golos-lib-js'
import { fetchEx } from 'golos-lib-js/lib/utils'

const cfgSymbols = config.get('symbols')

function getID(sym) {
    for (const [cmcSym, val] of Object.entries(cfgSymbols)) {
        if (val[0] === sym.toUpperCase()) {
            return val[1]
        }
    }
    return null
}

async function rubInUsd() {
    try {
        const now = new Date()
        const date = now.toLocaleDateString('en-GB')
        let resp = await fetchEx('https://www.cbr.ru/scripts/XML_daily.asp?date_req=' + date, {
            timeout: 2000
        })
        let xml = await resp.text()
        const parser = new xml2js.Parser()
        xml = await parser.parseStringPromise(xml)
        for (const val of xml.ValCurs.Valute) {
            if (val.CharCode[0] === 'USD') {
                return parseFloat(val.Value[0].split(',').join('.'))
            }
        }
    } catch (err) {
        console.error(err, 'rubInUsd')
    }
    return 0
}

export async function golosMarketData(syms) {
    let resp = {
        data: {}
    }

    for (const sym of syms) {
        let usdSym
        if (config.has('tokens_to_usd.' + sym)) {
            usdSym = config.get('tokens_to_usd.' + sym);
        }
        if (!usdSym && config.has('default_token_usd')) {
            usdSym = config.get('default_token_usd');
        }
        let toUsdPair
        if (usdSym) toUsdPair = [sym, usdSym];

        if (toUsdPair) {
            console.log('CMC failure, using Golos market price:')

            let price_usd = 0
            if (toUsdPair[0] === toUsdPair[1]) {
                price_usd = 1;
            } else {
                try {
                    const trades = await golos.api.getRecentTradesAsync(25, toUsdPair)
                    const trade = trades[0]
                    if (trade) {
                        const amount = trade.current_pays
                        if (amount.endsWith(' ' + toUsdPair[0])) {
                            price_usd = parseFloat(trade.open_pays) / parseFloat(trade.current_pays)
                        } else {
                            price_usd = parseFloat(trade.current_pays) / parseFloat(trade.open_pays)
                        }
                    }
                } catch (err) {
                    console.error(err)
                }
            }

            console.log(price_usd, 'USD per ' + sym)
            let price_rub
            const rub = await rubInUsd()
            if (rub) {
                price_rub = price_usd * rub
            } else {
                console.warn('No RUB-USD quote available')
            }
            const id = getID(sym);
            resp.data[id] = {
                quote: {
                    RUB: {
                        price: price_rub
                    },
                    USD: {
                        price: price_usd
                    }
                }
            }
        }
    }

    return resp
}
