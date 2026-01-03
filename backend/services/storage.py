# backend/services/storage.py
import os
import uuid
from dataclasses import dataclass
from typing import Protocol, Optional

# Optional S3 dependency (we import pas als backend = s3)
# zodat local setup niet stukgaat als boto3 niet geïnstalleerd is.


class Storage(Protocol):
    def save_bytes(self, data: bytes, filename: str, content_type: str) -> str:
        """Return storage_key (path/key)"""

    def get_public_url(self, storage_key: str) -> Optional[str]:
        """Return public URL if applicable, else None"""


@dataclass
class LocalStorage:
    base_dir: str

    def save_bytes(self, data: bytes, filename: str, content_type: str) -> str:
        os.makedirs(self.base_dir, exist_ok=True)

        # safe extension
        _, ext = os.path.splitext(filename or "")
        ext = ext.lower()[:10] if ext else ""

        storage_key = f"{uuid.uuid4().hex}{ext}"
        full_path = os.path.join(self.base_dir, storage_key)

        with open(full_path, "wb") as f:
            f.write(data)

        return storage_key

    def get_public_url(self, storage_key: str) -> Optional[str]:
        # Local files are not publicly accessible by default
        return None


@dataclass
class S3Storage:
    bucket: str
    region: str
    prefix: str

    def _client(self):
        import boto3  # type: ignore
        return boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )

    def save_bytes(self, data: bytes, filename: str, content_type: str) -> str:
        _, ext = os.path.splitext(filename or "")
        ext = ext.lower()[:10] if ext else ""

        key = f"{self.prefix}/{uuid.uuid4().hex}{ext}".lstrip("/")
        client = self._client()
        client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type or "application/octet-stream",
        )
        return key

    def get_public_url(self, storage_key: str) -> Optional[str]:
        # Basic URL (works if bucket/object is public or via CloudFront)
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{storage_key}"


def get_storage() -> Storage:
    backend = (os.getenv("STORAGE_BACKEND") or "local").lower().strip()

    if backend == "s3":
        bucket = os.getenv("S3_BUCKET", "").strip()
        region = os.getenv("AWS_REGION", "").strip() or "eu-west-1"
        prefix = os.getenv("S3_PREFIX", "").strip() or "itspeanuts-ai"

        if not bucket:
            raise RuntimeError("S3_BUCKET is required when STORAGE_BACKEND=s3")

        return S3Storage(bucket=bucket, region=region, prefix=prefix)

    # default local
    upload_dir = os.getenv("UPLOAD_DIR", "uploads").strip()
    return LocalStorage(base_dir=upload_dir)
