package com.thanhhaikia.sirib1;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

/** Shows the bundled website in a WebView, served from the APK's assets/www folder. */
public class MainActivity extends Activity {
    // A real https origin is needed for ES modules, localStorage and the service worker.
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final int PICK_FILE = 1;
    private static final int SAVE_FILE = 2;
    private static final String PENDING_EXPORT = "pendingExport";
    private static final Map<String, String> MIME = Map.of(
            "html", "text/html", "js", "text/javascript", "css", "text/css",
            "json", "application/json", "png", "image/png", "svg", "image/svg+xml");

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsReady;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingExport;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        setContentView(web);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.addJavascriptInterface(new Bridge(), "SiriNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return asset(request.getUrl());
            }
        });
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return asset(request.getUrl());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                startActivityForResult(pick, PICK_FILE);
                return true;
            }
        });
        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) return;
            ttsReady = tts.setLanguage(Locale.UK) >= TextToSpeech.LANG_AVAILABLE
                    || tts.setLanguage(Locale.US) >= TextToSpeech.LANG_AVAILABLE;
        });
        if (saved == null) {
            web.loadUrl(HOME);
        } else {
            web.restoreState(saved);
            pendingExport = saved.getString(PENDING_EXPORT);
        }
    }

    /** Answers requests for the app's own origin from assets/www; anything else goes to the network. */
    private WebResourceResponse asset(Uri url) {
        if (!HOST.equals(url.getHost())) return null;
        String path = url.getPath() == null || url.getPath().equals("/") ? "/index.html" : url.getPath();
        String type = MIME.getOrDefault(path.substring(path.lastIndexOf('.') + 1), "application/octet-stream");
        try {
            return new WebResourceResponse(type, "utf-8", getAssets().open("www" + path));
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
        }
    }

    /** Functions the website calls where a WebView lacks the browser feature. */
    private class Bridge {
        @JavascriptInterface
        public boolean canSpeak() {
            return ttsReady;
        }

        @JavascriptInterface
        public void speak(String text, double rate) {
            if (!ttsReady) return;
            tts.setSpeechRate((float) rate);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "say");
        }

        @JavascriptInterface
        public void exportProgress(String json) {
            runOnUiThread(() -> {
                pendingExport = json;
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("application/json").putExtra(Intent.EXTRA_TITLE, "siri-b1-tien-do.json");
                startActivityForResult(save, SAVE_FILE);
            });
        }
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
        if (request == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(uri == null ? null : new Uri[] {uri});
            fileCallback = null;
        } else if (request == SAVE_FILE && uri != null && pendingExport != null) {
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                out.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, "Đã xuất tiến độ.", Toast.LENGTH_SHORT).show();
            } catch (IOException | RuntimeException e) {
                Toast.makeText(this, "Không lưu được file.", Toast.LENGTH_LONG).show();
            }
        }
        if (request == SAVE_FILE) pendingExport = null;
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
        // Android may recreate the activity while the save dialog is open.
        out.putString(PENDING_EXPORT, pendingExport);
    }

    @Override
    protected void onDestroy() {
        tts.shutdown();
        super.onDestroy();
    }
}
