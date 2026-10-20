# Nguồn ảnh và danh mục sản phẩm PREORA

Bộ danh mục hiện tại có **300 sản phẩm đang mở chiến dịch**, chia gần đều 6 nhóm:

| Nhóm | Số lượng |
|---|---:|
| Thời trang | 54 |
| Merchandise | 48 |
| Collectible | 56 |
| Công nghệ / Phụ kiện điện tử | 51 |
| Nước hoa | 51 |
| Trang trí nhà cửa | 40 |

Sonic và Super Mario được ưu tiên đầu danh mục, đan xen các loại sản phẩm. Có bộ lọc riêng theo hai chủ đề. Nước hoa và đồ trang trí được giữ, mở rộng bằng sản phẩm khác nhau thay vì lặp tên/ảnh. Bộ mẫu hiện gồm 45 Sonic, 42 Super Mario, 20 Liên Quân Mobile, 20 Doraemon, 20 Thám tử Conan, 20 Anime điện ảnh, 47 Gaming gear, 86 Lifestyle.

## Nguồn

Tên và ảnh sản phẩm được tham khảo từ:

- [SEGA Shop — Sonic](https://shop.sega.com/collections/sonic).
- [Toynk — Super Mario](https://www.toynk.com/collections/super-mario-bros).
- [8BitDo](https://shop.8bitdo.com/).
- [Oakcha](https://www.oakcha.com/) cho nước hoa.
- [Umbra](https://www.umbra.com/) cho trang trí nhà cửa.
- [nShop — Doraemon](https://www.nshop.com.vn/collections/all/doraemon) và [Conan](https://www.nshop.com.vn/search?q=conan&type=product).
- [In Ấn 2H — mẫu móc khóa Liên Quân](https://inan2h.vn/san-pham/moc-khoa-lien-quan/). Tên mô tả dựa trên ảnh thực tế; không tự gán tên tướng khi chưa xác minh.
- [Good Smile US](https://www.goodsmileus.com/products/nendoroid-reze-55455) cho figure anime điện ảnh. Nhóm này gồm Chainsaw Man – Reze Arc và Demon Slayer; không coi mọi kết quả tìm kiếm gần giống là đúng nhân vật/phim.
- [DummyJSON](https://github.com/Ovi/DummyJSON) cho 5 nước hoa và 5 món trang trí đã có trong bộ trước.

`database/seeds/product_image_manifest.json` lưu URL ảnh gốc, trang sản phẩm nguồn, mã nguồn, ảnh local và SHA-256. Ảnh ở `frontend/public/products` để web hoạt động mà không phải gọi CDN ngoài. Bộ ảnh được kiểm tra đọc được, 300 tên khác nhau và 300 hash nội dung ảnh khác nhau.

Đây là danh mục coursework. Ảnh và tên thương hiệu thuộc chủ sở hữu tương ứng; việc xuất hiện trong demo không biểu thị hợp tác, ủy quyền hay một chiến dịch bán hàng thật. Giá VND, MOQ, seller, đơn hàng, lịch và chiến dịch đều là dữ liệu mô phỏng của PREORA; không phải báo giá hoặc chính sách của nguồn.

## Tái tạo

Sau khi cài dependencies frontend, chạy tại repo root:

```powershell
python -m pip install -r scripts/catalogue-requirements.txt
python -X utf8 scripts/prepare_product_catalogue.py
node scripts/export_sample_data.cjs
python -X utf8 scripts/generate_sample_sql.py
```

Script chỉ đọc danh mục công khai. Sản phẩm trên nguồn có thể thay đổi; script sẽ dừng nếu không đủ ảnh/tên riêng để giữ số lượng từng nhóm. Có thể thay đổi tên sản phẩm nguồn nhưng không tạo SKU/ảnh giả bằng cách thêm hậu tố. Seed SQL và frontend được tạo từ cùng dữ liệu đã kiểm tra. Các ảnh cũ không dùng bởi danh mục hiện tại có thể vẫn nằm trong assets để giữ đường dẫn của dữ liệu demo cũ.

## Chủ đề bổ sung

Chọn bộ lọc Liên Quân Mobile, Doraemon, Thám tử Conan hoặc Anime điện ảnh ở cả trang khám phá công khai và marketplace sau đăng nhập. Tìm kiếm nhận cả tên chủ đề. Mặc định Đề xuất nổi bật đan xen các chủ đề, Sonic/Mario dẫn đầu mỗi vòng; vẫn có lựa chọn Ưu tiên Sonic & Mario riêng.

`scripts/import_topic_products.py` bổ sung SKU từ trang nguồn vào bộ 200 sản phẩm và chỉ thay các bản ghi cùng nhóm Collectible, vì vậy không làm lệch số lượng 6 nhóm, không đụng nước hoa/trang trí. Có kiểm tra không trùng ảnh/nội dung và không trùng tên.

## Mở rộng lên 300 sản phẩm — 15/10/2026

- Bốn chủ đề Liên Quân Mobile, Doraemon, Thám tử Conan và Anime điện ảnh đều có đúng 20 sản phẩm. Giữ nguyên 200 vị trí/ID đầu và chỉ nối thêm 100 sản phẩm.
- `scripts/expand_catalogue_300.py` nhập thêm áo Liên Quân từ trang sản phẩm TecKi (ảnh Shopee), các mẫu móc khóa riêng từ In Ấn 2H, thêm Doraemon/Conan từ nShop và anime điện ảnh từ Good Smile US. Tiếp tục bổ sung nước hoa, phụ kiện và trang trí từ Oakcha/8BitDo/Umbra để cân đối.
- Mỗi sản phẩm có tên và ảnh chính khác nhau; loại bỏ ảnh trùng nội dung. Giá và chiến dịch là mô phỏng, không suy ra tồn kho hoặc chứng nhận bản quyền từ nguồn ảnh.
- Pipeline đầy đủ: `prepare_product_catalogue.py` → `expand_catalogue_300.py` → `prepare_product_galleries.py` → `export_sample_data.cjs` → `generate_sample_sql.py`. Cần thư viện theo catalogue-requirements.txt và kết nối mạng khi nhập.
