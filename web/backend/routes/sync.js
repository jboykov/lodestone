const path = require('path');
var express = require('express');
var router = express.Router();

var Minio = require('minio')
var minioClient = new Minio.Client({
    endPoint: 'storage',
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});

const BatchTransform = require('../src/transform/batch');
const ElasticSearchMissingFilesTransform = require('../src/transform/elasticsearch_missing_files');
const PublishMissingTransform = require('../src/transform/publish_missing');


/* POST sync the document bucket with elasticsearch
* Basically do a loop of all files in the bucket and ensure they all exist in elasticsearch
*   */
router.post('/bucket', function (req, res, next) {
    let items = [];
    var stream = minioClient.listObjects('documents','', true)
        .pipe(new BatchTransform({batchSize:10}))
        .pipe(new ElasticSearchMissingFilesTransform())
        .pipe(new BatchTransform())
        .pipe(new PublishMissingTransform())

    stream.on('data', function(data){
        items = items.concat(data);
    })
    stream.on('error', function(err) { console.log(err) } );
    stream.on('end', async function() {
        console.log("END:", items)
        res.send(items);
    });


});


/* POST sync a specific with elasticsearch (update operation)
 * Should regenerate missing thumbnails as well
 */
router.get('/file', function(req, res, next) {
    res.sendFile(path.resolve(__dirname, '../public/index.html') )
});

module.exports = router;





