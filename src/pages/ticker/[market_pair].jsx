import React from 'react'
import config from 'config'
import { parseMarketPair } from '@/utils/misc'

export const getServerSideProps = async ({ req, res, params, }) => {
    const host = config.get('dex_service.host')
    const parsed = parseMarketPair(params.market_pair)
    if (!parsed.length) {
        return {
            notFound: true
        }
    }
    const url = new URL('/#/trade/' + parsed.join('_'), host)
    return {
        redirect: {
            destination: url.toString(),
            permanent: false,
        },
    }
}

class TickerRedirect extends React.Component {
    render() {
        return null
    }
}

export default TickerRedirect
