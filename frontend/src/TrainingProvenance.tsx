export default function TrainingProvenance() {
  return <details className="rounded-2xl border border-slate-200 bg-white p-5">
    <summary className="cursor-pointer text-sm font-semibold text-slate-800">Nguồn dữ liệu và quyền vận hành trong prototype</summary>
    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
      <p>Business Admin, AI/Data Operator và IT Admin hiện dùng chung tài khoản có vai trò <strong>admin</strong>. Người bán xem kết quả của chiến dịch thuộc cửa hàng mình.</p>
      <dl className="space-y-3">
        <div><dt className="font-semibold text-slate-800">Sản phẩm, chiến dịch và số lượng hiện tại</dt><dd>Snapshot từ dữ liệu prototype trong trình duyệt, có thể là dữ liệu mẫu hoặc do người dùng nhập; cần đối chiếu lịch sử ngày trước khi xác nhận.</dd></div>
        <div><dt className="font-semibold text-slate-800">Views, clicks, favorites và thêm giỏ</dt><dd>Tracker chỉ đếm các sự kiện đã ghi nhận từ khi bật theo dõi, không phải đầy đủ toàn bộ lịch sử hoặc số người duy nhất. Sửa giá trị sẽ chuyển nguồn sang nhập tay.</dd></div>
        <div><dt className="font-semibold text-slate-800">Dữ liệu dùng để học</dt><dd>Demo dùng lịch sử mô phỏng; CSV lịch sử do quản trị viên khai báo nguồn; UCI là thực nghiệm bán lẻ. Kickstarter và UCI không tự cung cấp đủ nhãn số lượng sản phẩm và hành vi cho mô hình PREORA đầy đủ.</dd></div>
      </dl>
      <p>Huấn luyện là tác vụ nền; kết quả được lưu theo phiên và snapshot. Trang người bán đọc kết quả full đã hoàn tất, không tự dự báo lại mỗi lần mở. Chatbot hỏi đáp là chức năng riêng.</p>
    </div>
  </details>;
}
