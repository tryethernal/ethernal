const ethers = require('ethers');

export const decodeLog = (log, abi) => {
    const ethersInterface = new ethers.utils.Interface(abi);
    let decodedLog;
    try {
        decodedLog = ethersInterface.parseLog(log);
    }
    catch(error) {
        for (const event in ethersInterface.events) {
            try {
                const eventTopic = ethersInterface.getEventTopic(event)
                const fragment = ethersInterface.getEvent(eventTopic);
                decodedLog = new ethers.utils.LogDescription({
                    eventFragment: fragment,
                    name: fragment.name,
                    signature: fragment.format(),
                    topic: ethersInterface.getEventTopic(fragment),
                    args: ethersInterface.decodeEventLog(fragment, log.data, log.topics)
                });
            } catch(_) {
                continue;
            }
        }
    }

    return decodedLog;
};

export const formatErrorFragment = (jsonInterface) => {
    const label = [];
    label.push(`${jsonInterface.errorFragment.name}(`)

    const args = [];
    for (let i = 0; i < jsonInterface.errorFragment.inputs.length; i++) {
        const input = jsonInterface.errorFragment.inputs[i];
        args.push(`${input.type} ${input.name}: ${jsonInterface.args[i]}`);
    }
    label.push(`${args.join(', ')})`);
    return label.join('');
};
