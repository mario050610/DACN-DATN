import type {ProductionRequest} from './DemoStore';
export function workflowProgress(request:Pick<ProductionRequest,'status'|'progress'>) {switch(request.status){case 'Chờ tiếp nhận':return 0;case 'Đã tiếp nhận':return 10;case 'Đang sản xuất':return Math.round(20+Math.max(0,Math.min(100,request.progress))*.6);case 'Đang vận chuyển':return 90;case 'Hoàn thành':return 100;}}
