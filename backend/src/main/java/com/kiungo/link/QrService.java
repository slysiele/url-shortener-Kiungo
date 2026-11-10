package com.kiungo.link;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageConfig;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.kiungo.common.ApiException;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

@Service
public class QrService {

    public byte[] png(String content, int size, String fgHex, String bgHex) {
        int s = Math.min(Math.max(size, 128), 2048);
        try {
            BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, s, s,
                Map.of(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M, EncodeHintType.MARGIN, 2));
            var config = new MatrixToImageConfig(argb(fgHex, 0xFF000000), argb(bgHex, 0xFFFFFFFF));
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out, config);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw ApiException.badRequest("QR_FAILED", "Could not render QR code");
        }
    }

    private static int argb(String hex, int fallback) {
        if (hex == null || !hex.matches("^#?[0-9a-fA-F]{6}$")) return fallback;
        return 0xFF000000 | Integer.parseInt(hex.replace("#", ""), 16);
    }
}
