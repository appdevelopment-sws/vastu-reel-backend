import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HTTPLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, body } = request;
    const startTime = Date.now();

    response.on('finish', () => {
      const { statusCode } = response;
      const duration = Date.now() - startTime;
      const payloadInfo =
        body && Object.keys(body).length > 0
          ? ` Payload: ${JSON.stringify(body).slice(0, 200)}`
          : '';
      this.logger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms${payloadInfo}`);
    });

    next();
  }
}
