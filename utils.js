const fs = require('fs');
const AWS = require('aws-sdk');
require('dotenv').config();

// Cloudflare R2 Configuration
const r2 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.CLOUDFLARE_R2_ENDPOINT),
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  s3ForcePathStyle: true,
});

const uploadToR2 = async (filePath, key) => {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: fileContent,
  };

  await r2.upload(params).promise();
  return getPublicUrlFromR2(key);
};

const readJSONFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading file from disk: ${err}`);
    return null;
  }
};

const writeJSONFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`File successfully written to ${filePath}`);
  } catch (err) {
    console.error(`Error writing file to disk: ${err}`);
  }
};

const appendJSONFile = (filePath, newData) => {
  try {
    const existingData = readJSONFile(filePath) || [];
    const updatedData = existingData.concat(newData);
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
    console.log(`Data successfully appended to ${filePath}`);
  } catch (err) {
    console.error(`Error appending file to disk: ${err}`);
  }
};

const appendToR2 = async (key, newData, bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME) => {
  let existingData = [];
  try {
    const params = { Bucket: bucketName, Key: key };
    const data = await r2.getObject(params).promise();
    existingData = JSON.parse(data.Body.toString('utf-8'));
  } catch (err) {
    if (err.code !== 'NoSuchKey') {
      throw err;
    }
  }

  const updatedData = existingData.concat(newData);
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: JSON.stringify(updatedData, null, 2)
  };

  await r2.upload(params).promise();
};

const getPublicUrlFromR2 = (key) => {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
};

const sanitizeFileName = (name) => {
  return name.replace(/\s+/g, '').toLowerCase();
};


module.exports = {
  readJSONFile,
  writeJSONFile,
  appendJSONFile,
  uploadToR2,
  appendToR2,
  sanitizeFileName,
  getPublicUrlFromR2
};
