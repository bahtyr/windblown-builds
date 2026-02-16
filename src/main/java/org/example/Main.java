package org.example;

import io.github.bonigarcia.wdm.WebDriverManager;
import io.github.bonigarcia.wdm.config.Architecture;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;

import java.util.List;

public class Main {


    static void main() {
//
//        FirefoxOptions options = new FirefoxOptions()
//                .addPreference("browser.startup.page", 1)
//                .addPreference("browser.startup.homepage", "https://www.google.co.uk")
//                .setAcceptInsecureCerts(true);
////                .setHeadless(true);
//        WebDriver driver = new FirefoxDriver(options);
        WebDriver driver = new FirefoxDriver();
        driver.get(GiftsPage.URL);

        String section = "General Gifts";

        WebElement table = driver.findElement(GiftsPage.tableOfSection(section));
        WebElement row = table.findElement(By.tagName("tr"));
        List<WebElement> rows = row.findElements(By.tagName("td"));

        Gift a = new Gift();
        a.imageUrl = rows.get(0).findElement(By.tagName("img")).getAttribute("src");
        a.name = rows.get(1).getText();
        a.category = section.replace(" Gifts", "").trim();
        a.description = rows.get(2).getText();
        System.out.print(a);

        driver.quit();

    }

}
