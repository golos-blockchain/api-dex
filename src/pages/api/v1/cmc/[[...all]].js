import config from 'config'
import nc from 'next-connect'
import golos from 'golos-lib-js'
import fetch from 'cross-fetch'

import { corsMiddleware, } from '@/corsMiddleware'

const host = 'https://pro-api.coinmarketcap.com'
const cfgKey = 'coinmarketcap_requests'
const cfg = config[cfgKey]
const cacheLifetime = 15 * 60*1000 // milliseconds

golos.config.set('websocket', config.get('node_url'))

const cfgSymbols = config.get('symbols')

if (!cfg || !cfg.api_key) {
    let key = cfgKey
    if (!cfg.api_key) key += '.api_key'
    console.warn(`Warning: ${key} is not defined, so CMC-requesting part will not work`)
}

function concatIds() {
    let ids = Object.values(cfgSymbols).map(val => val[1])
    return ids.join(',')
}

const allIDs = concatIds()

function getID(sym) {
    for (const [cmcSym, val] of Object.entries(cfgSymbols)) {
        if (val[0] === sym.toUpperCase()) {
            return val[1]
        }
    }
    return null
}

const doRequest = async (convert) => {
    let url = new URL('/v2/cryptocurrency/quotes/latest', host)
    url.searchParams.set('id', allIDs)
    url.searchParams.set('convert', convert)

    const headers = new Headers({
        'X-CMC_PRO_API_KEY': cfg.api_key
    })
    let resp = await fetch(url, {
        headers
    })
    resp = await resp.json()
    return resp
}

let handler = nc({ attachParams: true, })
    .use(corsMiddleware())

    .get('/api/v1/cmc/:sym', async (req, res) => {
        if (!cfg || !cfg.api_key) {
            let key = cfgKey
            if (!cfg.api_key) key += '.api_key'
            res.json({
                status: 'err',
                error: `no {key} in config`,
                price_usd: null,
                price_rub: null
            })
            return
        }

        const id = getID(req.params.sym)

        if (!id) {
            const assets = await golos.api.getAssetsAsync('',  [req.params.sym])
            if (assets.length) {
                res.json({
                    status: 'err',
                    error: 'such token is present on Golos Blockchain, but not supported by GOLOS CMC wrapper',
                    price_usd: null,
                    price_rub: null
                })
                return
            }
            res.json({
                status: 'err',
                error: 'no such token on Golos Blockchain',
                price_usd: null,
                price_rub: null
            })
            return
        }

        let resp, updated
        let from_cache = false
        const now = new Date()
        if (!global.cached || (now - global.cached.updated) > cacheLifetime) {
            resp = await doRequest('USD')
            let resp2 = await doRequest('RUB')
            for (let [id, d] of Object.entries(resp2.data)) {
                resp.data[id].quote['RUB'] = d.quote['RUB']
            }
            updated = now
            global.cached = {
                resp,
                updated
            }
        } else {
            resp = global.cached.resp
            updated = global.cached.updated
            from_cache = true
        }

        const data = resp.data[id]

        const getPrice = (sym) => {
            try {
                return data.quote[sym].price
            } catch (err) {
                return null
            }
        }

        res.json({
            status: 'ok',
            price_usd: getPrice('USD'),
            price_rub: getPrice('RUB'),
            from_cache,
            updated: updated.toISOString().split('.')[0],
            data,
        })
    })

export default handler
