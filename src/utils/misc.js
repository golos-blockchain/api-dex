import config from 'config'

const cfgSymbols = config.get('symbols')
const cfgPairs = config.get('pairs')

export const parseMarketPair = (pair) => {
    if (!cfgPairs.includes(pair)) {
        return []
    }
    const [ base, quote ] = pair.split('_')
    return [ cfgSymbols.get(base)[0], cfgSymbols.get(quote)[0] ]
}

export function getID(sym) {
    for (const [cmcSym, val] of Object.entries(cfgSymbols)) {
        if (val[0] === sym.toUpperCase()) {
            return val[1]
        }
    }
    return null
}

export function getGolosSym(id) {
    for (const [cmcSym, val] of Object.entries(cfgSymbols)) {
        if (parseInt(val[1]) === parseInt(id)) {
            return val[0]
        }
    }
    return null
}
