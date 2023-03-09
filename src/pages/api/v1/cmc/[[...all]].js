import config from 'config'
import golos from 'golos-lib-js'

import nextConnect from '@/nextConnect'
import { corsMiddleware, } from '@/corsMiddleware'
import { apiKeyError, getData, } from '@/utils/CMC'

golos.config.set('websocket', config.get('node_url'))

const cfgSymbols = config.get('symbols')

function getID(sym) {
    for (const [cmcSym, val] of Object.entries(cfgSymbols)) {
        if (val[0] === sym.toUpperCase()) {
            return val[1]
        }
    }
    return null
}

function getGolosSym(id) {
    for (const [cmcSym, val] of Object.entries(cfgSymbols)) {
        if (parseInt(val[1]) === parseInt(id)) {
            return val[0]
        }
    }
    return null
}

let handler = nextConnect({ attachParams: true, })

    .get('/api/v1/cmc/:sym?', async (req, res) => {
        const akError = apiKeyError()
        if (akError) {
            res.json({
                status: 'err',
                error: akError,
                price_usd: null,
                price_rub: null
            })
            return
        }

        let id
        if (req.params.sym) {
            id = getID(req.params.sym)

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
        }

        let { resp, updated, from_cache, from_golos } = await getData()

        const getPrice = (data, sym) => {
            try {
                return data.quote[sym].price
            } catch (err) {
                return null
            }
        }

        if (id) {
            const data = resp.data[id]

            res.json({
                status: 'ok',
                price_usd: getPrice(data, 'USD'),
                price_rub: getPrice(data, 'RUB'),
                from_cache,
                from_golos,
                updated: updated.toISOString().split('.')[0],
                data,
            })
            return
        }

        const dataMap = {}

        for (const [id, data] of Object.entries(resp.data)) {
            const sym = getGolosSym(id)
            dataMap[sym] = data
            dataMap[sym].price_usd = getPrice(data, 'USD')
            dataMap[sym].price_rub = getPrice(data, 'RUB')
        }

        res.json({
            status: 'ok',
            from_cache,
            updated: updated.toISOString().split('.')[0],
            data: dataMap,
        })
    })

export default handler
