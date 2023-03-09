import nc from 'next-connect';

import { onError, } from '@/error';
import { corsMiddleware, } from '@/corsMiddleware'

export default function nextConnect(opts = {}) {
    let handler;

    handler = nc({ ...opts, });
    handler = handler.use(corsMiddleware());
    return handler;
}
