package com.ssktravels.driver;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Tell the window that we want our content to fit the full screen edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Get the inset controller to manage system bars (status bar)
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            // Hide the status bar permanently
            controller.hide(WindowInsetsCompat.Type.statusBars());
            
            // Set the behavior so the status bar only shows briefly via a swipe and hides again automatically
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
}
