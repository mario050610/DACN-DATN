/** Return messages only; never echo input values from validation errors. */
export function apiErrorMessage(detail:unknown,fallback:string):string {
 if(typeof detail==='string')return detail;
 if(Array.isArray(detail)&&detail.length){const first=detail[0];if(typeof first?.msg==='string'&&first.msg.startsWith('Value error, '))return first.msg.slice(13);const names:Record<string,string>={name:'Họ và tên',email:'Email',phone:'Số điện thoại',password:'Mật khẩu',password_confirmation:'Xác nhận mật khẩu',accepted_terms:'Đồng ý điều khoản',accepted_privacy:'Đồng ý chính sách quyền riêng tư',role:'Vai trò',code:'Mã xác thực',storeName:'Tên cửa hàng',organizationName:'Tên tổ chức'};const key=first?.loc?.at(-1);if(typeof key==='string')return `${names[key]||'Thông tin hồ sơ'} không hợp lệ. Kiểm tra định dạng và các trường bắt buộc.`;}
 return fallback;
}
