import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
