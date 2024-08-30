const crypto = require('crypto');

const { getNodeEnv, getSentryDsn, getVersion } = require('./lib/env');
const Redis = require('ioredis');
const config = require('./config/redis')[getNodeEnv()];
const redis = new Redis(config);
const logger = require('./lib/logger');

if (getSentryDsn()) {
    const Sentry = require('@sentry/node');
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
    const { registerInstrumentations } = require("@opentelemetry/instrumentation");
    const {
        BullMQInstrumentation,
    } = require("opentelemetry-instrumentation-bullmq");

    const { Queue, Worker } = require('bullmq');

    // Custom BullMQ integration for Sentry
    const bullMQIntegration = {
        name: 'bullmq',
        setupOnce(addGlobalEventProcessor) {
            // Wrap Queue methods
            const originalAddQueue = Queue.prototype.add;
            Queue.prototype.add = async function (...args) {
                const messageId = crypto.randomBytes(8).toString('hex');
                Sentry.startSpan({
                    name: 'queue_producer_transaction',
                    op: 'queue.publish',
                    attributes: {
                        'sentry.op': 'queue.publish',
                        'messaging.message.id': messageId,
                        'messaging.destination.name': this.name,
                        'messaging.system': 'bullmq'
                    }
                },
                parent => {
                    Sentry.startSpan(
                        {
                            name: 'queue_producer',
                            op: 'queue.publish',
                            attributes: {
                                'sentry.op': 'queue.publish',
                                'messaging.message.id': messageId,
                                'messaging.destination.name': this.name,
                                'messaging.system': 'bullmq'
                            }
                        },
                        async span => {
                            const traceHeader = Sentry.spanToTraceHeader(span);
                            const baggageHeader = Sentry.spanToBaggageHeader(span);
                            const instrumentationData = { traceHeader, baggageHeader, timestamp: Date.now(), messageId };
                            await redis.lpush(`span:${args[0]}`, JSON.stringify(instrumentationData));
                            await originalAddQueue.apply(this, args);
                        }
                    );
                });
            };

            const originalRunWorker = Worker.prototype.processJob;
            Worker.prototype.processJob = async function(...args) {
                const message = JSON.parse(await redis.lpop(`span:${args[0].name}`));
                if (!message)
                    return originalRunWorker.apply(this, args);

                console.log(`pulled span:${args[0].name}`)
                const latency = Date.now() - message.timestamp;
                Sentry.continueTrace(
                    { sentryTrace: message.traceHeader, baggage: message.baggageHeader },
                    () => {
                        Sentry.startSpan({
                            name: 'queue_consumer_transaction',
                            op: 'queue.process',
                                attributes: {
                                    'sentry.op': 'queue.process',
                                    'messaging.message.id': message.messageId,
                                    'messaging.destination.name': args[0].queue.name,
                                    'messaging.message.receive.latency': latency,
                                    'messaging.system': 'bullmq'
                                }
                        },
                        parent => {
                            Sentry.startSpan({
                                name: 'queue_consumer',
                                op: 'queue.process',
                                attributes: {
                                    'sentry.op': 'queue.process',
                                    'messaging.message.id': message.messageId,
                                    'messaging.destination.name': args[0].queue.name,
                                    'messaging.message.receive.latency': latency,
                                    'messaging.system': 'bullmq'
                                }
                            }, (span) => {
                                originalRunWorker.apply(this, args)
                                parent.setStatus({ code: 1, message: 'ok' });
                            });
                        })
                    }
                );
            };
        },
    };

    // registerInstrumentations({
    //     instrumentations: [
    //       new BullMQInstrumentation({
    //         // requireParentSpanForPublish: true
    //       }),
    //     ],
    //   });

    Sentry.init({
        dsn: getSentryDsn(),
        environment: getNodeEnv() || 'development',
        release: `ethernal@${getVersion()}`,
        integrations: [
            nodeProfilingIntegration(),
            bullMQIntegration,
        ],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
        debug: true
    });



    logger.info('Started Sentry instrumentation with BullMQ integration');
}