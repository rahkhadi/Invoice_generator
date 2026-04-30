import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type StoredObject = {
  key: string;
  url: string;
};

function storageConfig() {
  const bucket = process.env.STORAGE_BUCKET;
  const region = process.env.STORAGE_REGION || "auto";
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
  const enabled = Boolean(bucket && accessKeyId && secretAccessKey);
  return { bucket, region, endpoint, accessKeyId, secretAccessKey, publicBaseUrl, enabled };
}

function s3Client() {
  const config = storageConfig();
  if (!config.enabled || !config.accessKeyId || !config.secretAccessKey) return null;
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

export function cloudStorageEnabled() {
  return storageConfig().enabled;
}

export async function putObject(key: string, body: Buffer, contentType: string, localPublicPath: string): Promise<StoredObject> {
  const config = storageConfig();
  const client = s3Client();
  if (client && config.bucket) {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
    return {
      key,
      url: config.publicBaseUrl ? `${config.publicBaseUrl.replace(/\/$/, "")}/${key}` : `s3://${config.bucket}/${key}`
    };
  }

  const diskPath = path.join(process.cwd(), "public", localPublicPath);
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, body);
  return { key: localPublicPath, url: `/${localPublicPath}` };
}

export async function getObject(key: string) {
  const config = storageConfig();
  const client = s3Client();
  if (client && config.bucket && !key.startsWith("exports/") && !key.startsWith("uploads/")) {
    const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    const bytes = await response.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }
  return readFile(path.join(process.cwd(), "public", key.replace(/^\//, "")));
}
