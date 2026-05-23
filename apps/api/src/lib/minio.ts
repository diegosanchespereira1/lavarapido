import type { S3Client } from "@aws-sdk/client-s3";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client as S3,
} from "@aws-sdk/client-s3";

export type MinioConfig = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  publicUrl: string | null;
};

export function getMinioConfig(): MinioConfig | null {
  const endpoint = process.env.MINIO_ENDPOINT?.trim();
  // MinIO stack usa MINIO_ROOT_USER/PASSWORD; S3 SDK usa access/secret — aceitamos os dois nomes
  const accessKey =
    process.env.MINIO_ACCESS_KEY?.trim() ||
    process.env.MINIO_ROOT_USER?.trim();
  const secretKey =
    process.env.MINIO_SECRET_KEY?.trim() ||
    process.env.MINIO_ROOT_PASSWORD?.trim();
  const bucket = process.env.MINIO_BUCKET?.trim() || "lava-rapido";
  const region = process.env.MINIO_REGION?.trim() || "eu-south";
  const publicUrl = process.env.MINIO_PUBLIC_URL?.trim() || null;

  if (!endpoint || !accessKey || !secretKey) return null;

  return { endpoint, accessKey, secretKey, bucket, region, publicUrl };
}

function normalizeEndpoint(raw: string): string {
  return raw.startsWith("http") ? raw : `http://${raw}`;
}

/** Cliente S3 para operações internas (rede Docker → minio:9000). */
export function createMinioClient(): S3Client | null {
  const cfg = getMinioConfig();
  if (!cfg) return null;

  return new S3({
    endpoint: normalizeEndpoint(cfg.endpoint),
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
    forcePathStyle: true,
  });
}

/** Cliente S3 com URL pública (presigned URLs acessíveis pelo browser). */
export function createMinioPublicClient(): S3Client | null {
  const cfg = getMinioConfig();
  if (!cfg?.publicUrl) return createMinioClient();

  return new S3({
    endpoint: normalizeEndpoint(cfg.publicUrl),
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
    forcePathStyle: true,
  });
}

/**
 * Verifica conectividade e garante bucket.
 * Retorna null se MinIO não estiver configurado.
 */
export async function checkMinioConnection(): Promise<boolean | null> {
  const cfg = getMinioConfig();
  const client = createMinioClient();
  if (!cfg || !client) return null;

  try {
    await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
    return true;
  } catch (e: unknown) {
    const status =
      typeof e === "object" &&
      e !== null &&
      "$metadata" in e &&
      typeof (e as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === "number"
        ? (e as { $metadata: { httpStatusCode: number } }).$metadata
            .httpStatusCode
        : undefined;

    if (status === 404 || status === 403) {
      try {
        await client.send(new CreateBucketCommand({ Bucket: cfg.bucket }));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
