package ml.moerail;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.*;

import com.king.mlkit.vision.camera.CameraScan;

import java.io.*;
import java.net.URL;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Scanner;

public class MainActivity extends Activity {
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

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame()) {
                    return null;
                }

                Uri url = request.getUrl();
                final String fileName = "station_name.js";
                if (!url.getPath().endsWith(fileName)) {
                    return null;
                }

                // Download the replaced resource to local cache
                final File cacheFile = new File(getCacheDir(), fileName);
                if (!cacheFile.canRead()) {
                    final String rewritten = url.toString().replaceFirst("//mobile\\.12306\\.cn/weixin/", "//kyfw.12306.cn/otn/");
                    try {
                        InputStream iStream = new URL(rewritten).openStream();
                        ReadableByteChannel chan = Channels.newChannel(iStream);
                        FileOutputStream oStream = new FileOutputStream(cacheFile);
                        oStream.getChannel().transferFrom(chan, 0, Long.MAX_VALUE);
                        oStream.close();
                        chan.close();
                    } catch (Exception ignored) {
                        cacheFile.delete();
                        return null;
                    }
                }

                // Generate response from local cache
                final String
                        encoding = StandardCharsets.UTF_8.name(),
                        mimeType = MimeTypeMap.getFileExtensionFromUrl(fileName);
                try {
                    FileInputStream iStream = new FileInputStream(cacheFile);
                    return new WebResourceResponse(mimeType, encoding, iStream);
                } catch (IOException ignored) {
                    return null;
                }
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
        Intent intent = new Intent(this, ScanActivity.class);
        startActivityForResult(intent, RequestCode.CAMERA_SCAN.ordinal());
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

    public Iterator<String> readScript(String fileName) throws IOException {
        Scanner scanner = new Scanner(getAssets().open(fileName));
        return scanner.useDelimiter("\n(?=function )");
    }

    public void injectScript(String fileName) {
        try {
            Iterator<String> iter = readScript(fileName);
            while (iter.hasNext()) {
                webView.evaluateJavascript(iter.next(), null);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null) {
            return;
        }

        if (requestCode == RequestCode.CAMERA_SCAN.ordinal()) {
            qrCode = data.getStringExtra(CameraScan.SCAN_RESULT);
            webView.evaluateJavascript("explainQRCode(moerail.getQRCodeResult());", null);
        }
    }
}
