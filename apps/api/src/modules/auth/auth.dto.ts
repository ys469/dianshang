import { IsIn, IsMobilePhone, IsString, Length, MinLength } from 'class-validator';

export type SmsScene = 'register' | 'reset_password';

export class LoginDto {
  @IsIn(['user', 'admin'])
  role!: 'user' | 'admin';

  @IsString()
  @MinLength(3)
  account!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @IsMobilePhone('zh-CN')
  mobile!: string;

  @IsString()
  @MinLength(2)
  nickname!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(6)
  confirmPassword!: string;

  @IsString()
  @Length(6, 6)
  smsCode!: string;
}

export class ResetPasswordDto {
  @IsMobilePhone('zh-CN')
  mobile!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(6)
  confirmPassword!: string;

  @IsString()
  @Length(6, 6)
  smsCode!: string;
}

export class SendSmsCodeDto {
  @IsMobilePhone('zh-CN')
  mobile!: string;

  @IsIn(['register', 'reset_password'])
  scene!: SmsScene;
}
