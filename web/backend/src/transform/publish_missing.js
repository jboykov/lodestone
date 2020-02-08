const { Transform } = require('stream');
var amqp = require('amqplib');


module.exports = class PublishMissingTransform extends Transform {
    constructor(options) {
        options = options || {};
        options.objectMode = true;
        super(options);
        // By default we are in object mode but this can be overwritten by the user
        this.storageBucket = options.storageBucket || 'documents';

        this.rabbitmqClient = amqp.connect(`amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@rabbitmq:5672`)
            .then(function(conn) {
                return conn.createChannel();
            })
    }
    async _transform(batch, encoding, done) {
        var delgate = this;
        this.rabbitmqClient
            .then(function(ch) {

                var promiseList = []
                for(let storageInfo of batch){
                    console.log("RABBITMQ DOCS",storageInfo)
                    var payload = {
                        "Records":[
                            {
                                "eventVersion":"2.0",
                                "eventSource":"lodestone:publisher:web-sync",
                                "awsRegion":"",
                                "eventTime": (new Date()).toISOString(),
                                "eventName": "s3:ObjectCreated:Put",
                                "userIdentity":{
                                    "principalId": "lodestone"
                                },
                                "requestParameters":{
                                    "sourceIPAddress": "localhost"
                                },
                                "responseElements":{},
                                "s3":{
                                    "s3SchemaVersion":"1.0",
                                    "configurationId":"Config",
                                    "bucket":{
                                        "name": storageInfo.bucket,
                                        "ownerIdentity":{
                                            "principalId":"lodestone"
                                        },
                                        "arn": `arn:aws:s3:::${storageInfo.bucket}`
                                    },
                                    "object":{
                                        "key": storageInfo.path,
                                        "size": 0,
                                        "eTag":"eTag",
                                        "versionId":"1"
                                    }
                                }
                            }
                        ]
                    }
                    promiseList.push(ch.publish('lodestone', 'documents', Buffer.from(JSON.stringify(payload)), {contentType:'application/json'}));
                }
                delgate.push(batch)
                return Promise.all(promiseList)
            })
            .catch(console.warn)
            .finally(function(){done()})
    }
}
