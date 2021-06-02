export default {

    createWorkspace: () => {
        return new Promise((resolve) => {
            resolve({ success: true });
        });
    },
    
    initRpcServer: (rpcServer, localNetwork) => {
        return new Promise((resolve) => resolve({
            rpcServer: rpcServer,
            networkId: 1,
            settings: {
                gasLimit: 1234567
            },
            defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
            localNetwork: localNetwork
        }))
    }
}