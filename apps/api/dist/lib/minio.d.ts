import type { S3Client } from "@aws-sdk/client-s3";
export type MinioConfig = {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
    publicUrl: string | null;
};
export declare function getMinioConfig(): MinioConfig | null;
/** Cliente S3 para operações internas (rede Docker → minio:9000). */
export declare function createMinioClient(): S3Client | null;
/** Cliente S3 com URL pública (presigned URLs acessíveis pelo browser). */
export declare function createMinioPublicClient(): S3Client | null;
/**
 * Verifica conectividade e garante bucket.
 * Retorna null se MinIO não estiver configurado.
 */
export declare function checkMinioConnection(): Promise<boolean | null>;
//# sourceMappingURL=minio.d.ts.map