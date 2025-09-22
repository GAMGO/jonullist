package com.example.health_care.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${GMAIL_API_EMAIL}")
    private String fromEmail;
    
    /**
     * 이메일 인증 토큰 생성
     * @return 생성된 토큰
     */
    public String generateVerificationToken() {
        return UUID.randomUUID().toString();
    }

    /**
     * 이메일 인증번호 생성 (6자리 숫자)
     * @return 생성된 인증번호
     */
    public String generateVerificationCode() {
        return String.format("%06d", (int)(Math.random() * 1000000));
    }

    /**
     * 이메일 인증번호 발송
     * @param email 수신자 이메일
     * @param verificationCode 인증번호
     * @return 발송 성공 여부
     */
    public boolean sendVerificationEmail(String email, String verificationCode) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail); // 주입받은 fromEmail 변수를 직접 사용
            helper.setTo(email);
            helper.setSubject("이메일 인증번호입니다");

            String htmlContent = createVerificationCodeHtml(verificationCode);
            
            helper.setText(htmlContent, true);
            mailSender.send(message);
            
            log.info("이메일 인증번호 발송 완료: {} - 코드: {}", email, verificationCode);
            
            return true;
        } catch (Exception e) {
            log.error("이메일 발송 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 토큰 만료 여부 확인
     * @param expires 만료 시간
     * @return 만료 여부
     */
    public boolean isTokenExpired(LocalDateTime expires) {
        if (expires == null) {
            return true;
        }
        return LocalDateTime.now().isAfter(expires);
    }
    
    /**
     * 이메일 인증번호 HTML 템플릿 생성
     * @param verificationCode 인증번호
     * @return HTML 내용
     */
    private String createVerificationCodeHtml(String verificationCode) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>이메일 인증번호</title>
                </head>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #333;">이메일 인증번호</h1>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #666; line-height: 1.6;">
                            안녕하세요!<br>
                            회원가입을 완료하기 위해 아래 인증번호를 입력해주세요.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; background-color: #007bff; color: white; 
                                    padding: 20px 40px; border-radius: 10px; font-size: 32px; 
                                    font-weight: bold; letter-spacing: 5px;">
                            %s
                        </div>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            <strong>주의사항:</strong> 이 인증번호는 5분 후에 만료됩니다.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                            이 이메일은 자동으로 발송된 메일입니다. 회신하지 마세요.
                        </p>
                    </div>
                </body>
                </html>
                """.formatted(verificationCode);
    }

    /**
     * 비밀번호 복구용 인증 코드 발송
     * @param email 수신자 이메일
     * @param code 복구 인증 코드
     * @return 발송 성공 여부
     */
    public boolean sendRecoveryCode(String email, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("비밀번호 복구 인증 코드입니다");

            String htmlContent = createRecoveryCodeHtml(code);
            
            helper.setText(htmlContent, true);
            mailSender.send(message);
            
            log.info("비밀번호 복구 인증 코드 발송 완료: {} - 코드: {}", email, code);
            
            return true;
        } catch (Exception e) {
            log.error("비밀번호 복구 인증 코드 발송 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 비밀번호 복구 인증 코드 HTML 템플릿 생성
     * @param code 인증 코드
     * @return HTML 내용
     */
    private String createRecoveryCodeHtml(String code) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>비밀번호 복구 인증 코드</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #333; margin: 0; font-size: 28px;">비밀번호 복구</h1>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">인증 코드</h2>
                            <div style="background-color: #ffffff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px;">%s</span>
                            </div>
                            <p style="color: #666; margin: 0; font-size: 16px;">
                                위 인증 코드를 입력하여 비밀번호를 재설정하세요.
                            </p>
                        </div>
                        
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                <strong>주의사항:</strong> 이 인증 코드는 5분 후에 만료됩니다.
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                                이 이메일은 자동으로 발송된 메일입니다. 회신하지 마세요.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(code);
    }
}