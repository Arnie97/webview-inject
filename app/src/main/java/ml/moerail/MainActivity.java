package ml.moerail;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

import com.androidyuan.aesjni.AESEncrypt;

import java.io.IOException;
import java.util.Calendar;
import java.util.Scanner;

public class MainActivity extends Activity {
    public static final int REQUEST_CODE_SCAN = 1;
    public static final int REQUEST_CODE_PHOTO = 2;

    private WebView webView;
    private String qrCode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                webView.evaluateJavascript("Object.assign(sessionStorage, localStorage);", null);
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                injectScript("main.js");
                super.onPageFinished(view, url);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(this, "moerail");
        // webView.setWebContentsDebuggingEnabled(true);
        WebSettings settings = webView.getSettings();
        String userAgent = " Moerail/" + BuildConfig.VERSION_NAME;
        settings.setUserAgentString(settings.getUserAgentString() + userAgent);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);

        webView.loadUrl("https://mobile.12306.cn/weixin/wxcore/init?type=null");
    }

    @JavascriptInterface
    public void startQRCodeScanner() {
        Intent intent = new Intent(this, CameraScanActivity.class);
        startActivityForResult(intent, REQUEST_CODE_SCAN);
    }

    @JavascriptInterface
    public String getQRCodeResult() {
        return qrCode;
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode != KeyEvent.KEYCODE_BACK) {  // ignore other keys
            return super.onKeyDown(keyCode, event);
        }
        webView.evaluateJavascript("goBack()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String pickerClosed) {
                if (pickerClosed.equals("1")) {
                    // the date or city picker was closed by the back button
                } else if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();  // can not go back any more, so exit the app
                }
            }
        });
        return true;
    }

    public String readAssets(String fileName) throws IOException {
        Scanner scanner = new Scanner(getAssets().open(fileName));
        return scanner.useDelimiter("\\Z").next();
    }

    public void injectScript(String fileName) {
        try {
            webView.evaluateJavascript(readAssets(fileName), null);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void showResult(String text) {
        qrCode = text;
        if (TextUtils.isDigitsOnly(text) && text.length() == 144) {
            try {
                int year = Calendar.getInstance().get(Calendar.YEAR);
                byte[] decodedBytes = AESEncrypt.tkdecode(getApplicationContext(), text, year);
                qrCode = text + "-" + new String(decodedBytes, 0, decodedBytes.length, "gb18030");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        webView.evaluateJavascript("explainQRCode(moerail.getQRCodeResult());", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null) {
            return;
        }

        if (requestCode == REQUEST_CODE_SCAN) {
            showResult(data.getStringArrayExtra(CameraScanActivity.INTENT_EXTRA_KEY_SCAN_RESULT)[0]);
        }
    }
}
