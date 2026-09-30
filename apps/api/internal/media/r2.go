package media

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"net/url"
	"os"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// ImageStore persists public catalog images and returns their browser URL.
type ImageStore interface {
	PutCatalogImage(context.Context, []byte, string) (string, error)
}

type R2ImageStore struct {
	client        *s3.Client
	bucket        string
	publicBaseURL string
}

func NewR2ImageStoreFromEnv(ctx context.Context) (*R2ImageStore, error) {
	accountID := strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID"))
	accessKeyID := strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID"))
	secretAccessKey := strings.TrimSpace(os.Getenv("R2_SECRET_ACCESS_KEY"))
	bucket := strings.TrimSpace(os.Getenv("R2_BUCKET"))
	publicBaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("R2_PUBLIC_BASE_URL")), "/")
	if accountID == "" || accessKeyID == "" || secretAccessKey == "" || bucket == "" || publicBaseURL == "" {
		return nil, fmt.Errorf("R2 ยังตั้งค่าไม่ครบ")
	}
	if parsed, err := url.ParseRequestURI(publicBaseURL); err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return nil, fmt.Errorf("R2_PUBLIC_BASE_URL ไม่ถูกต้อง")
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion("auto"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("เตรียม R2 ไม่สำเร็จ: %w", err)
	}
	endpoint := "https://" + accountID + ".r2.cloudflarestorage.com"
	return &R2ImageStore{
		client: s3.NewFromConfig(awsCfg, func(options *s3.Options) {
			options.BaseEndpoint = aws.String(endpoint)
			options.UsePathStyle = true
		}),
		bucket:        bucket,
		publicBaseURL: publicBaseURL,
	}, nil
}

func (store *R2ImageStore) PutCatalogImage(ctx context.Context, content []byte, contentType string) (string, error) {
	extension, ok := imageExtension(contentType)
	if !ok {
		return "", fmt.Errorf("ชนิดไฟล์รูปภาพไม่รองรับ")
	}
	key := path.Join("catalog", time.Now().UTC().Format("2006/01/02"), fmt.Sprintf("%d%s", time.Now().UTC().UnixNano(), extension))
	_, err := store.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(store.bucket),
		Key:          aws.String(key),
		Body:         bytes.NewReader(content),
		ContentType:  aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return "", fmt.Errorf("อัปโหลดรูปไป R2 ไม่สำเร็จ: %w", err)
	}
	return store.publicBaseURL + "/" + key, nil
}

func imageExtension(contentType string) (string, bool) {
	switch contentType {
	case "image/jpeg":
		return ".jpg", true
	case "image/png":
		return ".png", true
	case "image/webp":
		return ".webp", true
	default:
		return "", false
	}
}

// DecodeImageDataURL accepts only the image data URLs created by the legacy
// browser uploader. It is used by the one-time migration command.
func DecodeImageDataURL(value string) ([]byte, string, error) {
	parts := strings.SplitN(value, ",", 2)
	if len(parts) != 2 || !strings.HasPrefix(parts[0], "data:") || !strings.HasSuffix(parts[0], ";base64") {
		return nil, "", fmt.Errorf("ไม่ใช่ image data URL")
	}
	contentType := strings.TrimSuffix(strings.TrimPrefix(parts[0], "data:"), ";base64")
	if _, ok := imageExtension(contentType); !ok {
		return nil, "", fmt.Errorf("ชนิดไฟล์รูปภาพไม่รองรับ")
	}
	content, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil || len(content) == 0 {
		return nil, "", fmt.Errorf("อ่าน image data URL ไม่สำเร็จ")
	}
	return content, contentType, nil
}
