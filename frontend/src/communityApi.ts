export async function community<T=any>(path:string,body?:unknown,method?:string):Promise<T> {
 const r=await fetch('/api/community'+path,{credentials:'include',cache:'no-store',method:method||(body===undefined?'GET':'POST'),headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'Không thể lưu hoặc tải dữ liệu. Vui lòng kiểm tra kết nối và thông tin nhập.');return data;
}
export const mediaUrl=(id:string)=>'/api/community/media/'+encodeURIComponent(id);
export const roleLabels:Record<string,string>={customer:'Khách hàng',seller:'Người bán',admin:'Quản trị viên',partner:'Đối tác sản xuất'};
export const timeLabel=(at:string)=>new Date(at).toLocaleString('vi-VN');
export async function imageFile(file:File) {if(file.size>2_000_000||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Chọn ảnh PNG, JPEG hoặc WebP tối đa 2 MB.');return {content:await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Không đọc được ảnh'));r.readAsDataURL(file);})};}
