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
