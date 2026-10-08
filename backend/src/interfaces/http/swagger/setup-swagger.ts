import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('The Last of Guss API')
    .setDescription('Кликер: раунды, тапы по гусю, очки. Все мутации — POST с JSON, сессия — httpOnly cookie.')
    .setVersion('1.0.0')
    .addCookieAuth('access_token', { type: 'apiKey', in: 'cookie', name: 'access_token' }, 'access_token')
    .addCookieAuth('refresh_token', { type: 'apiKey', in: 'cookie', name: 'refresh_token' }, 'refresh_token')
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app), { jsonDocumentUrl: 'api/docs-json' });
}
