const { Transform } = require('stream');

// private methods for stream handling
// https://www.bennadel.com/blog/3236-using-transform-streams-to-manage-backpressure-for-asynchronous-tasks-in-node-js.htm
// https://www.ramielcreations.com/the-hidden-power-of-node-js-streams/
// https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream


module.exports  = class BatchTransform extends Transform {
    constructor(options) {
        options = options || {};
        options.objectMode = true
        super(options);
        // By default we are in object mode but this can be overwritten by the user
        this.batchSize = options.batchSize || 5;
        this.batchBuffer = [];


    }
    _transform(item, encoding, done) {
        this.batchBuffer.push( item );

        // If our batch buffer has reached the desired size, push the batched
        // items onto the READ buffer of the transform stream.
        if ( this.batchBuffer.length >= this.batchSize ) {

            this.push( this.batchBuffer );

            // Reset for next batch aggregation.
            this.batchBuffer = [];
        }

        done();
    }
    _flush(done){
        // It's possible that the last few items were not sufficient (in count)
        // to fill-out an entire batch. As such, if there are any straggling
        // items, push them out as the last batch.
        if ( this.batchBuffer.length ) {

            this.push( this.batchBuffer );

        }

        done();
    }
}
