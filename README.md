# Siri B1 · 42 ngày

Trang tự học ngữ pháp và từ vựng tiếng Anh trình độ B1 trong 42 ngày. Chạy hoàn toàn trên trình duyệt, không cần đăng nhập, tiến độ lưu trong `localStorage`.

- 14 cụm × 3 ngày: 2 ngày ngữ pháp + 1 ngày từ vựng (28 chủ điểm ngữ pháp, 504 từ và cụm từ).
- Mỗi ngày: thẻ từ vựng có audio → lý thuyết từng phần kèm câu kiểm tra nhanh → bài luyện có lời giải và trò chơi ghép nghĩa.
- Bài ôn sau mỗi cụm, mỗi 6 ngày, giữa khóa và cuối khóa.
- Ôn từ theo lặp ngắt quãng (1, 2, 4, 8, 16, 32 ngày), sổ từ, xuất/nhập tiến độ.

Nội dung tự soạn theo thứ tự chủ điểm của sách Destination B1 (Macmillan); không thuộc và không liên kết với nhà xuất bản.

## Chạy

```bash
npm start   # http://localhost:8080
HOST=0.0.0.0 npm start   # mở cho máy khác trong mạng nội bộ (mặc định chỉ nghe trên 127.0.0.1)
npm test
```

Không có bước build. Nội dung bài học nằm ở `js/content/c01.js` … `c14.js` (mỗi file một cụm). Khi đổi file được cache, tăng `CACHE` trong `sw.js`.

Giọng đọc dùng Web Speech API của trình duyệt, nên cần máy có giọng tiếng Anh.

## Deploy

Đẩy lên nhánh `main`: workflow `.github/workflows/pages.yml` chạy test rồi deploy lên GitHub Pages (Settings → Pages → Source: GitHub Actions).

## App Android (APK)

Thư mục `android/` bọc chính trang này trong một WebView; các file web ở gốc repo được chép vào APK lúc build nên app chạy offline hoàn toàn. Cần JDK 17 và Android SDK (`ANDROID_HOME`).

```bash
cd android
./gradlew assembleDebug   # app/build/outputs/apk/debug/app-debug.apk
```

Workflow `.github/workflows/android.yml` cũng build APK này và lưu ở mục Artifacts của mỗi lần chạy.

- Đây là bản debug: cài trực tiếp lên máy được, chưa ký để đưa lên Google Play. APK build ở hai máy khác nhau có chữ ký khác nhau, nên phải gỡ bản cũ trước khi cài bản build từ máy khác (tiến độ nên xuất ra file trước).
- Trong app, giọng đọc dùng bộ đọc văn bản (Text-to-speech) của điện thoại; xuất/nhập tiến độ dùng trình chọn file của Android.
