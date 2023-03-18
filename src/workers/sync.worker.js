console.log('ok')
onmessage = e => {
    console.log(e)
}

addEventListener('message', e => {
    console.log(e)
    // const { getProvider } = require('../lib/rpc');

    // const onData = (data) => {
    //     console.log(data);
    // }
    // const provider = getProvider(e.data.workspace.rpcServer);
    // provider.on('data', onData);
})
