package org.example;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class Driver {

    private static WebDriver webDriver;

    private Driver() {
    }

    public static WebDriver get() {
        if (webDriver != null)
            return webDriver;

        WebDriverManager.chromedriver().setup();
        webDriver = new ChromeDriver();
        return webDriver;
    }

    public static void quit() {
        if (webDriver != null) {
            webDriver.quit();
            webDriver = null;
        }
    }
}