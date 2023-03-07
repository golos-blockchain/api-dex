
const logError = (err, req) => {
    let userAgent = 'unknown';
    let origin = 'unknown';
    try { userAgent = req.headers['user-agent']; } catch {}
    try { origin = req.headers['origin']; } catch {}
    console.error('ERROR IN', req.url, '\n',
        err, '\n',
        '\n',
        'Client who caused error:\n',
        'User-Agent', userAgent, '\n',
        'Origin', origin);
};

export const onError = (err, req, res) => {
    logError(err, req)
};
