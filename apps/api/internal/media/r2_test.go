package media

import "testing"

func TestImageExtensionAcceptsOnlySupportedTypes(t *testing.T) {
	for _, test := range []struct {
		contentType string
		want        string
		valid       bool
	}{
		{"image/jpeg", ".jpg", true},
		{"image/png", ".png", true},
		{"image/webp", ".webp", true},
		{"image/gif", "", false},
	} {
		got, valid := imageExtension(test.contentType)
		if got != test.want || valid != test.valid {
			t.Fatalf("imageExtension(%q) = (%q, %t), want (%q, %t)", test.contentType, got, valid, test.want, test.valid)
		}
	}
}

func TestDecodeImageDataURL(t *testing.T) {
	content, contentType, err := DecodeImageDataURL("data:image/png;base64,aGVsbG8=")
	if err != nil || string(content) != "hello" || contentType != "image/png" {
		t.Fatalf("DecodeImageDataURL() = (%q, %q, %v)", content, contentType, err)
	}
	if _, _, err := DecodeImageDataURL("data:text/plain;base64,aGVsbG8="); err == nil {
		t.Fatal("non-image data URL should fail")
	}
}
