import config from 'config'
import { fetchEx } from 'golos-lib-js/lib/utils'

import { golosMarketData } from './golosMarketData'

const cfgSymbols = config.get('symbols')

const host = 'https://pro-api.coinmarketcap.com'
const cfgKey = 'coinmarketcap_requests'
const cfg = config[cfgKey]

if (!cfg || !cfg.api_key) {
    let key = cfgKey
    if (!cfg.api_key) key += '.api_key'
    console.warn(`Warning: ${key} is not defined, so CMC-requesting part will not work`)
}

const cacheLifetime = 15 * 60*1000 // milliseconds

function concatIds() {
    let ids = Object.values(cfgSymbols).map(val => val[1])
    return ids.join(',')
}

const allIDs = concatIds()

export const apiKeyError = () => {
    if (!cfg || !cfg.api_key) {
        let key = cfgKey
        if (!cfg.api_key) key += '.api_key'
        return `no {key} in config`
    }
    return ''
}

const doRequest = async (convert) => {
    let url = new URL('/v2/cryptocurrency/quotes/latest', host)
    url.searchParams.set('id', allIDs)
    url.searchParams.set('convert', convert)

    const headers = new Headers({
        'X-CMC_PRO_API_KEY': cfg.api_key
    })
    let resp = await fetchEx(url, {
        headers,
        timeout: 2000
    })
    resp = await resp.json()
    return resp
}

export const getData = async () => {
    let resp, updated
    let from_cache = false
    let from_golos = false
    const now = new Date()
    if (!global.cached || (now - global.cached.updated) > cacheLifetime) {
        let resp2
        try {
            resp = await doRequest('USD')
            resp2 = await doRequest('RUB')
        } catch (err) {
            console.error('CMC error')
        }
        if (!resp || !resp.data || !resp2 || !resp2.data) {
            updated = now
            resp = await golosMarketData()
            from_golos = true
        } else {
            for (let [id, d] of Object.entries(resp2.data)) {
                resp.data[id].quote['RUB'] = d.quote['RUB']
            }
            updated = now
            global.cached = {
                resp,
                updated
            }
        }
    } else {
        resp = global.cached.resp
        updated = global.cached.updated
        from_cache = true
    }
    return { resp, updated, from_cache, from_golos }
}