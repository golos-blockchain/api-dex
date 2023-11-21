import config from 'config'
import git from 'git-rev-sync'
import golos from 'golos-lib-js'
import { Asset, Price } from 'golos-lib-js/lib/utils'

import nextConnect from '@/nextConnect'
import { parseMarketPair } from '@/utils/misc'

golos.config.set('websocket', config.get('node_url'))

const cfgSymbols = config.get('symbols')
const cfgPairs = config.get('pairs')

const toPrecision = (val, prec) => {
    return (val / Math.pow(10, prec)).toFixed(prec)
}

class APIError {
    constructor(errorName) {
        this.errorName = errorName;
    }
}

let handler = nextConnect({ attachParams: true, })

    .get('/api/v1', async (req, res) => {
        let version = 'dev'
        try {
            version = git.short('.');
        } catch (err) {
            console.error('Cannot obtain .git version:', err);
        }
        res.json({
            status: 'ok',
            version,
            timestamp: Date.now(),
        })
    })

    .get('/api/v1/ticker', async (req, res) => {
        const ret = []
        for (const pairId of cfgPairs) {
            const obj = {
            }
            const parsed = parseMarketPair(pairId)
            const ticker = await golos.api.getTickerAsync(parsed)
            const trades = await golos.api.getRecentTradesAsync(50, parsed)
            let last_price = 0
            if (trades[0]) {
                let { current_pays, open_pays } = trades[0]
                current_pays = current_pays.split(' ')[0]
                open_pays = open_pays.split(' ')[0]
                if (trades[0].current_pays.endsWith(parsed[1]))
                    last_price = parseFloat(current_pays) / parseFloat(open_pays)
                else
                    last_price = parseFloat(open_pays) / parseFloat(current_pays)
            }
            const [b, q] = pairId.split('_')
            obj.base_id = cfgSymbols[b][1]
            obj.quote_id = cfgSymbols[q][1]
            obj.last_price = last_price.toFixed(8)
            obj.base_volume = ticker.asset1_volume.split(' ')[0]
            obj.quote_volume = ticker.asset2_volume.split(' ')[0]

            ret.push(obj)
        }
        res.json(ret)
    })

    .get('/api/v1/summary', async (req, res) => {
        const now = Date.now()
        if (global.cachedDate && ((now - global.cachedDate) > 5*60*1000)) {
            delete global.cachedSummary
            delete global.cachedDate
        }
        if (global.cachedSummary) {
            res.setHeader('X-Cached', 'true')
            res.json(global.cachedSummary)
        }
        const ret = []
        for (const pairId of cfgPairs) {
            const obj = {
                trading_pairs: pairId,
            }
            const now = new Date()
            const ONE_DAY = 24 * 3600 * 1000
            const parsed = parseMarketPair(pairId)
            const ticker = await golos.api.getTickerAsync(parsed)
            const trades = await golos.api.getRecentTradesAsync(50, parsed)
            let last_price = 0
            let lowest_price_24h = 0
            let highest_price_24h = 0
            let price_change_percent_24h = 0
            let last_price_24h = 0
            for (let trade of trades) {
                let { current_pays, open_pays } = trade
                current_pays = current_pays.split(' ')[0]
                open_pays = open_pays.split(' ')[0]
                if (trade.current_pays.endsWith(parsed[1]))
                    trade.price = parseFloat(current_pays) / parseFloat(open_pays)
                else
                    trade.price = parseFloat(open_pays) / parseFloat(current_pays)

                if (!last_price)
                    last_price = trade.price

                if (!lowest_price_24h)
                    lowest_price_24h = trade.price
                else if (trade.price < lowest_price_24h)
                    lowest_price_24h = trade.price

                if (trade.price > highest_price_24h)
                    highest_price_24h = trade.price

                const timestamp = (+new Date(trade.date + 'Z'))
                if (now - timestamp <= ONE_DAY) {
                    if (!last_price_24h) last_price_24h = trade.price
                } else {
                    if (last_price_24h && !price_change_percent_24h) {
                        price_change_percent_24h = (trade.price - last_price_24h) * 100 / trade.price
                    }
                }
            }
            obj.last_price = last_price.toFixed(8)
            obj.base_volume = ticker.asset1_volume.split(' ')[0]
            obj.quote_volume = ticker.asset2_volume.split(' ')[0]
            obj.lowest_price_24h = lowest_price_24h.toFixed(8)
            obj.highest_price_24h = highest_price_24h.toFixed(8)
            obj.price_change_percent_24h = price_change_percent_24h.toFixed(8)

            let book = await golos.api.getOrderBookAsync(50, parsed)
            obj.highest_bid = book.asks[0] ? book.asks[0].price : '0.00000000'
            obj.lowest_ask = book.bids[0] ? book.bids[0].price : '0.00000000'

            ret.push(obj)
        }
        if (!global.cachedSummary) {
            res.json(ret)
        }
        global.cachedSummary = ret
        global.cachedDate = now
    })

    .get('/api/v1/orderbook/:market_pair', async (req, res) => {
        const timestamp = Date.now()

        const pair = parseMarketPair(req.params.market_pair)
        if (!pair[0]) {
            throw new APIError('unknown_pair')
        }
        let precision = 3
        if (pair[0] !== 'GOLOS' && pair[0] !== 'GBG') {
            const res = await golos.api.getAssetsAsync('', [
                pair[0]
            ], '', '20', 'by_symbol_name')
            if (!res[0]) {
                throw new APIError('unknown_pair')
            }
            precision = res[0].precision
        }

        const bids = []
        const asks = []
        let data
        try {
            data = await golos.api.getOrderBookAsync(50, pair)
        } catch (err) {
            if (err.toString().includes('Missing object')) {
                throw new APIError('unknown_pair')
            }
            throw err
        }
        for (const bid of data.bids) {
            let asset = bid.asset1
            asset = toPrecision(asset, precision)
            bids.push([bid.price, asset])
        }
        for (const ask of data.asks) {
            let asset = ask.asset1
            asset = toPrecision(asset, precision)
            asks.push([ask.price, asset])
        }

        res.json({
            timestamp: timestamp.toString(),
            bids,
            asks,
        })
    })

    .get('/api/v1/trades/:market_pair', async (req, res) => {
        const pair = parseMarketPair(req.params.market_pair)
        if (!pair[0]) {
            throw new APIError('unknown_pair')
        }
        let data
        try {
            data = await golos.api.getRecentTradesAsync(50, pair)
        } catch (err) {
            if (err.toString().includes('Missing object')) {
                throw new APIError('unknown_pair')
            }
            throw err
        }
        let ret = []
        for (let trade of data) {
            let obj = {}
            obj.trade_id = trade.id.toString()
            let [ a, asym ] = trade.current_pays.split(' ')
            let [ b, bsym ] = trade.open_pays.split(' ')
            const base_volume = pair[0] == asym ? a : b
            const quote_volume = pair[1] == asym ? a : b
            obj.price = (parseFloat(quote_volume) / parseFloat(base_volume)).toFixed(8)
            obj.base_volume = base_volume
            obj.quote_volume = quote_volume
            obj.timestamp = (+new Date(trade.date + 'Z')).toString()
            obj.type = pair[0] == asym ? 'sell' : 'buy'
            ret.push(obj)
        }
        res.json(ret)
    })

    .get('/api/v1/exchange/:sell/:buy_sym/:direction?', async (req, res) => {
        let { sell, buy_sym, direction } = req.params
        if (!direction) direction = 'sell'
        try {
            sell = await Asset(sell.split('%20').join(' '))
        } catch (err) {
            res.json({
                error: 'wrong_sell_asset'
            })
            return
        }

        const pairId = sell.symbol + '_' + buy_sym
        const cached = global.cachedOrders && global.cachedOrders[pairId]
        const now = Date.now()
        let orders
        if (cached && (now - cached.time) < 10*1000) {
           orders = cached.orders 
        } else {
            for (let i = 0; i < 3; ++i) {
                try {
                    orders = await golos.api.getOrderBookExtendedAsync(500, [sell.symbol, buy_sym])
                    break
                } catch (err) {
                    console.error(err)
                }
            }
            if (!orders) {
                res.json({
                    error: 'blockchain_unavailable'
                })
                return
            }
            global.cachedOrders = global.cachedOrders || {}
            global.cachedOrders[pairId] = { orders, time: now }
        }

        const isSell = direction === 'sell'

        if ((isSell && !orders.bids.length) || (!isSell && !orders.asks.length)) {
            res.json({
                error: 'no_orders'
            })
            return
        }

        let ret, best_price, limit_price
        for (const bid of (isSell ? orders.bids : orders.asks)) {
            const price = await Price(bid.order_price)
            best_price = best_price || price.clone()
            limit_price = price.clone()

            const orderAmount = bid.asset1
            const amount = sell.min(orderAmount)
            const receive = amount.mul(price)
            ret = ret ? ret.plus(receive) : receive.clone()
            sell = sell.minus(orderAmount)

            if (sell.lte(0)) {
                break
            }
        }
        res.json({
            result: ret,
            remain: sell.gt(0) ? sell : undefined,
            best_price,
            limit_price
        })
    })

export default handler
