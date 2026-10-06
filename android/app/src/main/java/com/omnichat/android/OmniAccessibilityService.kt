package com.omnichat.android

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.content.Intent
import android.graphics.Path
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

class OmniAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile private var instance: OmniAccessibilityService? = null

        override fun onServiceConnected() {
            // handled by instance method below
        }

        fun executeCommand(context: Context, request: JSONObject): JSONObject {
            val service = instance
                ?: return JSONObject().apply {
                    put("ok", false)
                    put("error", "Omni AccessibilityService is not enabled. Enable it in Android Settings.")
                }

            return service.execute(request)
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    private fun execute(request: JSONObject): JSONObject {
        return try {
            when {
                request.has("get_screen") -> screen()
                request.has("click") -> click(request.opt("click"))
                request.has("tap") -> tap(request.getJSONObject("tap"))
                request.has("type") -> typeText(request.getString("type"))
                request.has("swipe") -> swipe(request.getString("swipe"))
                request.has("scroll") -> swipe(request.getString("scroll"))
                request.optBoolean("back", false) -> globalAction(GLOBAL_ACTION_BACK)
                request.optBoolean("home", false) -> globalAction(GLOBAL_ACTION_HOME)
                request.optBoolean("recents", false) -> globalAction(GLOBAL_ACTION_RECENTS)
                request.has("launch") -> launch(request.getString("launch"))
                else -> JSONObject().apply { put("ok", false); put("error", "Unknown Android action") }
            }
        } catch (e: Exception) {
            JSONObject().apply { put("ok", false); put("error", e.message ?: "Action failed") }
        }
    }

    private fun screen(): JSONObject {
        val root = rootInActiveWindow
            ?: return JSONObject().apply { put("ok", false); put("error", "No active window") }

        val elements = JSONArray()
        walk(root, elements, 0, 12)
        return JSONObject().apply {
            put("ok", true)
            put("package", root.packageName ?: "")
            put("elements", elements)
        }
    }

    private fun walk(node: AccessibilityNodeInfo, out: JSONArray, depth: Int, maxDepth: Int) {
        if (depth > maxDepth || out.length() >= 500) return
        val text = node.text?.toString().orEmpty()
        val desc = node.contentDescription?.toString().orEmpty()

        if (text.isNotBlank() || desc.isNotBlank() || node.isClickable || node.isFocusable || node.isEditable) {
            val item = JSONObject().apply {
                put("ref", out.length())
                put("text", text)
                put("contentDescription", desc)
                put("className", node.className?.toString() ?: "")
                put("clickable", node.isClickable)
                put("enabled", node.isEnabled)
                put("editable", node.isEditable)
                put("bounds", JSONObject().apply {
                    val r = android.graphics.Rect()
                    node.getBoundsInScreen(r)
                    put("left", r.left); put("top", r.top)
                    put("right", r.right); put("bottom", r.bottom)
                })
            }
            out.put(item)
        }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                walk(child, out, depth + 1, maxDepth)
                child.recycle()
            }
        }
    }

    private fun click(value: Any?): JSONObject {
        val root = rootInActiveWindow
            ?: return JSONObject().apply { put("ok", false); put("error", "No active window") }

        val node = findNode(root, value)
        if (node == null) return JSONObject().apply { put("ok", false); put("error", "UI element not found") }

        var target = node
        while (!target.isClickable && target.parent != null) {
            target = target.parent
        }

        val ok = target.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (target !== node) target.recycle()
        node.recycle()

        return JSONObject().apply { put("ok", ok); put("action", "click") }
    }

    private fun findNode(root: AccessibilityNodeInfo, value: Any?): AccessibilityNodeInfo? {
        if (value is Number) {
            val wanted = value.toInt()
            val all = ArrayList<AccessibilityNodeInfo>()
            collectClickable(root, all)
            val result = all.getOrNull(wanted)
            all.forEachIndexed { index, n -> if (index != wanted) n.recycle() }
            return result
        }

        val query = value?.toString()?.trim().orEmpty()
        if (query.isEmpty()) return null

        fun search(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
            val text = node.text?.toString().orEmpty()
            val desc = node.contentDescription?.toString().orEmpty()
            if (text.equals(query, true) || desc.equals(query, true)) return AccessibilityNodeInfo.obtain(node)
            for (i in 0 until node.childCount) {
                val child = node.getChild(i) ?: continue
                val found = search(child)
                child.recycle()
                if (found != null) return found
            }
            return null
        }
        return search(root)
    }

    private fun collectClickable(node: AccessibilityNodeInfo, out: MutableList<AccessibilityNodeInfo>) {
        if (node.isClickable || node.isFocusable || node.isEditable) out.add(AccessibilityNodeInfo.obtain(node))
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                collectClickable(child, out)
                child.recycle()
            }
        }
    }

    private fun typeText(text: String): JSONObject {
        val root = rootInActiveWindow
            ?: return JSONObject().apply { put("ok", false); put("error", "No active window") }
        val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: return JSONObject().apply { put("ok", false); put("error", "No focused input field") }

        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }
        val ok = focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        focused.recycle()
        return JSONObject().apply { put("ok", ok); put("action", "type") }
    }

    private fun tap(data: JSONObject): JSONObject {
        val x = data.getDouble("x").toFloat()
        val y = data.getDouble("y").toFloat()
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 80))
            .build()

        var completed = false
        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) { completed = true }
            override fun onCancelled(gestureDescription: GestureDescription?) {}
        }, null)

        return JSONObject().apply { put("ok", true); put("action", "tap"); put("x", x); put("y", y) }
    }

    private fun swipe(direction: String): JSONObject {
        val dm = resources.displayMetrics
        val cx = dm.widthPixels / 2f
        val cy = dm.heightPixels / 2f
        val amount = min(dm.widthPixels, dm.heightPixels) * 0.35f

        val (sx, sy, ex, ey) = when (direction.lowercase()) {
            "up" -> arrayOf(cx, cy + amount, cx, cy - amount)
            "down" -> arrayOf(cx, cy - amount, cx, cy + amount)
            "left" -> arrayOf(cx + amount, cy, cx - amount, cy)
            else -> arrayOf(cx - amount, cy, cx + amount, cy)
        }

        val path = Path().apply { moveTo(sx, sy); lineTo(ex, ey) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 350))
            .build()
        dispatchGesture(gesture, null, null)
        return JSONObject().apply { put("ok", true); put("action", "swipe"); put("direction", direction) }
    }

    private fun globalAction(action: Int): JSONObject =
        JSONObject().apply { put("ok", performGlobalAction(action)) }

    private fun launch(packageName: String): JSONObject {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
            ?: return JSONObject().apply { put("ok", false); put("error", "App package not found: $packageName") }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
        return JSONObject().apply { put("ok", true); put("package", packageName) }
    }
}
