import cors from 'cors'

function corsMiddleware(opts = {}) {
    return cors({
        origin: true,
        ...opts,
    })
}

module.exports = {
    corsMiddleware,
}
