import { reactive } from 'vue';

const eventBus = reactive({ events: {} });

eventBus.on = (event, callback) => {
    eventBus.events[event] = eventBus.events[event] || [];
    eventBus.events[event].push(callback);
};

eventBus.emit = (event, data) => {
    if (eventBus.events[event]) {
        eventBus.events[event].forEach(callback => callback(data));
    }
};

export default eventBus;
