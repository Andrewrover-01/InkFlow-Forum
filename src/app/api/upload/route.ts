import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // Check R2 configuration
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!bucket || !publicUrl) {
    return NextResponse.json(
      { error: "图片上传服务未配置" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "未选择文件" }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "仅支持 JPEG / PNG / GIF / WebP 格式" },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "图片大小不能超过 2 MB" }, { status: 400 });
  }

  const ext = EXT_MAP[file.type] ?? "jpg";
  const key = `avatars/${session.user.id}/${randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  try {
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type,
        CacheControl: "public, max-age=31536000",
      })
    );
  } catch (err) {
    console.error("R2 upload error:", err);
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 });
  }

  const url = `${publicUrl}/${key}`;
  return NextResponse.json({ url }, { status: 201 });
}
