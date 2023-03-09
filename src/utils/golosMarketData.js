import config from 'config'
import xml2js from 'xml2js'
import golos from 'golos-lib-js'
import { fetchEx } from 'golos-lib-js/lib/utils'

const golosUsdPair = config.has('golos_usd') ? config.get('golos_usd') : null

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

export async function golosMarketData() {
    let resp = null
    if (golosUsdPair) {
        const golosId = getID('GOLOS').toString()

        console.log('CMC failure, using Golos market price:')

        let price_usd = 0
        try {
            const trades = await golos.api.getRecentTradesAsync(25, golosUsdPair)
            const trade = trades[0]
            if (trade) {
                const amount = trade.current_pays
                if (amount.endsWith(' ' + golosUsdPair[0])) {
                    price_usd = parseFloat(trade.open_pays) / parseFloat(trade.current_pays)
                } else {
                    price_usd = parseFloat(trade.current_pays) / parseFloat(trade.open_pays)
                }
            }
        } catch (err) {
            console.error(err)
        }

        console.log(price_usd, 'USD per GOLOS')
        let price_rub
        const rub = await rubInUsd()
        if (rub) {
            price_rub = price_usd * rub
        } else {
            console.warn('No RUB-USD quote available')
        }
        resp = {
            data: {
                [golosId]: {
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
    }
    return resp
}
