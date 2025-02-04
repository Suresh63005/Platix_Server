const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const uploadToS3 = async (file, folderName = "uploads") => {
  if (!file ||(Array.isArray(file)&&file.length === 0)) {
    throw new Error("No file provided for upload.");
  }

  // const s3 = new S3Client({ region: process.env.AWS_REGION });
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    maxAttempts: 5,
    requestHandler: {
      connectionTimeout: 300000,
      socketTimeout: 300000, 
    },
  });
  const files = Array.isArray(file) ? file : [file];
  const uploadPromises = files.map(async (file) => {
    const fileName = `${folderName}/${Date.now()}-${file.originalname}`;
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const command = new PutObjectCommand(s3Params);
      await s3.send(command);
      return `https://${s3Params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`;
    } catch (error) {
      console.error(`Error uploading ${file.originalname} to S3:`, error);
      throw new Error(`Failed to upload file ${file.originalname} to S3.`);
    }
  });

  // return Promise.all(uploadPromises);
  const uploadedFiles = await Promise.all(uploadPromises);
  return uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles;
};

module.exports = uploadToS3;
