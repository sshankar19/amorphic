'use strict';

export let amorphicOptions = {
    conflictMode: 'soft',       // Whether to abort changes based on the "old value" matching. Either 'soft', 'hard'
    compressSession: false,     // Whether to compress data going to REDIS
    compressXHR: true,          // Whether to compress XHR responses
    sourceMode: 'debug'         // Whether to minify templates.  Values: 'debug', 'prod' (minify)
};

export let appContext: {connectServer?: any} = {};
export let applicationConfig = {};
export let applicationPersistorProps = {};
export let applicationSource = {};
export let applicationSourceMap = {};
export let applicationTSController = {};

/**
 * This function exists to reset AmorphicContext to the default options.
 *  It is only used by our tests.  Once our tests have been updated to properly stub
 *  AmorphicContext out this should be removed.
 */
export function reset() {
    if (appContext.connectServer) {
        appContext.connectServer.close();
    }

    appContext.connectServer = undefined;
    applicationConfig = {};
    applicationSource = {};
    applicationSourceMap = {};
    applicationPersistorProps = {};
    applicationTSController = {};

    amorphicOptions = {
        conflictMode: 'soft',
        compressSession: false,
        compressXHR: true,
        sourceMode: 'debug'
    };
}