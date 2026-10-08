import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: 'INVALID_CREDENTIALS' })
  code!: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message!: string | string[];
}
