package com.example.health_care.service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
    
    // 📧이모지로 표시: 이메일 인증 코드를 임시 저장할 맵 추가
    private final Map<String, String> emailVerificationCodeCache = new ConcurrentHashMap<>();
    
    // 📧이모지로 표시: 이메일 인증 코드 발송 및 저장 메서드
    public void sendCodeToEmail(String email, String purpose) {
      String verificationCode = generateVerificationCode();
      emailVerificationCodeCache.put(email + "_" + purpose, verificationCode);
      boolean success = sendVerificationEmail(email, verificationCode);
      if (!success) {
          throw new IllegalStateException("이메일 발송에 실패했습니다.");
      }
    }
    
    // 📧이모지로 표시: 이메일 인증 코드 검증 메서드
    public boolean verifyEmailCode(String email, String code, String purpose) {
      String cachedCode = emailVerificationCodeCache.get(email + "_" + purpose);
      if (cachedCode == null || !cachedCode.equals(code)) {
          return false;
      }
      emailVerificationCodeCache.remove(email + "_" + purpose);
      return true;
    }

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
}