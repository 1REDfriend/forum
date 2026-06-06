import { reportRepository } from '../repositories/report.repository.js';
import { NotFoundError } from '../utils/errors.js';

interface CreateReportInput {
  targetType: 'thread' | 'post' | 'user';
  targetId: string;
  reason: string;
}

export class ReportService {
  async create(reporterId: string, data: CreateReportInput) {
    const row = await reportRepository.create(reporterId, data.targetType, data.targetId, data.reason);
    return {
      message: row
        ? 'รายงานถูกส่งแล้ว ขอบคุณที่ช่วยดูแลชุมชน'
        : 'คุณได้รายงานสิ่งนี้ไปแล้ว',
    };
  }

  list(page: number, limit: number, status?: string) {
    return reportRepository.list(page, limit, status);
  }

  async resolve(id: string, status: string) {
    const row = await reportRepository.setStatus(id, status);
    if (!row) throw NotFoundError('Report not found');
    return row;
  }
}

export const reportService = new ReportService();
