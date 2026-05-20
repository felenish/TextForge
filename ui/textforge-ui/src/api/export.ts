import { post } from './client';

export interface ExportRequest {
  format: 'pdf' | 'epub';
  title: string;
  author: string;
  bookIds?: string[];
}

export interface ExportResultDto {
  outputPath: string | null;
  cancelled: boolean;
}

export const exportManuscript = (request: ExportRequest): Promise<ExportResultDto> =>
  post('/api/export', request);
