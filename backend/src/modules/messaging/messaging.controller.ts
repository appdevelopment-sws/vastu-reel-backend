import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './services/messaging.service';
import { StorageService } from '../reels/services/storage.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { ReactMessageDto } from './dto/react-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { ReportMessageDto } from './dto/report-message.dto';

@ApiTags('Direct Messaging (DM)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly storageService: StorageService,
  ) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get list of inbox conversations with unread badges',
  })
  async getConversations(@Req() req: any, @Query('search') search?: string) {
    const userId = req.user.sub;
    return this.messagingService.getUserConversations(userId, search);
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Get or create 1-on-1 direct conversation with target user',
  })
  async createOrGetConversation(
    @Req() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    const userId = req.user.sub;
    return this.messagingService.getOrCreateDirectConversation(
      userId,
      dto.targetUserId,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details by UUID' })
  async getConversationDetails(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.sub;
    return this.messagingService.getConversationDetails(id, userId);
  }

  @Delete('conversations/:id')
  @ApiOperation({
    summary: 'Delete conversation for current user (hides from inbox)',
  })
  async deleteConversation(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.sub;
    return this.messagingService.deleteConversation(userId, id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get cursor-paginated messages for a conversation' })
  async getMessages(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    const userId = req.user.sub;
    return this.messagingService.getConversationMessages(userId, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send message in conversation via REST' })
  async sendMessage(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user.sub;
    dto.conversationId = id;
    return this.messagingService.sendMessage(userId, dto);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark messages in conversation as read' })
  async markRead(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: MarkReadDto,
  ) {
    const userId = req.user.sub;
    return this.messagingService.markConversationRead(
      userId,
      id,
      dto?.lastReadMessageId,
    );
  }

  @Post('messages/:id/reaction')
  @ApiOperation({ summary: 'Add or toggle emoji reaction on a message' })
  async reactToMessage(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReactMessageDto,
  ) {
    const userId = req.user.sub;
    return this.messagingService.reactToMessage(userId, id, dto.reaction);
  }

  @Delete('messages/:id')
  @ApiOperation({
    summary: 'Delete message (for everyone if deleteForEveryone=true)',
  })
  async deleteMessage(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('deleteForEveryone') deleteForEveryone?: string,
  ) {
    const userId = req.user.sub;
    const isEveryone = deleteForEveryone === 'true';
    return this.messagingService.deleteMessage(userId, id, isEveryone);
  }

  @Post('users/block')
  @ApiOperation({ summary: 'Block a user from sending DMs' })
  async blockUser(@Req() req: any, @Body() dto: BlockUserDto) {
    const userId = req.user.sub;
    return this.messagingService.blockUser(userId, dto.targetUserId);
  }

  @Post('users/unblock')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(@Req() req: any, @Body() dto: BlockUserDto) {
    const userId = req.user.sub;
    return this.messagingService.unblockUser(userId, dto.targetUserId);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Report a message or user for moderation' })
  async reportMessage(@Req() req: any, @Body() dto: ReportMessageDto) {
    const userId = req.user.sub;
    return this.messagingService.reportMessage(userId, dto);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get total unread message count across all conversations',
  })
  async getGlobalUnreadCount(@Req() req: any) {
    const userId = req.user.sub;
    const count = await this.messagingService.getGlobalUnreadCount(userId);
    return { unreadCount: count };
  }

  @Post('media/upload')
  @ApiOperation({ summary: 'Upload media/document attachment (Max 100MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 104857600, // 100 MB max upload limit
      },
    }),
  )
  async uploadMedia(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded or file exceeds 100MB limit',
      );
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const storageKey = `messaging/${randomUUID()}${ext}`;
    const requestHost = req.get('host');

    // Upload directly to Cloudflare R2 / S3 storage
    const url = await this.storageService.uploadBuffer(
      file.buffer,
      storageKey,
      file.mimetype,
      requestHost,
    );

    return {
      storageKey,
      url,
      fileType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
    };
  }
}
