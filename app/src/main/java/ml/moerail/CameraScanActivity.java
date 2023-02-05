package ml.moerail;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.king.mlkit.vision.camera.AnalyzeResult;
import com.king.wechat.qrcode.WeChatQRCodeDetector;
import com.king.wechat.qrcode.scanning.WeChatCameraScanActivity;
import org.jetbrains.annotations.NotNull;
import org.opencv.OpenCV;

import java.util.List;

public class CameraScanActivity extends WeChatCameraScanActivity {

    public static final String INTENT_EXTRA_KEY_SCAN_RESULT = "qr_scan_result";
    private static final String LOG_TAG_SCANNER = "scanner";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        OpenCV.initAsync(this);
        WeChatQRCodeDetector.init(this);
    }

    @Override
    public void onScanResultCallback(@NotNull AnalyzeResult<List<String>> result) {
        if (!result.getResult().isEmpty()) {
            getCameraScan().setAnalyzeImage(false);
            Log.d(LOG_TAG_SCANNER, result.getResult().toString());
            String[] text = result.getResult().toArray(new String[0]);

            Intent intent = new Intent();
            intent.putExtra(INTENT_EXTRA_KEY_SCAN_RESULT, text);
            setResult(RESULT_OK, intent);
            finish();
        }
    }
}
