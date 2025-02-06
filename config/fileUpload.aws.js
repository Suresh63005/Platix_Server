const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const uploadToS3 = async (file, folderName = "uploads") => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const s3 = new S3Client({ region: process.env.AWS_REGION });
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
    const imageUrl = `https://${s3Params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`;
    return imageUrl; // Return the uploaded file's URL
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file to S3.");
  }
};

module.exports = uploadToS3;