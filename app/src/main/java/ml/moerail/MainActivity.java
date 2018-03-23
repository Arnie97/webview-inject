package ml.moerail;

import android.app.Activity;
import android.os.Bundle;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

import java.io.InputStream;
import java.io.IOException;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = (WebView) findViewById(R.id.webView);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                injectScript("monkey.js");
                injectScript("models.js");
                injectScript("emu.user.js");
                injectScript("main.js");
                super.onPageFinished(view, url);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);

        webView.loadUrl("https://mobile.12306.cn/weixin");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (webView.canGoBack() && keyCode == KeyEvent.KEYCODE_BACK) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    public byte[] readAssets(String fileName) throws IOException {
        InputStream inputStream = getAssets().open(fileName);
        byte[] buffer = new byte[inputStream.available()];
        inputStream.read(buffer);
        inputStream.close();
        return buffer;
    }

    public void injectScript(String fileName) {
        try {
            String loader = new String(readAssets("loader.js"));
            String encoded = Base64.encodeToString(readAssets(fileName), Base64.NO_WRAP);
            webView.loadUrl(String.format("javascript: (%s)('%s');", loader, encoded));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
