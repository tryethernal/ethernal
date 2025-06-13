request.post(`${BASE_URL}/explorers`)
    .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'test@example.com' })
    .expect(400)
    .then(({ text }) => {
        expect(text).toEqual(`You can't create a demo with this network id (1 - ethereum). If you'd still like an explorer for this chain. Please reach out to contact@tryethernal.com, and we'll set one up for you.`);
        done();
    });

request.post(`${BASE_URL}/explorers`)
    .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'test@example.com' })
    .expect(400)
    .then(({ text }) => {
        expect(text).toEqual(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
        done();
    });

request.post(`${BASE_URL}/explorers`)
    .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'test@example.com' })
    .expect(400)
    .then(({ text }) => {
        expect(text).toEqual('Could not create explorer. Please retry.');
        done();
    });

request.post(`${BASE_URL}/explorers`)
    .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'test@example.com' })
    .expect(400)
    .then(({ text }) => {
        expect(text).toEqual('Error setting up the explorer. Please retry.');
        done();
    });

request.post(`${BASE_URL}/explorers`)
    .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'test@example.com' })
    .expect(400)
    .then(({ text }) => {
        expect(text).toEqual(`You've reached the limit of demo explorers for this chain (networkId: 54321). Please subscribe to a plan or reach out to contact@tryethernal.com for an extended trial.`);
        done();
    });

request.post(`${BASE_URL}/explorers`)
    .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'test@example.com' })
    .expect(200)
    .then(() => {
        expect(mockCountUp).not.toHaveBeenCalled();
        done();
    });

request.post(`${BASE_URL}/explorers`)
    .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'test@example.com' })
    .expect(200)
    .then(({ body }) => {
        expect(body).toEqual({ domain: 'slug.ethernal.com' });
        done();
    }); 