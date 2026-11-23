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
