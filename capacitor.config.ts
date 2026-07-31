import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ssktravels.driver",
  appName: "SSK Driver",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#0D47A1",
      sound: "beep.wav"
    }
  }
};

export default config;
