package ml.moerail;

import android.app.Activity;
import android.os.Bundle;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

import java.io.IOException;
import java.net.URLEncoder;
import java.util.Scanner;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                injectScript("emu.user.js", true);
                injectScript("main.js", true);
                if (BuildConfig.DEBUG) {
                    injectScript("https://s.url.cn/qqun/qun/qqweb/m/qun/confession/js/vconsole.min.js");
                }
                super.onPageFinished(view, url);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        WebSettings settings = webView.getSettings();
        String userAgent = " Moerail/" + BuildConfig.VERSION_NAME;
        settings.setUserAgentString(settings.getUserAgentString() + userAgent);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

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

    public String readAssets(String fileName) throws IOException {
        Scanner scanner = new Scanner(getAssets().open(fileName));
        return scanner.useDelimiter("\\Z").next();
    }

    public void injectScript(String source) {
        injectScript(source, false);
    }

    public void injectScript(String source, boolean inline) {
        try {
            final String url = "javascript: (%s)('%s', '%s');";
            String loader = readAssets("loader.js");
            if (inline) {
                String encoded = URLEncoder.encode(readAssets(source));
                encoded = encoded.replace("+", "%20");
                encoded = Base64.encodeToString(encoded.getBytes(), Base64.NO_WRAP);
                webView.loadUrl(String.format(url, loader, "", encoded));
            } else {
                webView.loadUrl(String.format(url, loader, source, ""));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
