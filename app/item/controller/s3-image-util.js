const AWS = require('aws-sdk');

class S3ImageUtil {
    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: 'AKIAVAKCSJGBRF5NONBC',
            secretAccessKey: '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',
        });

        this.bucketName = 'cqbucket';
    }
    uniqueFileName = (originalName) => {
        const uniqueString = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        return uniqueString + '-' + originalName;
      }
      
    async upload(file, fileName,folder) {
        const params = {
            Bucket: this.bucketName,
            Key: `${folder}/${fileName}`,
            Body: file,
            ContentType:'image/jpeg', //<-- this is what you need!
            //ACL:'public-read'//<-- this makes it public so people can see it
        };

        return new Promise((resolve, reject) => {
            this.s3.upload(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async get(fileName) {
        const params = {
            Bucket: this.bucketName,
            Key: fileName,
        };

        return new Promise((resolve, reject) => {
            this.s3.getObject(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
}

module.exports = S3ImageUtil;
