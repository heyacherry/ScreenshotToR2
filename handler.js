const axios = require('axios');
const cheerio = require('cheerio');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { appendJSONFile, uploadToR2, appendToR2, sanitizeFileName } = require('./utils');

const BATCH_SIZE = 5;

const checkUrl = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.status === 200;
  } catch (err) {
    return false;
  }
};

const extractInfo = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const h1 = $('h1').first().text();
    const h2 = $('h2').first().text();

    const affiliateWords = ['Affiliate', 'Affiliates', 'partner', 'partners'];
    let affiliate = false;

    affiliateWords.forEach(word => {
      if (response.data.toLowerCase().includes(word.toLowerCase())) {
        affiliate = true;
      }
    });

    return { h1, h2, affiliate };
  } catch (err) {
    return { h1: '', h2: '', affiliate: false };
  }
};

const takeScreenshot = async (url, name, outputDir) => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const takeScreenshotPromise = new Promise(async (resolve, reject) => {
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5s for loading case
      const filePath = path.join(outputDir, 'images', `${name}.png`);
      await page.screenshot({ path: filePath });
      resolve(filePath);
    } catch (err) {
      reject(err);
    } finally {
      await browser.close();
    }
  });

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Screenshot timeout')), 45000));

  return Promise.race([takeScreenshotPromise, timeoutPromise]);
};

const processUrls = async (urls, outputDir) => {
  const results = [];
  const errors = [];
  let lastProcessedName = '';
  let processedCount = 0;

  for (const { url, name } of urls) {
    const sanitizedFileName = sanitizeFileName(name);
    const isAccessible = await checkUrl(url);
    const active = isAccessible;
    lastProcessedName = name;
    processedCount += 1;

    let h1 = '', h2 = '', affiliate = false, screenshotUrl = null;

    if (isAccessible) {
      try {
        ({ h1, h2, affiliate } = await extractInfo(url));
        const screenshotFilePath = await takeScreenshot(url, sanitizedFileName, outputDir).catch(err => {
          console.error(`Screenshot error for ${url}:`, err);
          return null;
        });
        if (screenshotFilePath) {
          screenshotUrl = await uploadToR2(screenshotFilePath, `images/${path.basename(screenshotFilePath)}`);
        }
      } catch (err) {
        errors.push({ url, name, error: err.message });
      }
    }

    results.push({
      url,
      name,
      h1,
      h2,
      affiliate,
      screenshotUrl,
      active
    });

    if (results.length >= BATCH_SIZE) {
      const outputFilePath = path.join(outputDir, 'url-captures.json');
      appendJSONFile(outputFilePath, results); // Append to JSON file instead of overwriting
      await appendToR2('url-captures.json', results);
      console.log(`Uploaded results to R2: ${outputFilePath}`);

      const imagesDir = path.join(outputDir, 'images');
      const imageFiles = fs.readdirSync(imagesDir);
      for (const file of imageFiles) {
        await uploadToR2(path.join(imagesDir, file), `images/${file}`);
        fs.unlinkSync(path.join(imagesDir, file)); // Delete the local file after upload
        console.log(`Uploaded and deleted local image file: ${file}`);
      }
      results.length = 0;
    }
  }

  if (results.length > 0) {
    const outputFilePath = path.join(outputDir, 'url-captures.json');
    appendJSONFile(outputFilePath, results); // Append to JSON file instead of overwriting
    await appendToR2('url-captures.json', results);
    console.log(`Uploaded results to R2: ${outputFilePath}`);

    const imagesDir = path.join(outputDir, 'images');
    const imageFiles = fs.readdirSync(imagesDir);
    for (const file of imageFiles) {
      await uploadToR2(path.join(imagesDir, file), `images/${file}`);
      fs.unlinkSync(path.join(imagesDir, file)); // Delete the local file after upload
      console.log(`Uploaded and deleted local image file: ${file}`);
    }
  }

  if (errors.length > 0) {
    const errorFilePath = path.join(outputDir, 'error.json');
    appendJSONFile(errorFilePath, errors); // Append to error JSON file instead of overwriting
    await appendToR2('error.json', errors);
  }

  return { lastProcessedName, processedCount };
};

module.exports.screencapturesToR2 = async (event, context) => {
  try {
    const urls = event.urls; // Get URLs from the event
    const outputDir = path.join('/tmp', 'output'); // Using /tmp directory in Lambda environment

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const imagesDir = path.join(outputDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    const { lastProcessedName, processedCount } = await processUrls(urls, outputDir);

    return {
      statusCode: 200,
      body: `✅ All data fetched and stored successfully! Last processed name: ${lastProcessedName}, Total processed: ${processedCount}.`
    };
  } catch (error) {
    console.log('❌ A critical error occurred:', error);
    return {
      statusCode: 500,
      body: `❌ A critical error occurred: ${error}`
    };
  }
};
