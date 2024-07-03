## ScreenshotToR2

ScreenshotToR2 is a lambda NodeJS function designed to crawl info and capture screenshots of an array of URLs and upload them to Cloudflare R2. 

### 🚀 Features
- **URL Accessibility Check**: Test if the input URL is still accessible.
- **SEO & AI Summary Ready**: If the URL is accessible, fetch the h1 and h2 headers for future AI summaries or SEO reference, and detect affiliate links.
- **Screenshot Capture & Storage**: Take a screenshot of the webpage and upload it to Cloudflare R2.
- **Free Tier Utilization**: Maximize the use of AWS Lambda's free tier (even for new users) and Cloudflare R2's free storage for photos.
- **Step Function Integration**: If you have many URLs, you can use AWS Step Functions to integrate with this Lambda function for enhanced workflow management.

### 📊 Free Tier Details

| Service            | Free Tier Details                                                                                                  | Link                                                                                      |
|--------------------|--------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| **Cloudflare R2**  | 10 GB storage, 1 million Class A operations, and 10 million Class B operations per month. Egress (data transfer to Internet) is free. | [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/)                            |
| **AWS Lambda**     | 1 million free requests and 400,000 GB-seconds of compute time per month.                                          | [AWS Lambda Free Tier](https://aws.amazon.com/free/compute/lambda/)                       |


### 📚 Getting Started

#### Prerequisites
- [Node.js](https://nodejs.org/en/) (version 20.x or higher)
- [Serverless Framework CLI](https://www.serverless.com/framework/docs/getting-started/) - `npm install -g serverless`
- AWS account with permissions to create Lambda functions ([Sign up for AWS](https://aws.amazon.com/free/))
- Cloudflare account for R2 ([Sign up for Cloudflare](https://dash.cloudflare.com/sign-up))

#### Installation
```
git clone https://github.com/yourusername/ScreenshotToR2.git
cd ScreenshotToR2
npm install
```

#### Deployment
1. Configure your AWS credentials
```
serverless config credentials --provider aws --key YOUR_ACCESS_KEY --secret YOUR_SECRET_KEY

```
Alternatively, if you have an AWS profile set up, you can specify the profile in your serverless.yml
```
provider:
  name: aws
  runtime: nodejs20.x
  profile: your-aws-profile
  region: us-east-1
```

2. Deploy the service:
```
serverless deploy
```

### 📚 Usage
Invoke the function with an array of URLs to capture screenshots and upload them to Cloudflare R2.
```
{
  "urls": [
    { "url": "https://example.com", "name": "example" },
    { "url": "https://another-example.com", "name": "another-example" }
  ]
}
```

```
serverless invoke -f screencapturesToR2 -p data.json

```

### ⚠️ TypeScript Note
I opted not to use TypeScript in this project due to compatibility issues with the @sparticuz/chromium package, which can lead to errors during implementation. For more details, refer to the discussion [here](https://atsss.medium.com/screenshot-system-with-node-js-and-lambda-da93f6148455).


### 📂 Explanation of Batching Logic
The batch process logic(`results.length >= BATCH_SIZE`) is optional while this helps in managing memory usage and ensures that the function handles large sets of URLs efficiently.
