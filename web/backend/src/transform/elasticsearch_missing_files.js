const { Transform } = require('stream');

const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://elasticsearch:9200' })


module.exports = class ElasticSearchMissingFilesTransform extends Transform {
    constructor(options) {
        options = options || {};
        options.objectMode = true;
        super(options);
        // By default we are in object mode but this can be overwritten by the user
        this.index = options.index || 'lodestone';
        this.storageBucket = options.storageBucket || 'documents';
    }
    async _transform(batch, encoding, done) {

        var batchBody = []

        for(let fileInfo of batch){
            batchBody.push({}) // empty index object
            batchBody.push({
                "_source": ["storage", "file"],
                query: {
                    bool: {
                        must: [
                            {
                                "match": { "storage.bucket": this.storageBucket }
                            },
                            {
                                "match": { "storage.path": fileInfo.name }
                            }
                        ]
                    }
                }
            })
        }

        const batchSearchResults  = await client.msearch({
            index: this.index,
            // max_concurrent_shard_requests: 10,
            body: batchBody
        });

        for(var ndx = 0; ndx < batchSearchResults.body.responses.length; ndx++){
            // for(let [batchResult, index] of batchSearchResults.body.responses){
            var batchResult = batchSearchResults.body.responses[ndx];
            if(batchResult.hits.hits.length === 0){
                //this file was not found in elasticsearch
                this.push({
                    bucket: this.storageBucket,
                    path: batch[ndx].name
                })
            }
        }
        done()
    }
}
