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
