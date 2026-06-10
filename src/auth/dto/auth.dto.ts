import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email, phone number, student ID (STU-2025-0001), or teacher employee ID',
    examples: {
      email:      { value: 'admin@school.edu.bd',  summary: 'Super Admin' },
      phone:      { value: '01700000000',           summary: 'Phone login' },
      studentId:  { value: 'STU-2025-0001',         summary: 'Student ID' },
      employeeId: { value: 'EMP-001',               summary: 'Teacher employee ID' },
    },
  })
  @IsString() @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'TempPass@123' })
  @IsString() @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'TempPass@123', description: 'Current (temporary) password' })
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    example: 'MyNewPass@456',
    description: 'Min 8 chars. Must have uppercase, lowercase, and digit.',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must contain uppercase, lowercase, and a digit',
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'teacher@school.edu.bd', description: 'Email or phone' })
  @IsString() @IsNotEmpty()
  identifier: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'teacher@school.edu.bd' })
  @IsString() @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '847291', description: '6-digit OTP' })
  @IsString() @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'NewPass@123' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and a digit',
  })
  newPassword: string;
}
