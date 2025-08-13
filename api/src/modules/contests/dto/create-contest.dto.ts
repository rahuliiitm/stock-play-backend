import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateContestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(['public', 'private'] as any)
  visibility?: 'public' | 'private'

  @IsInt()
  @Min(0)
  initial_balance_cents!: number

  @IsOptional()
  @IsInt()
  @Min(0)
  entry_fee_cents?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  max_participants?: number

  @IsDateString()
  starts_at!: string

  @IsDateString()
  ends_at!: string

  @IsOptional()
  @IsArray()
  allowed_symbols?: string[]
} 