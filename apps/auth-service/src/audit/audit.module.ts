import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogService } from './audit-log.service';
import { AuditLogsController } from './audit-logs.controller';

@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
