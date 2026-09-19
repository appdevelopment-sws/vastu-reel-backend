import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';
import { ReelsService } from './modules/reels/services/reels.service';
import { UsersService } from './modules/users/users.service';

function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly reelsService: ReelsService,
    private readonly UsersService: UsersService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Public Web Landing Page & Open Graph Metadata for Shared Reels.
   * Enables rich preview cards in WhatsApp, Telegram, iMessage, Facebook, and Twitter,
   * and automatically redirects to the Reelsgate mobile app.
   */
  @Public()
  @Get('reel/:id')
  async getSharedReel(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const requestHost = req.headers.host;
      const reel = await this.reelsService.getById(id, null, requestHost);

      const title = escapeHtml(reel.title || 'Property Reel');
      const caption = escapeHtml(
        reel.caption || 'Watch this exclusive reel on Reelsgate',
      );
      const creatorName = escapeHtml(reel.creator?.name || 'Reelsgate Creator');
      const videoUrl = reel.videoUrl || '';
      const thumbnailUrl = reel.thumbnailUrl || '';
      const fullShareUrl = `${req.protocol}://${requestHost}/reel/${id}`;
      const appSchemeUrl = `reelsgate://reel/${id}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title} | Reelsgate</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${title} | Reelsgate">
  <meta name="description" content="${caption}">

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="video.other">
  <meta property="og:site_name" content="Reelsgate">
  <meta property="og:url" content="${fullShareUrl}">
  <meta property="og:title" content="${title} - by ${creatorName}">
  <meta property="og:description" content="${caption}">
  ${thumbnailUrl ? `<meta property="og:image" content="${thumbnailUrl}">` : ''}
  ${thumbnailUrl ? `<meta property="og:image:secure_url" content="${thumbnailUrl}">` : ''}
  <meta property="og:image:width" content="720">
  <meta property="og:image:height" content="1280">
  ${videoUrl ? `<meta property="og:video" content="${videoUrl}">` : ''}
  ${videoUrl ? `<meta property="og:video:secure_url" content="${videoUrl}">` : ''}
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="720">
  <meta property="og:video:height" content="1280">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${caption}">
  ${thumbnailUrl ? `<meta name="twitter:image" content="${thumbnailUrl}">` : ''}

  <!-- App Links (Android & iOS) -->
  <meta property="al:android:url" content="${appSchemeUrl}">
  <meta property="al:android:package" content="com.sws.reelsgate">
  <meta property="al:android:app_name" content="Reelsgate">
  <meta property="al:ios:url" content="${appSchemeUrl}">
  <meta property="al:ios:app_name" content="Reelsgate">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0E14;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background: #151A23;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
    }
    .video-container {
      position: relative;
      width: 100%;
      background: #000;
      aspect-ratio: 9 / 16;
      max-height: 520px;
      overflow: hidden;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #D4AF37;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .title {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.3;
    }
    .creator {
      font-size: 14px;
      color: #94A3B8;
    }
    .caption {
      font-size: 13px;
      color: #CBD5E1;
      line-height: 1.4;
      max-height: 56px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #ECC859 0%, #D4AF37 100%);
      color: #0B0E14;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 12px;
      margin-top: 8px;
      transition: transform 0.15s ease, opacity 0.15s ease;
      box-shadow: 0 8px 20px rgba(212, 175, 55, 0.3);
    }
    .btn:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
  </style>

  <script>
    // Automatic redirect to custom scheme if opened on a mobile device
    (function() {
      var appUrl = "${appSchemeUrl}";
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        // Try opening app
        window.location.href = appUrl;
      }
    })();
  </script>
</head>
<body>
  <div class="card">
    <div class="video-container">
      ${
        videoUrl
          ? `<video src="${videoUrl}" poster="${thumbnailUrl}" controls playsinline autoplay muted loop></video>`
          : thumbnailUrl
            ? `<img src="${thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${title}" />`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;">No preview available</div>`
      }
    </div>
    <div class="content">
      <div class="brand">✨ Reelsgate</div>
      <div class="title">${title}</div>
      <div class="creator">By ${creatorName}</div>
      ${caption ? `<div class="caption">${caption}</div>` : ''}
      <a href="${appSchemeUrl}" class="btn">
        <span>▶</span> Open in Reelsgate App
      </a>
    </div>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err) {
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reel Not Found | Reelsgate</title>
  <style>
    body { background: #0B0E14; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .box { background: #151A23; padding: 32px; border-radius: 16px; max-width: 360px; border: 1px solid rgba(255,255,255,0.08); }
    h2 { color: #D4AF37; margin-bottom: 8px; }
    p { color: #94A3B8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Reel Unavailable</h2>
    <p>This reel may have expired or was removed by the creator.</p>
  </div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(errorHtml);
    }
  }

  /**
   * Public Web Landing Page & Open Graph Metadata for Shared Profiles.
   * Enables rich preview cards in WhatsApp, Telegram, iMessage, Facebook, and Twitter,
   * and automatically redirects to the Reelsgate mobile app.
   */
  @Public()
  @Get('profile/:handleOrId')
  async getSharedProfile(
    @Param('handleOrId') handleOrId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const cleanHandle = (handleOrId || '').replace(/^@/, '').trim();
      const requestHost = req.headers.host;

      let user: any = null;
      try {
        user = await this.UsersService.findByUsernameOrId(cleanHandle);
      } catch (err) {
        // Fallback gracefully
      }

      const name = escapeHtml(user?.name || cleanHandle || 'Reelsgate Creator');
      const username = escapeHtml(user?.username || cleanHandle || '');
      const bio = escapeHtml(
        user?.bio || `Check out @${username} on Reelsgate`,
      );
      const avatarUrl = user?.avatarUrl || '';
      const fullShareUrl = `${req.protocol}://${requestHost}/profile/${cleanHandle}`;
      const appSchemeUrl = `reelsgate://profile/${cleanHandle}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${name} (@${username}) | Reelsgate</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${name} (@${username}) | Reelsgate">
  <meta name="description" content="${bio}">

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Reelsgate">
  <meta property="og:url" content="${fullShareUrl}">
  <meta property="og:title" content="${name} (@${username}) on Reelsgate">
  <meta property="og:description" content="${bio}">
  ${avatarUrl ? `<meta property="og:image" content="${avatarUrl}">` : ''}
  ${avatarUrl ? `<meta property="og:image:secure_url" content="${avatarUrl}">` : ''}
  <meta property="og:image:width" content="400">
  <meta property="og:image:height" content="400">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${name} (@${username}) on Reelsgate">
  <meta name="twitter:description" content="${bio}">
  ${avatarUrl ? `<meta name="twitter:image" content="${avatarUrl}">` : ''}

  <!-- App Links (Android & iOS) -->
  <meta property="al:android:url" content="${appSchemeUrl}">
  <meta property="al:android:package" content="com.sws.reelsgate">
  <meta property="al:android:app_name" content="Reelsgate">
  <meta property="al:ios:url" content="${appSchemeUrl}">
  <meta property="al:ios:app_name" content="Reelsgate">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0E14;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #131A29;
      border: 1px solid #24334C;
      border-radius: 24px;
      padding: 36px 24px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 16px;
      border: 3px solid #D4AF37;
      display: block;
      background: #1E293B;
    }
    .avatar-fallback {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      margin: 0 auto 16px;
      border: 3px solid #D4AF37;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 700;
      color: #D4AF37;
      background: rgba(212, 175, 55, 0.15);
    }
    .name {
      font-size: 22px;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 4px;
    }
    .username {
      font-size: 14px;
      color: #D4AF37;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .bio {
      font-size: 14px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      transition: opacity 0.2s;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #E5C058 0%, #D4AF37 100%);
      color: #000000;
      margin-bottom: 12px;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(212, 175, 55, 0.15);
      color: #D4AF37;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
  </style>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Attempt automated redirection to mobile app via custom URL scheme
      setTimeout(() => {
        window.location.href = "${appSchemeUrl}";
      }, 500);
    });
  </script>
</head>
<body>
  <div class="card">
    <div class="badge">REELSGATE PROFILE</div>
    ${avatarUrl ? `<img src="${avatarUrl}" alt="${name}" class="avatar">` : `<div class="avatar-fallback">${name[0] ? name[0].toUpperCase() : 'U'}</div>`}
    <h1 class="name">${name}</h1>
    <div class="username">@${username}</div>
    <p class="bio">${bio}</p>
    <a href="${appSchemeUrl}" class="btn btn-primary">Open in Reelsgate App</a>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (e) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Profile not found',
      });
    }
  }
}
