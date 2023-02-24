package ml.moerail;

import android.Manifest.permission;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.king.mlkit.vision.camera.AnalyzeResult;
import com.king.wechat.qrcode.WeChatQRCodeDetector;
import com.king.wechat.qrcode.scanning.WeChatCameraScanActivity;
import com.king.mlkit.vision.camera.CameraScan;
import org.opencv.OpenCV;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.List;

enum RequestCode {
    CAMERA_SCAN,
    GALLERY_SCAN
}

public class CameraScanActivity extends WeChatCameraScanActivity implements View.OnTouchListener {
    private static final String LOG_TAG_SCANNER = "scanner";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        OpenCV.initAsync(this);
        WeChatQRCodeDetector.init(this);
        getCameraScan().setPlayBeep(true).setVibrate(true);
        previewView.setOnTouchListener(this);
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
    public void onScanResultCallback(@NonNull AnalyzeResult<List<String>> result) {
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
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != RequestCode.GALLERY_SCAN.ordinal()) {
            return;
        }
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startImagePicker();
        }
    }

    @Override
    public boolean onTouch(View view, @NonNull MotionEvent event) {
        boolean isSingleTouch = event.getPointerCount() == 1;
        boolean isDownEvent = event.getAction() == MotionEvent.ACTION_DOWN;
        if (!isSingleTouch || !isDownEvent) {
            return super.onTouchEvent(event);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{permission.READ_EXTERNAL_STORAGE}, RequestCode.GALLERY_SCAN.ordinal());
                return true;
            }
        }
        startImagePicker();
        return true;
    }

    public void startImagePicker() {
        Intent intent = new Intent();
        intent.setAction(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        startActivityForResult(intent, RequestCode.GALLERY_SCAN.ordinal());
    }
}
