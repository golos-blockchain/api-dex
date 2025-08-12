import config from 'config'
import { fetchEx } from 'golos-lib-js/lib/utils'

import { golosMarketData } from './golosMarketData'
import { getGolosSym } from '@/utils/misc'

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

export const getData = async (sym = 'GOLOS') => {
    let resp
    let from_cache = false
    let updated
    const now = new Date()
    const golosSyms = []
    if (!global.cached || (now - global.cached.updated) > cacheLifetime) {
        if (!config.has('golos_market_only') || !config.get('golos_market_only')) {
            let resp2
            try {
                resp = await doRequest('USD')
                resp2 = await doRequest('RUB')
            } catch (err) {
                console.error('CMC error', err)
            }
            if (resp?.data && resp2?.data) {
                let dataUsd = false
                let dataRub = false
                for (let [id, d] of Object.entries(resp2.data)) {
                    const merged = resp.data[id]
                    merged.quote['RUB'] = d.quote['RUB']

                    if (!(merged.quote['USD']?.price) && !(merged.quote['RUB']?.price)) {
                        const gSym = getGolosSym(id)
                        //if (!sym || gSym === sym)
                        golosSyms.push(gSym)
                    } else {
                        merged.updated = now;
                    }
                }
            }
        }
        if (golosSyms.length) {
            const respGolos = await golosMarketData(golosSyms)
            for (let [id, d] of Object.entries(respGolos.data)) {
                resp.data[id] = { from_golos: true, ...respGolos.data[id] };
            }
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
    return { resp, updated, from_cache }
}