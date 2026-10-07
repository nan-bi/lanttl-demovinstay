import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const MOCK_URL = 'https://mock.supabase.co';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabaseUrl: string;
  private readonly configured: boolean;
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || MOCK_URL;
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 'mock_key';

    // Placeholder trong .env.example không tính là đã cấu hình.
    this.configured = Boolean(
      this.configService.get<string>('SUPABASE_URL') &&
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') &&
        !this.supabaseUrl.includes('your-project-ref') &&
        this.supabaseUrl !== MOCK_URL &&
        !serviceRoleKey.includes('your-supabase') &&
        serviceRoleKey !== 'mock_key',
    );

    // Client service-role: chỉ dùng cho Storage (ảnh hồ sơ ký gửi). Đăng nhập không đi qua Supabase.
    this.supabaseClient = createClient(this.supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log(`Initialized Supabase Admin Client for: ${this.supabaseUrl}`);
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  /** false khi thiếu SUPABASE_URL / SERVICE_ROLE_KEY hoặc còn giá trị mẫu (chỉ ảnh hưởng Storage, không ảnh hưởng đăng nhập). */
  isConfigured(): boolean {
    return this.configured;
  }

  // ---------------------------------------------------------------- Storage

  async uploadFile(bucket: string, path: string, fileBuffer: Buffer, contentType: string): Promise<any> {
    return this.supabaseClient.storage.from(bucket).upload(path, fileBuffer, {
      contentType,
      upsert: true,
    });
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<any> {
    return this.supabaseClient.storage.from(bucket).createSignedUrl(path, expiresIn);
  }
}
