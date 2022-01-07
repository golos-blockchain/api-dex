import config from 'config'
import git from 'git-rev-sync'
import golos from 'golos-lib-js'
import nc from 'next-connect'

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

const parseMarketPair = (pair) => {
    if (!cfgPairs.includes(pair)) {
        return []
    }
    const [ base, quote ] = pair.split('_')
    return [ cfgSymbols.get(base)[0], cfgSymbols.get(quote)[0] ]
}

let handler = nc({ attachParams: true, })

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

    .get('/api/v1/summary', async (req, res) => {
        const ret = []
        for (const pairId of cfgPairs) {
            const obj = {
                trading_pairs: pairId,
            }
            ret.push(obj)
        }
        res.json(ret)
    })

    .get('/api/v1/orderbook/:market_pair', async (req, res) => {
        const timestamp = Date.now()

        const pair = parseMarketPair(req.params.market_pair)
        if (!pair[0]) {
            throw new APIError('unknown_pair')
        }
        const precision = 3
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
        // TODO: arrange by approx equal price?

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
            obj.price = (parseFloat(base_volume) / parseFloat(quote_volume)).toFixed(8)
            obj.base_volume = base_volume
            obj.quote_volume = quote_volume
            // TODO: check timestamp
            obj.timestamp = (+new Date(trade.date + 'Z')).toString()
            obj.type = pair[0] == asym ? 'sell' : 'buy'
            ret.push(obj)
        }
        res.json(ret)
    })

export default handler
