package pl.ziutek.itemshop.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;

/**
 * RFC 6238 TOTP — no external dependencies.
 * Secret stored as raw bytes in hex; displayed as Base32 for authenticator apps.
 */
@Service
public class TotpService {

    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int CODE_DIGITS = 6;
    private static final int TIME_STEP   = 30;
    private static final int WINDOW      = 1; // ±1 time step tolerance

    // ── Secret generation ────────────────────────────────────────────────────

    /** Generates a 20-byte random secret, returned as uppercase Base32. */
    public String generateSecret() {
        byte[] bytes = new byte[20];
        new SecureRandom().nextBytes(bytes);
        return bytesToBase32(bytes);
    }

    // ── Verification ─────────────────────────────────────────────────────────

    /**
     * Verifies a 6-digit TOTP code against a Base32 secret.
     * Allows ±WINDOW time steps to tolerate clock drift.
     */
    public boolean verifyCode(String base32Secret, String userCode) {
        if (base32Secret == null || userCode == null || userCode.length() != CODE_DIGITS) return false;
        try {
            byte[] key = base32ToBytes(base32Secret);
            long T = System.currentTimeMillis() / 1000 / TIME_STEP;
            for (long i = T - WINDOW; i <= T + WINDOW; i++) {
                if (generateHotp(key, i).equals(userCode)) return true;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    // ── OTPAuth URI ──────────────────────────────────────────────────────────

    /** Builds the otpauth URI for QR code scanning. */
    public String buildOtpauthUri(String base32Secret, String email, String issuer) {
        String encodedEmail  = urlEncode(email);
        String encodedIssuer = urlEncode(issuer);
        return String.format(
            "otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
            encodedIssuer, encodedEmail, base32Secret, encodedIssuer
        );
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private String generateHotp(byte[] key, long counter) throws Exception {
        byte[] msg = ByteBuffer.allocate(8).putLong(counter).array();
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(msg);
        int offset = hash[hash.length - 1] & 0x0f;
        int code = ((hash[offset]     & 0x7f) << 24)
                 | ((hash[offset + 1] & 0xff) << 16)
                 | ((hash[offset + 2] & 0xff) <<  8)
                 |  (hash[offset + 3] & 0xff);
        return String.format("%0" + CODE_DIGITS + "d", code % (int) Math.pow(10, CODE_DIGITS));
    }

    private String bytesToBase32(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0, bitsLeft = 0;
        for (byte b : bytes) {
            buffer = (buffer << 8) | (b & 0xff);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                sb.append(BASE32_CHARS.charAt((buffer >> (bitsLeft - 5)) & 31));
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) sb.append(BASE32_CHARS.charAt((buffer << (5 - bitsLeft)) & 31));
        return sb.toString();
    }

    private byte[] base32ToBytes(String base32) {
        String s = base32.toUpperCase().replaceAll("=", "");
        byte[] out = new byte[s.length() * 5 / 8];
        int buffer = 0, bitsLeft = 0, idx = 0;
        for (char c : s.toCharArray()) {
            int val = BASE32_CHARS.indexOf(c);
            if (val < 0) throw new IllegalArgumentException("Invalid Base32 char: " + c);
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out[idx++] = (byte) (buffer >> (bitsLeft - 8));
                bitsLeft -= 8;
            }
        }
        return out;
    }

    private String urlEncode(String s) {
        return s.replace(" ", "%20").replace("@", "%40").replace(":", "%3A");
    }
}
