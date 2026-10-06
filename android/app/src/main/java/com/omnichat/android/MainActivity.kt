package com.omnichat.android

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(AndroidBridge(), "AndroidBridge")
        }

        setContentView(webView)

        val requestedUrl = intent?.data?.toString()
        webView.loadUrl(requestedUrl ?: BuildConfig.OMNI_WEB_URL)
    }

    private inner class AndroidBridge {
        @JavascriptInterface
        fun execute(commandJson: String): String {
            return try {
                val request = JSONObject(commandJson)
                OmniAccessibilityService.executeCommand(this@MainActivity, request).toString()
            } catch (e: Exception) {
                JSONObject().apply {
                    put("ok", false)
                    put("error", e.message ?: "Android bridge error")
                }.toString()
            }
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        @JavascriptInterface
        fun openApp(packageName: String): Boolean {
            val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return false
            startActivity(intent)
            return true
        }

        @JavascriptInterface
        fun openUrl(url: String): Boolean {
            return try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                true
            } catch (_: Exception) {
                false
            }
        }
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("AndroidBridge")
        webView.destroy()
        super.onDestroy()
    }
}
