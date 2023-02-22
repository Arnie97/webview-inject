package ml.moerail;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;

import com.king.mlkit.vision.camera.AnalyzeResult;
import com.king.wechat.qrcode.WeChatQRCodeDetector;
import com.king.wechat.qrcode.scanning.WeChatCameraScanActivity;
import com.king.mlkit.vision.camera.CameraScan;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.opencv.OpenCV;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.List;

enum RequestCode {
    CAMERA_SCAN,
    GALLERY_SCAN
}

public class CameraScanActivity extends WeChatCameraScanActivity implements View.OnClickListener {

    private static final String LOG_TAG_SCANNER = "scanner";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        OpenCV.initAsync(this);
        WeChatQRCodeDetector.init(this);
        getCameraScan().setPlayBeep(true).setVibrate(true);
    }

    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null) {
            return;
        }
        if (requestCode != RequestCode.GALLERY_SCAN.ordinal()) {
            return;
        }

        try {
            InputStream stream = this.getContentResolver().openInputStream(data.getData());
            Bitmap bitmap = BitmapFactory.decodeStream(stream);
            onScanResultCallback(WeChatQRCodeDetector.detectAndDecode(bitmap));
        } catch (FileNotFoundException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void onScanResultCallback(@NotNull AnalyzeResult<List<String>> result) {
        onScanResultCallback(result.getResult());
    }

    public void onScanResultCallback(List<String> result) {
        if (result.isEmpty()) {
            return;
        }

        getCameraScan().setAnalyzeImage(false);
        Log.d(LOG_TAG_SCANNER, result.toString());
        String[] text = result.toArray(new String[0]);

        Intent intent = new Intent();
        intent.putExtra(CameraScan.SCAN_RESULT, text);
        setResult(RESULT_OK, intent);
        finish();
    }

    @Override
    public void onClick(View v) {
        Log.d(LOG_TAG_SCANNER, v.toString());
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode != KeyEvent.KEYCODE_VOLUME_DOWN) {  // ignore other keys
            return super.onKeyDown(keyCode, event);
        }

        Intent intent = new Intent();
        intent.setAction(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        startActivityForResult(intent, RequestCode.GALLERY_SCAN.ordinal());
        return false;
    }
}
